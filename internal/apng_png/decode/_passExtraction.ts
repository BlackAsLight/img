import { images, moveTo } from "../_common_pass.ts";
import type { PNGOptions } from "../types.ts";
export { images };

export function passExtraction(
  output: Uint8Array,
  mid: Uint8Array,
  options: PNGOptions,
  pSize: number,
  sizes: [number, number][],
): number {
  switch (options.interlace) {
    case 1: {
      const offsets: number[] = new Array(sizes.length)
        .fill(0)
        .map((_, i) => sizes.slice(0, i).reduce((x, y) => x + y[0] * y[1], 0));
      let p = 0;
      for (let i = 0; i < mid.length; i += pSize, ++p) {
        const x = moveTo(p, offsets, options) * pSize;
        output.set(
          mid.subarray(x, x + pSize),
          p * pSize,
        );
      }

      const offset = output.length - mid.length;
      if (offset) output.set(output.subarray(0, mid.length), offset);
      return offset;
    }
    default: {
      const offset = output.length - mid.length;
      output.set(mid, offset);
      return offset;
    }
  }
}
