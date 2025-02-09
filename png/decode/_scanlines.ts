export function scanlines(
  mid: Uint8Array,
  pSize: number,
  sizes: [number, number][],
): Uint8Array[][] {
  const output: Uint8Array[][] = new Array(sizes.length)
    .fill(0)
    .map(() => []);
  let i = 0;
  let offset = 0;
  for (const [width, height] of sizes) {
    for (let h = 0; h < height; ++h) {
      output[i][h] = mid.subarray(
        offset + h * (width * pSize + 1),
        offset + (h + 1) * (width * pSize + 1),
      );
    }
    offset += height * (width * pSize + 1);
    ++i;
  }
  return output;
}
