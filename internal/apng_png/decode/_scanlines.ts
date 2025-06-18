export function scanlines(
  mid: Uint8Array<ArrayBuffer>,
  pSize: number,
  sizes: [number, number][],
): Uint8Array<ArrayBuffer>[][] {
  const images: Uint8Array<ArrayBuffer>[][] = new Array(sizes.length)
    .fill(0)
    .map(() => []);
  let i = 0;
  let offset = 0;
  for (const [width, height] of sizes) {
    for (let h = 0; h < height; ++h) {
      images[i][h] = mid.subarray(
        offset + h * (width * pSize + 1),
        offset + (h + 1) * (width * pSize + 1),
      );
    }
    offset += height * (width * pSize + 1);
    ++i;
  }
  return images;
}
