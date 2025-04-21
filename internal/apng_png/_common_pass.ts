import type { PNGOptions } from "./types.ts";

export const adam7Pass = [
  { sX: 0, nX: 8, sY: 0, nY: 8 },
  { sX: 4, nX: 8, sY: 0, nY: 8 },
  { sX: 0, nX: 4, sY: 4, nY: 8 },
  { sX: 2, nX: 4, sY: 0, nY: 4 },
  { sX: 0, nX: 2, sY: 2, nY: 4 },
  { sX: 1, nX: 2, sY: 0, nY: 2 },
  { sX: 0, nX: 1, sY: 1, nY: 2 },
] as const;

export function images(options: PNGOptions): [number, number][] {
  switch (options.interlace) {
    case 1:
      return new Array(adam7Pass.length)
        .fill(0)
        .map((_, i) => [
          ((options.width - adam7Pass[i].sX + adam7Pass[i].nX - 1) /
            adam7Pass[i].nX) | 0,
          ((options.height - adam7Pass[i].sY + adam7Pass[i].nY - 1) /
            adam7Pass[i].nY) | 0,
        ]);
    default:
      return [[options.width, options.height]];
  }
}

export function moveTo(
  i: number,
  offsets: number[],
  options: PNGOptions,
): number {
  const x = i % options.width;
  const y = (i / options.width) | 0;
  for (let j = adam7Pass.length - 1; j > 0; --j) {
    const pass = adam7Pass[j];
    if ((x - pass.sX) % pass.nX === 0 && (y - pass.sY) % pass.nY === 0) {
      return offsets[j] +
        ((y - pass.sY) / pass.nY | 0) *
          ((options.width - pass.sX + pass.nX - 1) / pass.nX | 0) +
        ((x - pass.sX) / pass.nX | 0);
    }
  }
  const pass = adam7Pass[0];
  return offsets[0] +
    ((y - pass.sY) / pass.nY | 0) *
      ((options.width - pass.sX + pass.nX - 1) / pass.nX | 0) +
    ((x - pass.sX) / pass.nX | 0);
}
