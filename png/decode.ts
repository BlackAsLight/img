import { calcCRC } from "@img/internal/apng-png/crc";
import type { PNGOptions } from "@img/internal/apng-png/types";
import {
  filter,
  fromGrayscale,
  fromGrayscaleAlpha,
  fromIndex,
  fromTruecolor,
  images,
  makePixelTransparent,
  passExtraction,
  scanlines,
} from "@img/internal/apng-png/decode";
import { AbortStream } from "@std/streams/unstable-abort-stream";

/**
 * decodePNG is a function that decodes a PNG image into raw image data. The raw
 * image data is a sequence of `[ r, g, b, a ]` numbers.
 *
 * @example
 * ```ts
 * import { decodePNG, encodePNG } from "@img/png";
 *
 * const encodedData = await encodePNG(
 *   await new Response(ReadableStream.from(async function* () {
 *     for (let r = 0; r < 256; ++r) {
 *       for (let c = 0; c < 256; ++c) {
 *         yield new Uint8Array([255 - r, c, r, 255]);
 *       }
 *     }
 *   }())).bytes(),
 *   { width: 256, height: 256, compression: 0, filter: 0, interlace: 0 },
 * );
 *
 * console.log((await decodePNG(encodedData)).header);
 * ```
 *
 * @param input The PNG image.
 * @param signal The abort signal for the operation.
 * @returns The metadata and raw image data.
 *
 * @module
 */
export async function decodePNG(
  input: Uint8Array | Uint8ClampedArray,
  signal?: AbortSignal,
): Promise<{ header: PNGOptions; body: Uint8Array }> {
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => x === input[i])) {
    throw new TypeError("PNG had invalid signature");
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const chunkIHDR = getChunk(input, view, 8);
  if (![73, 72, 68, 82].every((x, i) => x === chunkIHDR.type[i])) {
    throw new TypeError(
      "An IHDR chunk was expected. Found: " +
        new TextDecoder().decode(chunkIHDR.type),
    );
  }
  const [bitDepth, colorType, options] = function (): [
    number,
    number,
    PNGOptions,
  ] {
    const view = new DataView(
      chunkIHDR.data.buffer,
      chunkIHDR.data.byteOffset,
      chunkIHDR.data.byteLength,
    );
    const width = view.getUint32(0);
    if (width === 0 || width > 2 ** 31 - 1) {
      throw new RangeError("PNG has an invalid Width: " + width);
    }
    const height = view.getUint32(4);
    if (height === 0 || height > 2 ** 31 - 1) {
      throw new RangeError("PNG has an invalid Height: " + height);
    }
    const bitDepth = chunkIHDR.data[8];
    const colorType = chunkIHDR.data[9];
    switch (colorType) {
      case 6:
      case 4:
      case 2:
        if (![8, 16].includes(bitDepth)) {
          throw new TypeError(
            "PNG has invalid bitDepth and colorType combination",
          );
        }
        break;
      case 3:
        if (![1, 2, 4, 8].includes(bitDepth)) {
          throw new TypeError(
            "PNG has invalid bitDepth and colorType combination",
          );
        }
        break;
      case 0:
        if (![1, 2, 4, 8, 16].includes(bitDepth)) {
          throw new TypeError(
            "PNG has invalid bitDepth and colorType combination",
          );
        }
        break;
      default:
        throw new TypeError(
          "PNG has invalid bitDepth and colorType combination",
        );
    }
    const compression = chunkIHDR.data[10];
    if (compression !== 0) {
      throw new TypeError(
        "PNG has an invalid compression method: " + compression,
      );
    }
    const filter = chunkIHDR.data[11];
    if (filter !== 0) {
      throw new TypeError("PNG has an invalid filter method: " + filter);
    }
    const interlace = chunkIHDR.data[12];
    if (interlace !== 0 && interlace !== 1) {
      throw new TypeError("PNG has an invalid interlace method: " + interlace);
    }
    return [bitDepth, colorType, {
      width,
      height,
      compression,
      filter,
      interlace,
    }];
  }();
  if (bitDepth !== 8) {
    throw new Error("Bit Depths other than 8 aren't implemented yet");
  }
  const pixelSize = function (): number {
    switch (colorType) {
      case 6:
        return 4;
      case 4:
        return 2;
      case 2:
        return 3;
      case 3:
      default: // 0
        return 1;
    }
  }();

  const chunksIDAT: (Uint8Array | Uint8ClampedArray)[] = [];
  let chunkPLTE: Uint8Array | Uint8ClampedArray | undefined;
  let chunktRNS: Uint8Array | Uint8ClampedArray | undefined;
  let lastChunkWasIDAT = false;
  let lastType: Uint8Array | Uint8ClampedArray | undefined;
  for (let i = chunkIHDR.o; i < input.length;) {
    const { o, type, data } = getChunk(input, view, i);
    i = o;
    if ([73, 68, 65, 84].every((x, i) => x === type[i])) {
      if (!lastChunkWasIDAT && chunksIDAT.length) {
        throw new TypeError(
          `A non-IDAT chunk (${
            new TextDecoder().decode(lastType)
          }) was found between IDAT chunks`,
        );
      }
      chunksIDAT.push(data);
      lastChunkWasIDAT = true;
    } else {
      lastChunkWasIDAT = false;
      if ([80, 76, 84, 69].every((x, i) => x === type[i])) {
        if (chunkPLTE == undefined) chunkPLTE = data.slice();
        else throw new TypeError("A PLTE chunk was already received");
      } else if ([116, 82, 78, 83].every((x, i) => x === type[i])) {
        if (chunktRNS == undefined) chunktRNS = data.slice();
        else throw new TypeError("A tRNS chunk was already received");
      } else if ([73, 69, 78, 68].every((x, i) => x === type[i])) break;
    }
    lastType = type;
  }
  switch (colorType) {
    case 3:
      if (chunkPLTE == undefined) {
        throw new TypeError("A PLTE chunk was expected");
      }
      if (chunkPLTE.length % 3 !== 0 || chunkPLTE.length > 256 * 3) {
        throw new RangeError("The PLTE chunk has an invalid length");
      }
      if (chunktRNS != undefined && chunkPLTE.length / 3 !== chunktRNS.length) {
        throw new RangeError("The tRNS chunk has an invalid length");
      }
      break;
    case 0:
      if (chunktRNS != undefined && chunktRNS.length !== 2) {
        throw new RangeError("The tRNS chunk has an invalid length");
      }
      break;
    case 2:
      if (chunktRNS != undefined && chunktRNS.length !== 6) {
        throw new RangeError("The tRNS chunk has an invalid length");
      }
      break;
  }

  let readable = ReadableStream
    .from(chunksIDAT)
    .pipeThrough(new DecompressionStream("deflate"));
  if (signal) {
    readable = readable.pipeThrough(new AbortStream(signal));
  }
  const mid = await new Response(readable).bytes();
  const sizes = images(options);
  // deno-lint-ignore no-explicit-any
  const output = new Uint8Array((input.buffer as any)
    .transfer(options.width * options.height * 4));
  const i = passExtraction(
    output,
    filter(mid, scanlines(mid, pixelSize, sizes), pixelSize),
    options,
    pixelSize,
    sizes,
  );
  // fromWhatever to truecolor alpha
  switch (colorType) {
    case 0:
      fromGrayscale(output, i);
      if (chunktRNS) {
        const y = (chunktRNS[0] << 16) + chunktRNS[1];
        makePixelTransparent(output, y, y, y);
      }
      break;
    case 2:
      fromTruecolor(output, i);
      if (chunktRNS) {
        const r = (chunktRNS[0] << 16) + chunktRNS[1];
        const g = (chunktRNS[2] << 16) + chunktRNS[3];
        const b = (chunktRNS[4] << 16) + chunktRNS[5];
        makePixelTransparent(output, r, g, b);
      }
      break;
    case 3:
      fromIndex(
        output,
        i,
        function (): Uint32Array {
          const palette = new Uint32Array(chunkPLTE!.length / 3);
          chunktRNS = chunktRNS ??
            new Uint8Array(chunkPLTE!.length / 3).fill(255);
          for (let i = 0; i < chunkPLTE!.length; i += 3) {
            palette[i / 3] = (chunkPLTE![i] << 24) + (chunkPLTE![i + 1] << 16) +
              (chunkPLTE![i + 2] << 8) + chunktRNS[i / 3];
          }
          return palette;
        }(),
      );
      break;
    case 4:
      fromGrayscaleAlpha(output, i);
      break;
  }

  return {
    header: options,
    body: output,
  };
}

function getChunk(
  input: Uint8Array | Uint8ClampedArray,
  view: DataView,
  offset: number,
): {
  o: number;
  type: Uint8Array | Uint8ClampedArray;
  data: Uint8Array | Uint8ClampedArray;
} {
  const length = view.getUint32(offset);
  if (
    calcCRC(input.subarray(offset + 4, offset + 8 + length)) !==
      view.getUint32(offset + 8 + length)
  ) {
    throw new TypeError(
      "The CRC32 chunk didn't match for chunk: " +
        new TextDecoder().decode(input.subarray(offset + 4, offset + 8)),
    );
  }
  return {
    o: offset + length + 12,
    type: input.subarray(offset + 4, offset + 8),
    data: input.subarray(offset + 8, offset + 8 + length),
  };
}
