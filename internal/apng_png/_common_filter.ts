export const filterTypes = [
  function type0(
    _lines: Uint8Array<ArrayBuffer>[],
    _x: number,
    _y: number,
    _pSize: number,
  ): number {
    return 0;
  },
  function type1(
    lines: Uint8Array<ArrayBuffer>[],
    x: number,
    y: number,
    pSize: number,
  ): number {
    return lines[y][x - pSize] ?? 0;
  },
  function type2(
    lines: Uint8Array<ArrayBuffer>[],
    x: number,
    y: number,
    _pSize: number,
  ): number {
    return y === 0 ? 0 : lines[y - 1][x];
  },
  function type3(
    lines: Uint8Array<ArrayBuffer>[],
    x: number,
    y: number,
    pSize: number,
  ): number {
    return (
          (lines[y][x - pSize] ?? 0) +
          (y === 0 ? 0 : lines[y - 1][x])
        ) / 2 | 0;
  },
  function type4(
    lines: Uint8Array<ArrayBuffer>[],
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
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  },
] as const;
