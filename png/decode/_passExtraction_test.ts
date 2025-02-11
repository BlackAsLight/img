import { assertEquals } from "@std/assert";
import { passExtraction as decode } from "./_passExtraction.ts";
import { passExtraction as encode } from "../encode/_passExtraction.ts";
import type { PNGOptions } from "../types.ts";
import { images } from "../_common_pass.ts";

Deno.test("passExtraction() with interlace 1 for 8x8", () => {
  const pixelSize = 4;
  const buffer = Uint8Array.from(
    new Array(8 * 8)
      .fill(0)
      .map((_, i) => new Array(pixelSize).fill(i))
      .flat(2),
  );
  const options: PNGOptions = {
    width: 8,
    height: 8,
    compression: 0,
    filter: 0,
    interlace: 1,
  };
  const output = new Uint8Array(options.width * options.height * 4);
  encode(buffer, pixelSize, options);
  const x = decode(output, buffer, options, pixelSize, images(options));
  assertEquals(x, 0);
  for (let i = 0; i + x < output.length; i += pixelSize) {
    assertEquals(output[i + x], i / pixelSize);
    assertEquals(output[i + x + 1], i / pixelSize);
    assertEquals(output[i + x + 2], i / pixelSize);
    assertEquals(output[i + x + 3], i / pixelSize);
  }
});

Deno.test("passExtraction() with interlace 1 for 10x10", () => {
  const pixelSize = 3;
  const buffer = Uint8Array.from(
    new Array(10 * 10)
      .fill(0)
      .map((_, i) => new Array(pixelSize).fill(i))
      .flat(2),
  );
  const options: PNGOptions = {
    width: 10,
    height: 10,
    compression: 0,
    filter: 0,
    interlace: 1,
  };
  const output = new Uint8Array(options.width * options.height * 4);
  encode(buffer, pixelSize, options);
  const x = decode(output, buffer, options, pixelSize, images(options));
  assertEquals(x, 100);
  for (let i = 0; i + x < output.length; i += pixelSize) {
    assertEquals(output[i + x], i / pixelSize);
    assertEquals(output[i + x + 1], i / pixelSize);
    assertEquals(output[i + x + 2], i / pixelSize);
  }
});

Deno.test("passExtraction() with interlace 1 for 13x13", () => {
  const pixelSize = 2;
  const buffer = Uint8Array.from(
    new Array(13 * 13)
      .fill(0)
      .map((_, i) => new Array(pixelSize).fill(i))
      .flat(2),
  );
  const options: PNGOptions = {
    width: 13,
    height: 13,
    compression: 0,
    filter: 0,
    interlace: 1,
  };
  const output = new Uint8Array(options.width * options.height * 4);
  encode(buffer, pixelSize, options);
  const x = decode(output, buffer, options, pixelSize, images(options));
  assertEquals(x, 338);
  for (let i = 0; i + x < output.length; i += pixelSize) {
    assertEquals(output[i + x], i / pixelSize);
    assertEquals(output[i + x + 1], i / pixelSize);
  }
});
