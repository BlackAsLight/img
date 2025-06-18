import { filterTypes } from "../_common_filter.ts";

export function filter(
  mid: Uint8Array<ArrayBuffer>,
  images: Uint8Array<ArrayBuffer>[][],
  pSize: number,
): Uint8Array<ArrayBuffer> {
  for (const lines of images) {
    for (let y = 0; y < lines.length; ++y) {
      const index = lines[y][0];
      lines[y] = lines[y].subarray(1);
      for (let x = 0; x < lines[y].length; ++x) {
        lines[y][x] += filterTypes[index](lines, x, y, pSize);
      }
    }
  }

  let o = 0;
  for (const image of images) {
    for (const line of image) {
      mid.set(line, o);
      o += line.length;
    }
  }
  return mid.subarray(0, o);
}
