export function scanlines(
  input: Uint8Array<ArrayBuffer>,
  pSize: number,
  images: [number, number][],
): Uint8Array<ArrayBuffer>[][] {
  const output: Uint8Array<ArrayBuffer>[][] = new Array(images.length)
    .fill(0)
    .map(() => []);
  let i = 0;
  let offset = 0;
  for (const [width, height] of images) {
    for (let h = 0; h < height; ++h) {
      output[i][h] = input.subarray(
        offset + h * width * pSize,
        offset + (h + 1) * width * pSize,
      );
    }
    offset += width * height * pSize;
    ++i;
  }
  return output;
}
