import { assertEquals } from "@std/assert";
import { toGrayscale, toGrayscaleAlpha, toIndex, toTruecolor } from "./_to.ts";

Deno.test("toGrayScale()", () => {
  assertEquals(
    toGrayscale(
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    ),
    Uint8Array.from([0, 4, 8, 12]),
  );
});

Deno.test("toGreyscaleAlpha()", () => {
  assertEquals(
    toGrayscaleAlpha(
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    ),
    Uint8Array.from([0, 3, 4, 7, 8, 11, 12, 15]),
  );
});

Deno.test("toTruecolr()", () => {
  assertEquals(
    toTruecolor(
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    ),
    Uint8Array.from([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]),
  );
});

Deno.test("toIndex()", () => {
  const palette = Uint32Array.from([
    ((0 * 256 + 1) * 256 + 2) * 256 + 3,
    ((4 * 256 + 5) * 256 + 6) * 256 + 7,
    ((8 * 256 + 9) * 256 + 10) * 256 + 11,
    ((12 * 256 + 13) * 256 + 14) * 256 + 15,
  ]);
  assertEquals(
    toIndex(
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
      palette,
    ),
    Uint8Array.from([0, 1, 2, 3]),
  );
});
