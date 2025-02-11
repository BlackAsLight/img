import { assertEquals, assertRejects } from "@std/assert";
import { concat } from "@std/bytes";
import { encodePNG } from "../encode/mod.ts";
import { decodePNG } from "../mod.ts";
import { calcCRC } from "../_crc.ts";

interface Chunk {
  length: number;
  type: Uint8Array;
  data: Uint8Array;
  crc: number;
}

function getChunk(
  buffer: Uint8Array,
  view: DataView,
  offset: number,
): Chunk {
  const length = view.getUint32(offset);
  const type = buffer.subarray(offset + 4, offset + 8);
  const data = buffer.subarray(offset + 8, offset + 8 + length);
  const crc = view.getUint32(offset + 8 + length);
  return { length, type, data, crc };
}

Deno.test("decodePNG() rejects with incorrect signature", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  ++encoded[0];

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "PNG had invalid signature",
  );
});

Deno.test("decodePNG() rejects due to incorrect crc32", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  ++encoded[12];

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "The CRC32 chunk didn't match for chunk: JHDR",
  );
});

Deno.test("decodePNG() rejects expecting a IHDR chunk", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  ++chunk.type[0];
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "An IHDR chunk was expected. Found: JHDR",
  );
});

Deno.test("decodePNG() rejects due to invalid width", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  --chunk.data[3];
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    RangeError,
    "PNG has an invalid Width: 0",
  );
});

Deno.test("decodePNG() rejects due to invalid height", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  --chunk.data[7];
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    RangeError,
    "PNG has an invalid Height: 0",
  );
});

Deno.test("decodePNG() rejects due to invalid bitDepth & colorType", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  ++chunk.data[8];
  for (const colorType of [0, 2, 3, 4, 6, 7]) {
    chunk.data[9] = colorType;
    view.setUint32(
      8 + 8 + chunk.length,
      calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
    );

    await assertRejects(
      () => decodePNG(encoded),
      TypeError,
      "PNG has invalid bitDepth and colorType combination",
    );
  }
});

Deno.test("decodePNG() rejects due to invalid compression method", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  ++chunk.data[10];
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "PNG has an invalid compression method: 1",
  );
});

Deno.test("decodePNG() rejects due to invalid filter method", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  ++chunk.data[11];
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "PNG has an invalid filter method: 1",
  );
});

Deno.test("decodePNG() rejects due to invalid interlace method", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  chunk.data[12] = 2;
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "PNG has an invalid interlace method: 2",
  );
});

Deno.test("decodePNG() rejects due to unsupported bitDepth", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const chunk = getChunk(encoded, view, 8);
  chunk.data[8] = 4;
  view.setUint32(
    8 + 8 + chunk.length,
    calcCRC(encoded.subarray(8 + 4, 8 + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    Error,
    "Bit Depths other than 8 aren't implemented yet",
  );
});

Deno.test("decodePNG() rejects due to expecting an IDAT or IEND chunk", async () => {
  const encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const [offset, chunk] = function (): [number, Chunk] {
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([73, 69, 78, 68].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  ++chunk.type[0];
  view.setUint32(
    offset + 8 + chunk.length,
    calcCRC(encoded.subarray(offset + 4, offset + 8 + chunk.length)),
  );

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "An IDAT or IEND chunk was expected. Found: JEND",
  );
});

Deno.test("decodePNG() rejects due to receiving too many PLTE chunks", async () => {
  let encoded = await encodePNG(Uint8Array.from([0, 1, 2, 3]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });

  const [offset, chunk] = function (): [number, Chunk] {
    const view = new DataView(
      encoded.buffer,
      encoded.byteOffset,
      encoded.byteLength,
    );
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([80, 76, 84, 69].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  encoded = concat([
    encoded.subarray(0, offset),
    encoded.subarray(offset, offset + 12 + chunk.length),
    encoded.subarray(offset),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "A PLTE chunk was already received",
  );
});

Deno.test("decodePNG() rejects due to receiving too many tRNS chunks", async () => {
  let encoded = await encodePNG(Uint8Array.from([0, 1, 2, 3]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });

  const [offset, chunk] = function (): [number, Chunk] {
    const view = new DataView(
      encoded.buffer,
      encoded.byteOffset,
      encoded.byteLength,
    );
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([116, 82, 78, 83].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  encoded = concat([
    encoded.subarray(0, offset),
    encoded.subarray(offset, offset + 12 + chunk.length),
    encoded.subarray(offset),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "A tRNS chunk was already received",
  );
});

Deno.test("decodePNG() rejects due to expecting a PLTE chunk", async () => {
  let encoded = await encodePNG(Uint8Array.from([0, 1, 2, 3]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });

  const [offset, chunk] = function (): [number, Chunk] {
    const view = new DataView(
      encoded.buffer,
      encoded.byteOffset,
      encoded.byteLength,
    );
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([80, 76, 84, 69].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  encoded = concat([
    encoded.subarray(0, offset),
    encoded.subarray(offset + 12 + chunk.length),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    TypeError,
    "A PLTE chunk was expected",
  );
});

Deno.test("decodePNG() rejects due to PLTE chunk having invalid length", async () => {
  let encoded = await encodePNG(Uint8Array.from([0, 1, 2, 3]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const [offset, chunk] = function (): [number, Chunk] {
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([80, 76, 84, 69].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  view.setUint32(offset, chunk.length - 1);
  view.setUint32(
    offset + 8 + chunk.length - 1,
    calcCRC(encoded.subarray(offset + 4, offset + 8 + chunk.length - 1)),
  );
  encoded = concat([
    encoded.subarray(0, offset + 12 + chunk.length - 1),
    encoded.subarray(offset + 12 + chunk.length),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    RangeError,
    "The PLTE chunk has an invalid length",
  );
});

Deno.test("decodePNG() rejects due to tRNS chunk having invalid length with colorType 3", async () => {
  let encoded = await encodePNG(Uint8Array.from([0, 1, 2, 3]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const [offset, chunk] = function (): [number, Chunk] {
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([116, 82, 78, 83].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  view.setUint32(offset, chunk.length - 1);
  view.setUint32(
    offset + 8 + chunk.length - 1,
    calcCRC(encoded.subarray(offset + 4, offset + 8 + chunk.length - 1)),
  );
  encoded = concat([
    encoded.subarray(0, offset + 12 + chunk.length - 1),
    encoded.subarray(offset + 12 + chunk.length),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    RangeError,
    "The tRNS chunk has an invalid length",
  );
});

Deno.test("decodePNG() rejects due to tRNS chunk having invalid length with colorType 0", async () => {
  let encoded = await encodePNG(new Uint8Array(4), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const [offset, chunk] = function (): [number, Chunk] {
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([116, 82, 78, 83].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  view.setUint32(offset, chunk.length - 1);
  view.setUint32(
    offset + 8 + chunk.length - 1,
    calcCRC(encoded.subarray(offset + 4, offset + 8 + chunk.length - 1)),
  );
  encoded = concat([
    encoded.subarray(0, offset + 12 + chunk.length - 1),
    encoded.subarray(offset + 12 + chunk.length),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    RangeError,
    "The tRNS chunk has an invalid length",
  );
});

Deno.test("decodePNG() rejects due to tRNS chunk having invalid length with colorType 2", async () => {
  const rgba = new Uint8Array(1028);
  rgba[0] = 0;
  rgba[1] = 0;
  rgba[2] = 0;
  rgba[3] = 0;
  for (let i = 4; i < rgba.length; i += 4) {
    const x = i / 4 - 1;
    rgba[i] = x & 0xFF;
    rgba[i + 1] = x >>> 8 & 0xFF;
    rgba[i + 2] = x >>> 16 & 0xFF;
    rgba[i + 3] = 255;
  }
  let encoded = await encodePNG(rgba, {
    width: 257,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const [offset, chunk] = function (): [number, Chunk] {
    for (let o = 8; o < encoded.length;) {
      const chunk = getChunk(encoded, view, o);
      if ([116, 82, 78, 83].every((x, i) => x === chunk.type[i])) {
        return [o, chunk];
      }
      o += chunk.length + 12;
    }
    throw new Error("INVALID");
  }();
  view.setUint32(offset, chunk.length - 1);
  view.setUint32(
    offset + 8 + chunk.length - 1,
    calcCRC(encoded.subarray(offset + 4, offset + 8 + chunk.length - 1)),
  );
  encoded = concat([
    encoded.subarray(0, offset + 12 + chunk.length - 1),
    encoded.subarray(offset + 12 + chunk.length),
  ]);

  await assertRejects(
    () => decodePNG(encoded),
    RangeError,
    "The tRNS chunk has an invalid length",
  );
});

Deno.test("decodePNG() correctly decodes Grayscale", async () => {
  const rgba = new Uint8Array(4);

  assertEquals(
    (await decodePNG(
      await encodePNG(rgba.slice(), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    )).body,
    rgba,
  );
});

Deno.test("decodePNG() correctly decodes GrayscaleAlpha", async () => {
  const rgba = Uint8Array.from([0, 0, 0, 1]);

  assertEquals(
    (await decodePNG(
      await encodePNG(rgba.slice(), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    )).body,
    rgba,
  );
});

Deno.test("decodePNG() correctly decodes Index", async () => {
  const rgba = Uint8Array.from([0, 1, 2, 255]);

  assertEquals(
    (await decodePNG(
      await encodePNG(rgba.slice(), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    )).body,
    rgba,
  );
});

Deno.test("decodePNG() correctly decodes Truecolor", async () => {
  const rgba = new Uint8Array(1028);
  rgba[0] = 0;
  rgba[1] = 0;
  rgba[2] = 1;
  rgba[3] = 0;
  for (let i = 4; i < rgba.length; i += 4) {
    const x = i / 4 - 1;
    rgba[i] = x & 0xFF;
    rgba[i + 1] = x >>> 8 & 0xFF;
    rgba[i + 2] = x >>> 16 & 0xFF;
    rgba[i + 3] = 255;
  }

  assertEquals(
    (await decodePNG(
      await encodePNG(rgba.slice(), {
        width: 257,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    )).body,
    rgba,
  );
});

Deno.test("decodePNG() correctly decodes TruecolorAlpha", async () => {
  const rgba = new Uint8Array(1028);
  rgba[0] = 1;
  rgba[1] = 1;
  rgba[2] = 1;
  rgba[3] = 1;
  for (let i = 4; i < rgba.length; i += 4) {
    const x = i / 4 - 1;
    rgba[i] = x & 0xFF;
    rgba[i + 1] = x >>> 8 & 0xFF;
    rgba[i + 2] = x >>> 16 & 0xFF;
    rgba[i + 3] = 255;
  }

  assertEquals(
    (await decodePNG(
      await encodePNG(rgba.slice(), {
        width: 257,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    )).body,
    rgba,
  );
});

Deno.test("decodePNG() correctly decodes with interlace 1", async () => {
  const rgba = Uint8Array.from(
    new Array(257)
      .fill(0)
      .map((_, i) => new Array(4).fill(i))
      .flat(2),
  );

  assertEquals(
    (await decodePNG(
      await encodePNG(rgba.slice(), {
        width: 257,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 1,
      }),
    )).body,
    rgba,
  );
});
