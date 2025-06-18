export function calcIndex(
  pixel: Uint8Array<ArrayBuffer>,
  isRGB: boolean,
): number {
  return (
    pixel[0] * 3 +
    pixel[1] * 5 +
    pixel[2] * 7 +
    (isRGB ? 255 * 11 : pixel[3] * 11)
  ) % 64;
}
