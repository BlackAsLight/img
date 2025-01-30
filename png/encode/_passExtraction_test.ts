import { assertEquals } from "@std/assert";
import { passExtraction } from "./_passExtraction.ts";

Deno.test("passExtraction() with interlace 0 for 8x8", () => {
  const pixelSize = 4;
  const buffer = Uint8Array.from(
    [
      [0, 1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20, 21, 22, 23],
      [24, 25, 26, 27, 28, 29, 30, 31],
      [32, 33, 34, 35, 36, 37, 38, 39],
      [40, 41, 42, 43, 44, 45, 46, 47],
      [48, 49, 50, 51, 52, 53, 54, 55],
      [56, 57, 58, 59, 60, 61, 62, 63],
    ]
      .map((x) => x.map((y) => new Array(pixelSize).fill(y)))
      .flat(2),
  );

  assertEquals(
    passExtraction(buffer, pixelSize, {
      width: 8,
      height: 8,
      compression: 0,
      filter: 0,
      interlace: 0,
    }),
    [[8, 8]],
  );

  for (let i = 0; i < buffer.length; i += pixelSize) {
    assertEquals(buffer[i], i / pixelSize);
    assertEquals(buffer[i + 1], i / pixelSize);
    assertEquals(buffer[i + 2], i / pixelSize);
    assertEquals(buffer[i + 3], i / pixelSize);
  }
});

Deno.test("passExtraction() with interlace 1 for 8x8", () => {
  const pixelSize = 4;
  const buffer = Uint8Array.from(
    [
      [0, 16, 4, 17, 1, 18, 5, 19],
      [32, 33, 34, 35, 36, 37, 38, 39],
      [8, 20, 9, 21, 10, 22, 11, 23],
      [40, 41, 42, 43, 44, 45, 46, 47],
      [2, 24, 6, 25, 3, 26, 7, 27],
      [48, 49, 50, 51, 52, 53, 54, 55],
      [12, 28, 13, 29, 14, 30, 15, 31],
      [56, 57, 58, 59, 60, 61, 62, 63],
    ]
      .map((x) => x.map((y) => new Array(pixelSize).fill(y)))
      .flat(2),
  );

  assertEquals(
    passExtraction(buffer, pixelSize, {
      width: 8,
      height: 8,
      compression: 0,
      filter: 0,
      interlace: 1,
    }),
    [[1, 1], [1, 1], [2, 1], [2, 2], [4, 2], [4, 4], [8, 4]],
  );

  for (let i = 0; i < buffer.length; i += pixelSize) {
    assertEquals(buffer[i], i / pixelSize);
    assertEquals(buffer[i + 1], i / pixelSize);
    assertEquals(buffer[i + 2], i / pixelSize);
    assertEquals(buffer[i + 3], i / pixelSize);
  }
});

Deno.test("passExtraction() with interlace 1 for 10x10", () => {
  const pixelSize = 3;
  const buffer = Uint8Array.from(
    [
      [0, 25, 9, 26, 4, 27, 10, 28, 1, 29],
      [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      [15, 30, 16, 31, 17, 32, 18, 33, 19, 34],
      [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
      [6, 35, 11, 36, 7, 37, 12, 38, 8, 39],
      [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
      [20, 40, 21, 41, 22, 42, 23, 43, 24, 44],
      [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
      [2, 45, 13, 46, 5, 47, 14, 48, 3, 49],
      [90, 91, 92, 93, 94, 95, 96, 97, 98, 99],
    ]
      .map((x) => x.map((y) => new Array(pixelSize).fill(y)))
      .flat(2),
  );

  assertEquals(
    passExtraction(buffer, pixelSize, {
      width: 10,
      height: 10,
      compression: 0,
      filter: 0,
      interlace: 1,
    }),
    [[2, 2], [1, 2], [3, 1], [2, 3], [5, 2], [5, 5], [10, 5]],
  );

  for (let i = 0; i < buffer.length; i += pixelSize) {
    assertEquals(buffer[i], i / pixelSize);
    assertEquals(buffer[i + 1], i / pixelSize);
    assertEquals(buffer[i + 2], i / pixelSize);
  }
});

Deno.test("passExtraction() with interlace 1 for 13x13", () => {
  const pixelSize = 2;
  const buffer = Uint8Array.from(
    [
      [0, 49, 16, 50, 4, 51, 17, 52, 1, 53, 18, 54, 5],
      [91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103],
      [28, 55, 29, 56, 30, 57, 31, 58, 32, 59, 33, 60, 34],
      [104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116],
      [8, 61, 19, 62, 9, 63, 20, 64, 10, 65, 21, 66, 11],
      [117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129],
      [35, 67, 36, 68, 37, 69, 38, 70, 39, 71, 40, 72, 41],
      [130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142],
      [2, 73, 22, 74, 6, 75, 23, 76, 3, 77, 24, 78, 7],
      [143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155],
      [42, 79, 43, 80, 44, 81, 45, 82, 46, 83, 47, 84, 48],
      [156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168],
      [12, 85, 25, 86, 13, 87, 26, 88, 14, 89, 27, 90, 15],
    ]
      .map((x) => x.map((y) => new Array(pixelSize).fill(y)))
      .flat(2),
  );

  assertEquals(
    passExtraction(buffer, pixelSize, {
      width: 13,
      height: 13,
      compression: 0,
      filter: 0,
      interlace: 1,
    }),
    [[2, 2], [2, 2], [4, 2], [3, 4], [7, 3], [6, 7], [13, 6]],
  );

  for (let i = 0; i < buffer.length; i += pixelSize) {
    assertEquals(buffer[i], i / pixelSize);
    assertEquals(buffer[i + 1], i / pixelSize);
  }
});
