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

export function filter(
  output: Uint8Array,
  colorType: number,
  pSize: number,
  images: Uint8Array[][],
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
        lines[y][x] = typeFn(lines, x, y, pSize);
      }
    }
  }

  return o;
}
