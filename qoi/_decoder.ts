import { calcIndex } from "./_common.ts";

export function createDecoder(): (
  input: Uint8Array,
  i: number,
  o: number,
) => { i: number; o: number; c: number; isEnd: boolean } {
  const previousPixel = new Uint8Array([0, 0, 0, 255]);
  const seenPixels: Uint8Array[] = new Array(64)
    .fill(0)
    .map((_) => new Uint8Array([0, 0, 0, 0]));
  return function (
    data: Uint8Array,
    i: number,
    o: number,
  ): { i: number; o: number; c: number; isEnd: boolean } {
    let c = 0;
    for (; i <= data.length - 8; o += 4) {
      if ([0, 0, 0, 0, 0, 0, 0, 1].every((x, j) => x === data[i + j])) {
        return { i, o, c, isEnd: true };
      }
      ++c;

      if (data[i] === 0b11111111) {
        // QOI_OP_RGBA
        previousPixel.set(data.subarray(i + 1, i + 5));
        seenPixels[calcIndex(previousPixel, false)].set(previousPixel);
        data.set(previousPixel, o);
        i += 5;
      } else if (data[i] === 0b11111110) {
        // QOI_OP_RGB
        previousPixel.set(data.subarray(i + 1, i + 4));
        previousPixel[3] = 255;
        seenPixels[calcIndex(previousPixel, true)].set(previousPixel);
        data.set(previousPixel, o);
        i += 4;
      } else {
        switch (data[i] >> 6) {
          case 0:
            // QOI_OP_INDEX
            previousPixel.set(seenPixels[data[i++] & 0b00111111]);
            data.set(previousPixel, o);
            break;
          case 1:
            // QOI_OP_DIFF
            previousPixel[0] += (data[i] >> 4 & 0b11) - 2;
            previousPixel[1] += (data[i] >> 2 & 0b11) - 2;
            previousPixel[2] += (data[i++] & 0b11) - 2;
            seenPixels[calcIndex(previousPixel, false)].set(previousPixel);
            data.set(previousPixel, o);
            break;
          case 2: {
            // QOI_OP_LUMA
            const greenDiff = (data[i] & 0b00111111) - 32;
            previousPixel[0] += (data[++i] >> 4) + greenDiff - 8;
            previousPixel[1] += greenDiff;
            previousPixel[2] += (data[i++] & 0b00001111) + greenDiff - 8;
            seenPixels[calcIndex(previousPixel, false)].set(previousPixel);
            data.set(previousPixel, o);
            break;
          }
          default: { // 3
            // QOI_OP_RUN
            const run = data[i++] & 0b00111111;
            c += run;
            for (let j = 0; j < run; ++j) {
              data.set(previousPixel, o);
              o += 4;
            }
            data.set(previousPixel, o);
          }
        }
      }
    }
    return { i, o, c, isEnd: false };
  };
}
