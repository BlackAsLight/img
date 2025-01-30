import { assertEquals } from "@std/assert";
import type { PNGOptions } from "../types.ts";
import { filter } from "./_filter.ts";
import { passExtraction } from "./_passExtraction.ts";
import { scanlines } from "./_scanlines.ts";

Deno.test("filter() with colorType 6", () => {
  const buffer = Uint8Array.from([0, 0, 0, 1, 2, 3]);
  const options: PNGOptions = {
    width: 2,
    height: 2,
    compression: 0,
    filter: 0,
    interlace: 0,
  };

  const images = scanlines(
    buffer.subarray(2),
    1,
    passExtraction(buffer.subarray(2), 1, options),
  );
  assertEquals(filter(buffer, 6, 1, images), 0);
  assertEquals(
    buffer,
    Uint8Array.from([4, 0, 1, 4, 2, 1]),
  );
});
