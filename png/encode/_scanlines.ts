export function scanlines(
  input: Uint8Array,
  pSize: number,
  images: [number, number][],
): Uint8Array[][] {
  const output: Uint8Array[][] = new Array(images.length)
    .fill(0)
    .map(() => []);
  let i = 0;
  let offset = 0;
  for (const [width, height] of images) {
    for (let h = 0; h < height; ++h) {
      output[i][h] = input.subarray(
        offset + h * width * pSize,
        offset + (h * width + width) * pSize,
      );
    }
    offset += width * height * pSize;
    ++i;
  }
  return output;
}
