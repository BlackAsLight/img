import { moveTo } from "../_common_pass.ts";
import type { PNGOptions } from "../types.ts";

export function passExtraction(
  output: Uint8Array,
  mid: Uint8Array,
  options: PNGOptions,
  pSize: number,
  sizes: [number, number][],
): number {
  const offsets: number[] = new Array(sizes.length)
    .fill(0)
    .map((_, i) => sizes.slice(0, i).reduce((x, y) => x + y[0] * y[1], 0));
  let p = 0;
  for (let i = 0; i < mid.length; i += pSize, ++p) {
    output.set(mid.subarray(i, i + pSize), moveTo(p, offsets, options));
  }

  p = moveTo(--p, offsets, options) * pSize + 1;
  const offset = output.length - p;
  if (offset) output.set(output.subarray(0, p), offset);
  return offset;
}
