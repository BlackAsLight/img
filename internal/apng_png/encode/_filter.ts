import { filterTypes } from "../_common_filter.ts";

export function filter(
  output: Uint8Array<ArrayBuffer>,
  colorType: number,
  pSize: number,
  images: Uint8Array<ArrayBuffer>[][],
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
      // default: // 3
  }
  const typeFn = filterTypes[index];

  offset = output.length;
  for (let i = images.length - 1; i >= 0; --i) {
    const lines = images[i];
    for (let y = lines.length - 1; y >= 0; --y) {
      offset -= lines[y].length + 1;
      output[offset] = index;
      for (let x = lines[y].length - 1; x >= 0; --x) {
        lines[y][x] -= typeFn(lines, x, y, pSize);
      }
    }
  }

  return o;
}
