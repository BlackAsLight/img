import { calcCRC } from "@img/internal/apng-png/crc";
import type { PNGOptions } from "@img/internal/apng-png/types";
import {
  filter,
  guaranteeInvisiblePixel,
  passExtraction,
  scanlines,
  toGrayscale,
  toGrayscaleAlpha,
  toIndex,
  toTruecolor,
} from "@img/internal/apng-png/encode";
import { AbortStream } from "@std/streams/unstable-abort-stream";

/**
 * encodePNG is a function that encodes raw image data into the PNG image
 * format. The raw image data is expected to be in a sequence of
 * `[ r, g, b, a ]` numbers.
 *
 * @example
 * ```ts
 * import { encodePNG } from "@img/png";
 *
 * await Deno.mkdir(".output/", { recursive: true });
 *
 * const rawData = await new Response(ReadableStream.from(async function* () {
 *   for (let r = 0; r < 256; ++r) {
 *     for (let c = 0; c < 256; ++c) {
 *       yield Uint8Array.from([255 - r, c, r, 255]);
 *     }
 *   }
 * }())).bytes() as Uint8Array<ArrayBuffer>;
 *
 * await Deno.writeFile(".output/encode.png", await encodePNG(rawData, {
 *   width: 256,
 *   height: 256,
 *   compression: 0,
 *   filter: 0,
 *   interlace: 0,
 * }));
 * ```
 *
 * @param input The raw image data.
 * @param options The options for the raw image data.
 * @param signal The abort signal for the operation.
 * @returns An PNG image.
 *
 * @module
 */
export async function encodePNG(
  input: Uint8Array<ArrayBuffer> | Uint8ClampedArray<ArrayBuffer>,
  options: PNGOptions,
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!Number.isInteger(options.width) || options.width < 1) {
    throw new RangeError(
      `Width (${options.width}) must be an integer value greater than zero`,
    );
  }
  if (!Number.isInteger(options.height) || options.height < 1) {
    throw new RangeError(
      `Height (${options.height}) must be an integer value greater than zero`,
    );
  }
  if (input.length / 4 !== options.width * options.height) {
    throw new RangeError(
      `Number of pixels (${
        options.width * options.height
      }) does not match input length`,
    );
  }
  if (options.compression !== 0) {
    throw new TypeError(
      `Unsupported Compression Method: ${options.compression}`,
    );
  }
  if (options.filter !== 0) {
    throw new TypeError(`Unsupported Filter Method: ${options.filter}`);
  }
  if (options.interlace !== 0 && options.interlace !== 1) {
    throw new TypeError(`Unsupported Interlace Method: ${options.interlace}`);
  }

  let palette: Uint32Array<ArrayBuffer> | number | undefined;
  const [colorType, pixelSize] = function (): [number, number] {
    let isOpaque = true;
    let isHazy = false;
    let isGray = true;
    const colors = new Map<number, number>();
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    for (let i = 0; i < input.length; i += 4) {
      if (isGray && (input[i] !== input[i + 1] || input[i] !== input[i + 2])) {
        isGray = false;
      }
      if (isOpaque && input[i + 3] !== 255) isOpaque = false;
      if (!isHazy && (input[i + 3] !== 255 && input[i + 3] !== 0)) {
        isHazy = true;
      }
      const x = view.getUint32(i);
      colors.set(x, (colors.get(x) ?? 0) + 1);
      if (!isGray && !isOpaque && isHazy && colors.size > 256) break;
    }
    // Grayscale
    if (isGray) {
      if (isOpaque) {
        input = toGrayscale(input);
        return [0, 1];
      }
      if (isHazy) {
        input = toGrayscaleAlpha(input);
        return [4, 2];
      }
      palette = guaranteeInvisiblePixel(input, colors, true);
      if (palette == undefined) {
        input = toGrayscaleAlpha(input);
        return [4, 2];
      }
      input = toGrayscale(input);
      return [0, 1];
    }
    // Index
    if (colors.size < 256) {
      palette = Uint32Array.from(
        colors
          .entries()
          .toArray()
          .sort((x, y) => y[1] - x[1])
          .map((x) => x[0]),
      );
      input = toIndex(input, palette);
      return [3, 1];
    }
    // Truecolor
    if (isOpaque) {
      input = toTruecolor(input);
      return [2, 3];
    }
    if (isHazy) return [6, 4];
    palette = guaranteeInvisiblePixel(input, colors, false);
    if (palette == undefined) return [6, 4];
    input = toTruecolor(input);
    return [2, 3];
  }();

  const originalSize = input.length;
  const maxSize = 8 + // Signature
    25 + // IHDR
    calcPLTESize(colorType) +
    calctRNSSize(colorType) +
    calcIDATSize(originalSize, options) +
    12; // IEND
  if (input.byteOffset) {
    const buffer = new Uint8Array(input.buffer);
    buffer.set(input);
    input = buffer.subarray(0, input.length);
  }
  // deno-lint-ignore no-explicit-any
  const output = new Uint8Array((input.buffer as any).transfer(maxSize));
  output.set(output.subarray(0, originalSize), maxSize - originalSize);
  const view = new DataView(output.buffer);

  output.set([137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;

  // Add IHDR chunk
  offset = addChunk(output, view, offset, [73, 72, 68, 82], (o) => {
    view.setUint32(o, options.width);
    view.setUint32(o + 4, options.height);
    output.set([
      8,
      colorType,
      options.compression,
      options.filter,
      options.interlace,
    ], o + 8);
    return o + 13;
  });

  switch (colorType) {
    case 0:
    case 2:
      if (typeof palette === "number") {
        // Add tRNS chunk (Optional)
        offset = addChunk(output, view, offset, [116, 82, 78, 83], (o) => {
          output[o++] = 0;
          output[o++] = palette as number >> 24 & 0xFF;
          if (colorType === 2) {
            output[o++] = 0;
            output[o++] = palette as number >> 16 & 0xFF;
            output[o++] = 0;
            output[o++] = palette as number >> 8 & 0xFF;
          }
          return o;
        });
      }
      break;
    case 3:
      // Add PLTE chnk (Optional)
      offset = addChunk(output, view, offset, [80, 76, 84, 69], (o) => {
        for (const pixel of palette as Uint32Array<ArrayBuffer>) {
          output[o++] = pixel >> 24 & 0xFF;
          output[o++] = pixel >> 16 & 0xFF;
          output[o++] = pixel >> 8 & 0xFF;
        }
        return o;
      });
      if (
        (palette as Uint32Array<ArrayBuffer>).find((x) => (x & 0xFF) !== 255) !=
          undefined
      ) {
        // Add tRNS chunk (Optional)
        offset = addChunk(output, view, offset, [116, 82, 78, 83], (o) => {
          for (const pixel of palette as Uint32Array<ArrayBuffer>) {
            output[o++] = pixel & 0xFF;
          }
          return o;
        });
      }
      break;
  }

  // Add IDAT chunks
  input = output.subarray(maxSize - originalSize);
  let readable = ReadableStream.from([
    output.subarray(
      filter(
        output,
        colorType,
        pixelSize,
        scanlines(
          input,
          pixelSize,
          passExtraction(input, pixelSize, options),
        ),
      ),
    ),
  ])
    .pipeThrough(new CompressionStream("deflate"));
  if (signal) {
    readable = readable.pipeThrough(new AbortStream(signal));
  }
  input = await new Response(readable).bytes() as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < input.length; i += 2 ** 32 - 1) {
    offset = addChunk(output, view, offset, [73, 68, 65, 84], (o) => {
      const length = Math.min(input.length - i, 2 ** 31 - 1);
      output.set(input.subarray(0, length), o);
      return o + length;
    });
  }

  // Add IEND chunk
  offset = addChunk(output, view, offset, [73, 69, 78, 68], (o) => o);

  return output.subarray(0, offset);
}

function addChunk(
  output: Uint8Array<ArrayBuffer>,
  view: DataView,
  offset: number,
  chunkType: ArrayLike<number>,
  dataFn: (o: number) => number,
): number {
  const lenOffset = offset;
  output.set(chunkType, offset + 4); // Chunk Type
  offset = dataFn(offset + 8); // Chunk Data
  view.setUint32(lenOffset, offset - lenOffset - 8); // Length
  view.setUint32(offset, calcCRC(output.subarray(lenOffset + 4, offset))); // CRC
  return offset + 4;
}

function calcIDATSize(size: number, options: PNGOptions): number {
  size += options.interlace === 1
    // (height - admin7Pass.sY + admin7Pass.nY - 1) / admin7Pass.nY
    ? (options.height + 7) / 8 +
      (options.height + 7) / 8 +
      (options.height + 3) / 8 +
      (options.height + 3) / 4 +
      (options.height + 1) / 4 +
      (options.height + 1) / 2 +
      options.height / 2
    : options.height; // Plus Filter Bytes
  size += ((size + 32767) / 32768 | 0) * 5 + 12; // Worst Compression Size
  size += ((size + 2 ** 31 - 2) / (2 ** 31 - 1) | 0) * 12; // Plus IDAT Overhead
  return size;
}

function calcPLTESize(colorType: number): number {
  switch (colorType) {
    case 3:
      return 780;
    default:
      return 0;
  }
}

function calctRNSSize(colorType: number): number {
  switch (colorType) {
    case 0:
      return 14;
    case 2:
      return 18;
    case 3:
      return 780;
    default:
      return 0;
  }
}
