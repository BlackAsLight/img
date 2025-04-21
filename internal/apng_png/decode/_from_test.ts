import { assertEquals } from "@std/assert";
import { toGrayscale, toGrayscaleAlpha } from "../encode/_to.ts";
import { fromGrayscale } from "./_from.ts";
import { fromGrayscaleAlpha } from "./_from.ts";
import { toTruecolor } from "../encode/_to.ts";
import { fromTruecolor } from "./_from.ts";
import { toIndex } from "../encode/_to.ts";
import { fromIndex } from "./_from.ts";

Deno.test("fromGrayScale()", () => {
  const rgba = Uint8Array.from(
    [0, 0, 0, 255, 1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255],
  );

  let y = toGrayscale(rgba.slice());
  const size = y.length;
  y = new Uint8Array(y.buffer);
  y.set(y.subarray(0, size), y.length - size);
  fromGrayscale(y, y.length - size);

  assertEquals(y, rgba);
});

Deno.test("fromGrayScaleAlpha()", () => {
  const rgba = Uint8Array.from(
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
  );

  let ya = toGrayscaleAlpha(rgba.slice());
  const size = ya.length;
  ya = new Uint8Array(ya.buffer);
  ya.set(ya.subarray(0, size), ya.length - size);
  fromGrayscaleAlpha(ya, ya.length - size);

  assertEquals(ya, rgba);
});

Deno.test("fromTruecolor()", () => {
  const rgba = Uint8Array.from(
    [0, 0, 0, 255, 1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255],
  );

  let rgb = toTruecolor(rgba.slice());
  const size = rgb.length;
  rgb = new Uint8Array(rgb.buffer);
  rgb.set(rgb.subarray(0, size), rgb.length - size);
  fromTruecolor(rgb, rgb.length - size);

  assertEquals(rgb, rgba);
});

Deno.test("fromTruecolor()", () => {
  const palette = Uint32Array.from([
    ((0 * 256 + 1) * 256 + 2) * 256 + 3,
    ((4 * 256 + 5) * 256 + 6) * 256 + 7,
    ((8 * 256 + 9) * 256 + 10) * 256 + 11,
    ((12 * 256 + 13) * 256 + 14) * 256 + 15,
  ]);

  const rgba = Uint8Array.from(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  );

  let i = toIndex(rgba.slice(), palette);
  const size = i.length;
  i = new Uint8Array(i.buffer);
  i.set(i.subarray(0, size), i.length - size);
  fromIndex(i, i.length - size, palette);

  assertEquals(i, rgba);
});
