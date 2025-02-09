import { calcCRC } from "../_crc.ts";
import { scanlines } from "./_scanlines.ts";
import type { PNGOptions } from "../types.ts";
import { filter } from "./_filter.ts";
import { passExtraction } from "./_passExtraction.ts";
import { images } from "../_common_pass.ts";
import {
  fromGrayscale,
  fromGrayscaleAlpha,
  fromIndex,
  fromTruecolor,
} from "./_from.ts";
import { makePixelTransparent } from "./_from.ts";

export async function decodePNG(
  input: Uint8Array | Uint8ClampedArray,
): Promise<{ header: PNGOptions; body: Uint8Array }> {
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => x === input[i])) {
    throw new TypeError("Invalid PNG Signature");
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const chunkIHDR = getChunk(input, view, 8);
  if (![73, 72, 68, 82].every((x, i) => x === chunkIHDR.type[i])) {
    throw new TypeError("Expected IHDR chunk");
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
    if (width > 2 ** 31 - 1) throw new RangeError("Invalid width");
    const height = view.getUint32(4);
    if (height > 2 ** 31 - 1) throw new RangeError("Invalid height");
    const bitDepth = chunkIHDR.data[8];
    const colorType = chunkIHDR.data[9];
    switch (colorType) {
      case 6:
      case 4:
      case 2:
        if (![8, 16].includes(bitDepth)) {
          throw new TypeError("Invalid bitDepth and colorType combination");
        }
        break;
      case 3:
        if (![1, 2, 4, 8].includes(bitDepth)) {
          throw new TypeError("Invalid bitDepth and colorType combination");
        }
        break;
      case 0:
        if (![1, 2, 4, 8, 16].includes(bitDepth)) {
          throw new TypeError("Invalid bitDepth and colorType combination");
        }
        break;
      default:
        throw new TypeError("Invalid bitDepth and colorType combination");
    }
    const compression = chunkIHDR.data[10];
    if (compression !== 0) throw new TypeError("Invalid compression method");
    const filter = chunkIHDR.data[11];
    if (filter !== 0) throw new TypeError("Invalid filter method");
    const interlace = chunkIHDR.data[12];
    if (interlace !== 0 && interlace !== 1) {
      throw new TypeError("Invalid interlace method");
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
    throw new Error("Bit Depths other than 8 are't implemented yet");
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
      default: //0
        return 1;
    }
  }();

  const chunksIDAT: (Uint8Array | Uint8ClampedArray)[] = [];
  let chunkPLTE: Uint8Array | Uint8ClampedArray | undefined;
  let chunktRNS: Uint8Array | Uint8ClampedArray | undefined;
  let lastChunkWasIDAT = false;
  for (let i = chunkIHDR.o; i < input.length;) {
    const { o, type, data } = getChunk(input, view, i);
    i = o;
    if ([73, 68, 65, 84].every((x, i) => x === type[i])) {
      chunksIDAT.push(data);
      lastChunkWasIDAT = true;
    } else if (lastChunkWasIDAT) {
      if ([73, 69, 78, 68].every((x, i) => x === type[i])) break;
      throw new TypeError("Expected IDAT or IEND chunk");
    } else if ([80, 76, 84, 69].every((x, i) => x === type[i])) {
      if (chunkPLTE == undefined) chunkPLTE = data.slice();
      else throw new TypeError("Received multiple PLTE chunks");
    } else if ([116, 82, 78, 83].every((x, i) => x === type[i])) {
      if (chunktRNS == undefined) chunktRNS = data.slice();
      else throw new TypeError("Received multiple tRNS chunks");
    }
  }
  switch (colorType) {
    case 3:
      if (chunkPLTE == undefined) {
        throw new TypeError("Expected to find PLTE chunk");
      }
      if (chunkPLTE.length / 3 % 0 !== 0 || chunkPLTE.length > 256 * 3) {
        throw new RangeError("Invalid data length for PLTE chunk");
      }
      if (chunktRNS != undefined && chunkPLTE.length / 3 !== chunktRNS.length) {
        throw new RangeError("Invalid data length for tRNS chunk");
      }
      break;
    case 0:
      if (chunktRNS != undefined && chunktRNS.length !== 2) {
        throw new RangeError("Invalid data length for tRNS chunk");
      }
      break;
    case 2:
      if (chunktRNS != undefined && chunktRNS.length !== 6) {
        throw new RangeError("Invalid data length for tRNS chunk");
      }
      break;
  }

  const mid = await new Response(
    ReadableStream
      .from(chunksIDAT)
      .pipeThrough(new DecompressionStream("deflate")),
  ).bytes();
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
  ) throw new TypeError("CRC32 didn't match");
  return {
    o: offset + length + 12,
    type: input.subarray(offset + 4, offset + 8),
    data: input.subarray(offset + 8, offset + 8 + length),
  };
}
