import { images, moveTo } from "../_common_pass.ts";
import type { PNGOptions } from "../types.ts";

export function passExtraction(
  input: Uint8Array<ArrayBuffer>,
  pSize: number,
  options: PNGOptions,
): [number, number][] {
  switch (options.interlace) {
    case 1: {
      const sizes = images(options);
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
      return images(options);
  }
}
