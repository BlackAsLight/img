import { calcCRC } from "./_crc.ts";
import type { PNGOptions } from "./types.ts";

function toGrayscale(
  input: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
  for (let i = 4; i < input.length; i += 4) input[i / 4] = input[i];
  return input.subarray(0, input.length / 4);
}

function toGreyscaleAlpha(
  input: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
  input[1] = input[3];
  for (let i = 4; i < input.length; i += 4) {
    input[i / 2] = input[i];
    input[i / 2 + 1] = input[i + 3];
  }
  return input.subarray(0, input.length / 2);
}

function toTruecolour(
  input: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
  for (let i = 4; i < input.length; i += 4) {
    input[i / 4 * 3] = input[i];
    input[i / 4 * 3 + 1] = input[i + 1];
    input[i / 4 * 3 + 2] = input[i + 2];
  }
  return input.subarray(0, input.length / 4 * 3);
}

function toIndex(
  input: Uint8Array | Uint8ClampedArray,
  palette: Uint32Array,
): Uint8Array | Uint8ClampedArray {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  for (let i = 0; i < input.length; i += 4) {
    input[i / 4] = palette.indexOf(view.getUint32(i));
  }
  return input.subarray(0, input.length / 4);
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
  size += Math.ceil((size + 32767) / 32768 * 5) + 12; // Worst Compression Size
  size += Math.ceil(size / (2 ** 31 - 1)) * 12; // Plus IDAT Overhead
  return size;
}

export async function encodePNG(
  input: Uint8Array | Uint8ClampedArray,
  options: PNGOptions,
): Promise<Uint8Array> {
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
  if (input.length % 4 !== 0) {
    throw new RangeError("Unexpected number of bytes from input");
  }
  if (input.length / 4 !== options.width * options.height) {
    throw new RangeError(
      `Number of pixels (${
        options.width * options.height
      }) does not match input length`,
    );
  }

  let palette: Uint32Array | number | undefined;
  const [colorType, pixelSize] = function (): [number, number] {
    let isOpaque = true;
    let isHazy = false;
    let isGray = true;
    const colours = new Map<number, number>();
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    for (let i = 0; i < input.length; i += 4) {
      if (isGray && (input[i] !== input[i + 1] || input[i] !== input[i + 2])) {
        isGray = false;
      }
      if (isOpaque && input[i + 3] !== 255) isOpaque = false;
      if (!isHazy && (input[i + 3] !== 255 || input[i + 3] !== 0)) {
        isHazy = true;
      }
      const x = view.getUint32(i);
      colours.set(x, (colours.get(x) ?? 0) + 1);
      if (!isGray && !isOpaque && isHazy && colours.size > 256) break;
    }
    if (isGray) {
      if (isOpaque) {
        input = toGrayscale(input);
        return [0, 1];
      }
      if (isHazy) {
        input = toGreyscaleAlpha(input);
        return [4, 2];
      }
      palette = colours.entries().find((x) => (x[0] & 0xFF) === 0)![0];
      input = toGrayscale(input);
      return [0, 1];
    }
    if (colours.size < 256) {
      palette = Uint32Array.from(
        colours
          .entries()
          .toArray()
          .sort((x, y) => y[1] - x[1])
          .map((x) => x[0]),
      );
      input = toIndex(input, palette);
      return [3, 1];
    }
    if (isOpaque) {
      input = toTruecolour(input);
      return [2, 3];
    }
    if (isHazy) return [6, 4];
    palette = colours.entries().find((x) => (x[0] & 0xFF) === 0)![0];
    input = toTruecolour(input);
    return [2, 3];
  }();

  const originalSize = input.length;
  const maxSize = 8 + 25 + (colorType === 3 ? 780 : 0) +
    calcIDATSize(originalSize, options) + 12;
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
        for (const pixel of palette as Uint32Array) {
          output[o++] = pixel >> 24 & 0xFF;
          output[o++] = pixel >> 16 & 0xFF;
          output[o++] = pixel >> 8 & 0xFF;
        }
        return o;
      });
      if (
        (palette as Uint32Array).find((x) => (x & 0xFF) !== 255) != undefined
      ) {
        // Add tRNS chunk (Optional)
        offset = addChunk(output, view, offset, [116, 82, 78, 83], (o) => {
          for (const pixel of palette as Uint32Array) {
            output[o++] = pixel & 0xFF;
          }
          return o;
        });
      }
      break;
  }

  // Add IDAT chunks
  input = output.subarray(maxSize - originalSize);
  const a = passExtraction(input, pixelSize, options);
  const b = scanlines(input, pixelSize, a);
  const c = filter(output, colorType, b, pixelSize);
  input = output.subarray(c);
  input = await new Response(
    ReadableStream.from([input])
      .pipeThrough(new CompressionStream("deflate")),
  ).bytes();
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
  output: Uint8Array,
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

const adam7Pass = [
  { sX: 0, nX: 8, sY: 0, nY: 8 },
  { sX: 4, nX: 8, sY: 0, nY: 8 },
  { sX: 0, nX: 4, sY: 4, nY: 8 },
  { sX: 2, nX: 4, sY: 0, nY: 4 },
  { sX: 0, nX: 2, sY: 2, nY: 4 },
  { sX: 1, nX: 2, sY: 0, nY: 2 },
  { sX: 0, nX: 1, sY: 1, nY: 2 },
];

function moveTo(i: number, offsets: number[], options: PNGOptions): number {
  const x = i % options.width;
  const y = (i / options.width) | 0;
  for (let j = 0; j < adam7Pass.length; ++j) {
    const pass = adam7Pass[j];
    if ((x - pass.sX) % pass.nX === 0 && (y - pass.sY) % pass.nY === 0) {
      return offsets[j] +
        (((y - pass.sY) / pass.nY) | 0) *
          (((options.width - pass.sX + pass.nX - 1) / pass.nX) | 0) +
        (((x - pass.sX) / pass.nX) | 0);
    }
  }
  throw new Error("Impossible State Reached");
}

function passExtraction(
  input: Uint8Array,
  pSize: number,
  options: PNGOptions,
): [number, number][] {
  switch (options.interlace) {
    case 1: {
      const sizes: [number, number][] = new Array(adam7Pass.length)
        .fill(0)
        .map((_, i) => [
          ((options.width - adam7Pass[i].sX + adam7Pass[i].nX - 1) /
            adam7Pass[i].nX) | 0,
          ((options.height - adam7Pass[i].sY + adam7Pass[i].nY - 1) /
            adam7Pass[i].nY) | 0,
        ]);
      const offsets: number[] = new Array(sizes.length)
        .fill(0)
        .map((_, i) => sizes.slice(0, i).reduce((x, y) => x + y[0] * y[1], 0));
      const hasMoved: boolean[] = new Array(options.width * options.height)
        .fill(false);
      const tempPixel = new Uint8Array(pSize);
      for (let i = 0; i < hasMoved.length; ++i) {
        let j = i;
        while (!hasMoved[i]) {
          const k = moveTo(j, offsets, options);
          if (j === k) hasMoved[i] = true;
          else {
            tempPixel.set(input.subarray(k * pSize, k * pSize + pSize));
            input.set(input.subarray(i * pSize, i * pSize + pSize), k * pSize);
            input.set(tempPixel, i * pSize);
            hasMoved[k] = true;
            j = k;
          }
        }
      }
      return sizes;
    }
    default: // 0
      return [[options.width, options.height]];
  }
}

function scanlines(
  input: Uint8Array,
  pSize: number,
  images: [number, number][],
): Uint8Array[][] {
  const output: Uint8Array[][] = new Array(images.length)
    .fill(0)
    .map(() => []);
  let i = 0;
  let offset = 0;
  for (const [width, height] of images) {
    for (let h = 0; h < height; ++h) {
      output[i][h] = input.subarray(
        offset + h * width * pSize,
        offset + (h * width + width) * pSize,
      );
    }
    offset += width * height * pSize;
    ++i;
  }
  return output;
}

const filterTypes = [
  function type0(
    lines: Uint8Array[],
    x: number,
    y: number,
    _pSize: number,
  ): number {
    return lines[y][x];
  },
  function type1(
    lines: Uint8Array[],
    x: number,
    y: number,
    pSize: number,
  ): number {
    return lines[y][x] - (lines[y][x - pSize] ?? 0);
  },
  function type2(
    lines: Uint8Array[],
    x: number,
    y: number,
    _pSize: number,
  ): number {
    return lines[y][x] - (y === 0 ? 0 : lines[y - 1][x]);
  },
  function type3(
    lines: Uint8Array[],
    x: number,
    y: number,
    pSize: number,
  ): number {
    return lines[y][x] -
      ((((lines[y][x - pSize] ?? 0) + (y === 0 ? 0 : lines[y - 1][x])) / 2) |
        0);
  },
  function type4(
    lines: Uint8Array[],
    x: number,
    y: number,
    pSize: number,
  ): number {
    const a = lines[y][x - pSize] ?? 0;
    const b = y === 0 ? 0 : lines[y - 1][x];
    const c = y === 0 ? 0 : lines[y - 1][x - pSize] ?? 0;
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return lines[y][x] - a;
    if (pb <= pc) return lines[y][x] - b;
    return lines[y][x] - c;
  },
];

function filter(
  output: Uint8Array,
  colorType: number,
  images: Uint8Array[][],
  pSize: number,
): number {
  images = images.filter((x) => x.filter((x) => x.length).length);
  const o = output.length -
    images.reduce((x, y) => x + y.reduce((x, y) => x + y.length, y.length), 0);

  // Shift lines forward in the output buffer to make space for the filter type.
  let offset = o + 1;
  for (let i = 0; i < images.length; ++i) {
    for (let j = 0; j < images[i].length; ++j) {
      output.set(images[i][j], offset);
      images[i][j] = output.subarray(offset, offset + images[i][j].length);
      offset += images[i][j].length + 1;
    }
  }

  let index = 0;
  switch (colorType) {
    case 0:
    case 2:
    case 4:
    case 6:
      index = 4;
      break;
    default: // 3
  }
  const typeFn = filterTypes[index];

  offset = output.length;
  for (let i = images.length - 1; i >= 0; --i) {
    const lines = images[i];
    for (let y = lines.length - 1; y >= 0; --y) {
      offset -= lines[y].length + 1;
      output[offset] = index;
      for (let x = lines[y].length - 1; x >= 0; --x) {
        lines[y][x] = typeFn(lines, x, y, pSize);
      }
    }
  }

  return o;
}
