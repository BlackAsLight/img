import type { PNGOptions } from "../types.ts";

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

export function passExtraction(
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
