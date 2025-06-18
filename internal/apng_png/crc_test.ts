import { assertEquals } from "@std/assert";
import { calcCRC } from "./crc.ts";

Deno.test("calcCRC() with empty buffer", () => {
  assertEquals(calcCRC(new Uint8Array(0)), 0);
});

Deno.test('calcCRC() with "Hello World"', () => {
  assertEquals(
    calcCRC(new TextEncoder().encode("Hello World") as Uint8Array<ArrayBuffer>),
    0x4a17b156,
  );
});
