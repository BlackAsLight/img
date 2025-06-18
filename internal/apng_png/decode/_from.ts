export function makePixelTransparent(
  output: Uint8Array<ArrayBuffer>,
  r: number,
  g: number,
  b: number,
): void {
  for (let i = 0; i < output.length; i += 4) {
    if (output[i] === r && output[i + 1] === g && output[i + 2] === b) {
      output[i + 3] = 0;
    }
  }
}

export function fromGrayscale(
  output: Uint8Array<ArrayBuffer>,
  i: number,
): void {
  let o = 0;
  for (; i < output.length; ++i) {
    output[o++] = output[i];
    output[o++] = output[i];
    output[o++] = output[i];
    output[o++] = 255;
  }
}

export function fromGrayscaleAlpha(
  output: Uint8Array<ArrayBuffer>,
  i: number,
): void {
  let o = 0;
  for (; i < output.length; i += 2) {
    output[o++] = output[i];
    output[o++] = output[i];
    output[o++] = output[i];
    output[o++] = output[i + 1];
  }
}

export function fromTruecolor(
  output: Uint8Array<ArrayBuffer>,
  i: number,
): void {
  let o = 0;
  for (; i < output.length; i += 3) {
    output[o++] = output[i];
    output[o++] = output[i + 1];
    output[o++] = output[i + 2];
    output[o++] = 255;
  }
}

export function fromIndex(
  output: Uint8Array<ArrayBuffer>,
  i: number,
  palette: Uint32Array<ArrayBuffer>,
): void {
  let o = 0;
  for (; i < output.length; ++i) {
    const pixel = palette[output[i]];
    output[o++] = pixel >>> 24 & 0xFF;
    output[o++] = pixel >>> 16 & 0xFF;
    output[o++] = pixel >>> 8 & 0xFF;
    output[o++] = pixel & 0xFF;
  }
}
