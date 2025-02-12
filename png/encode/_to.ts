export function guaranteeInvisiblePixel(
  input: Uint8Array | Uint8ClampedArray,
  colors: Map<number, number>,
  forGrayscale: boolean,
): number | undefined {
  if (forGrayscale) {
    for (let y = 0; y < 256; ++y) {
      let colorExists = false;
      for (const [color, _occurances] of colors) {
        if (
          y === (color >>> 24 & 0xFF) &&
          255 === (color & 0xFF)
        ) {
          colorExists = true;
          break;
        }
      }
      if (!colorExists) {
        replaceTransparentPixels(input, y, y, y);
        return y;
      }
    }
  }
  for (let r = 0; r < 256; ++r) {
    for (let g = 0; g < 256; ++g) {
      for (let b = 0; b < 256; ++b) {
        let colorExists = false;
        for (const [color, _occurances] of colors) {
          if (
            r === (color >>> 24 & 0xFF) &&
            g === (color >>> 16 & 0xFF) &&
            b === (color >>> 8 & 0xFF) &&
            255 === (color & 0xFF)
          ) {
            colorExists = true;
            break;
          }
        }
        if (!colorExists) {
          replaceTransparentPixels(input, r, g, b);
          return ((r * 256 + g) * 256 + b) * 256;
        }
      }
    }
  }
}

function replaceTransparentPixels(
  input: Uint8Array | Uint8ClampedArray,
  r: number,
  g: number,
  b: number,
): void {
  for (let i = 0; i < input.length; i += 4) {
    if (input[i + 3] === 0) {
      input[i] = r;
      input[i + 1] = g;
      input[i + 2] = b;
    }
  }
}

export function toGrayscale(
  input: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
  for (let i = 4; i < input.length; i += 4) input[i / 4] = input[i];
  return input.subarray(0, input.length / 4);
}

export function toGrayscaleAlpha(
  input: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
  input[1] = input[3];
  for (let i = 4; i < input.length; i += 4) {
    input[i / 2] = input[i];
    input[i / 2 + 1] = input[i + 3];
  }
  return input.subarray(0, input.length / 2);
}

export function toTruecolor(
  input: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
  for (let i = 4; i < input.length; i += 4) {
    input[i / 4 * 3] = input[i];
    input[i / 4 * 3 + 1] = input[i + 1];
    input[i / 4 * 3 + 2] = input[i + 2];
  }
  return input.subarray(0, input.length / 4 * 3);
}

export function toIndex(
  input: Uint8Array | Uint8ClampedArray,
  palette: Uint32Array,
): Uint8Array | Uint8ClampedArray {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  for (let i = 0; i < input.length; i += 4) {
    input[i / 4] = palette.indexOf(view.getUint32(i));
  }
  return input.subarray(0, input.length / 4);
}
