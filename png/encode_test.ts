import { assertEquals, assertRejects } from "@std/assert";
import { encodePNG } from "./encode.ts";
import { calcCRC } from "@img/internal/apng-png/crc";

Deno.test("encodePNG() rejecting invalid width", async () => {
  await assertRejects(
    () =>
      encodePNG(new Uint8Array(4), {
        width: 0,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    RangeError,
    "Width (0) must be an integer value greater than zero",
  );
});

Deno.test("encodePNG() rejecting invalid height", async () => {
  await assertRejects(
    () =>
      encodePNG(new Uint8Array(4), {
        width: 1,
        height: 0,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    RangeError,
    "Height (0) must be an integer value greater than zero",
  );
});

Deno.test("encodePNG() rejecting invalid byte length", async () => {
  await assertRejects(
    () =>
      encodePNG(new Uint8Array(3), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }),
    RangeError,
    "Number of pixels (1) does not match input length",
  );
});

Deno.test("encodePNG() rejecting invalid compression method", async () => {
  await assertRejects(
    () =>
      encodePNG(new Uint8Array(4), {
        width: 1,
        height: 1,
        compression: 1 as 0,
        filter: 0,
        interlace: 0,
      }),
    TypeError,
    "Unsupported Compression Method: 1",
  );
});

Deno.test("encodePNG() rejecting invalid filter method", async () => {
  await assertRejects(
    () =>
      encodePNG(new Uint8Array(4), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 1 as 0,
        interlace: 0,
      }),
    TypeError,
    "Unsupported Filter Method: 1",
  );
});

Deno.test("encodePNG() rejecting invalid interlace method", async () => {
  await assertRejects(
    () =>
      encodePNG(new Uint8Array(4), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 2 as 0,
      }),
    TypeError,
    "Unsupported Interlace Method: 2",
  );
});

Deno.test("encodePNG() correctly encoding png signature", async () => {
  assertEquals(
    (await encodePNG(new Uint8Array(4), {
      width: 1,
      height: 1,
      compression: 0,
      filter: 0,
      interlace: 0,
    })).subarray(0, 8),
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
});

Deno.test("encodePNG() correctly produces IHDR chunk", async () => {
  const buffer = await encodePNG(Uint8Array.from([0, 0, 0, 255]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      const length = view.getUint32(i);
      assertEquals(length, 13);
      assertEquals(view.getUint32(i + 8), 1);
      assertEquals(view.getUint32(i + 8 + 4), 1);
      assertEquals(buffer[i + 8 + 4 + 4 + 2], 0);
      assertEquals(buffer[i + 8 + 4 + 4 + 3], 0);
      assertEquals(buffer[i + 8 + 4 + 4 + 4], 0);
      assertEquals(
        calcCRC(buffer.subarray(i + 4, i + 8 + length)),
        view.getUint32(i + 8 + length),
      );
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() correctly produces IEND chunk", async () => {
  const buffer = await encodePNG(Uint8Array.from([0, 0, 0, 255]), {
    width: 1,
    height: 1,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIEND = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 69 &&
      buffer[i + 6] == 78 &&
      buffer[i + 7] == 68
    ) {
      foundIEND = true;
      const length = view.getUint32(i);
      assertEquals(length, 0);
      assertEquals(
        calcCRC(buffer.subarray(i + 4, i + 8 + length)),
        view.getUint32(i + 8 + length),
      );
      break;
    }
  }
  assertEquals(foundIEND, true);
});

Deno.test("encodePNG() correctly produces grayscale images", async () => {
  const buffer = await encodePNG(new Uint8Array(256 * 256 * 4).fill(255), {
    width: 256,
    height: 256,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 0);
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() correctly produces grayscale images with tRNS", async () => {
  const input = new Uint8Array(256 * 256 * 4).fill(255);
  input.set([0, 0, 0, 0], 0);
  const buffer = await encodePNG(input, {
    width: 256,
    height: 256,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  let foundtRNS = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 0);
    } else if (
      buffer[i + 4] == 116 &&
      buffer[i + 5] == 82 &&
      buffer[i + 6] == 78 &&
      buffer[i + 7] == 83
    ) {
      foundtRNS = true;
      assertEquals(view.getUint32(i), 2);
    }
    if (foundIHDR && foundtRNS) break;
  }
  assertEquals(foundIHDR, true);
  assertEquals(foundtRNS, true);
});

Deno.test("encodePNG() correctly produces grayscale alpha images", async () => {
  const buffer = await encodePNG(new Uint8Array(256 * 256 * 4).fill(254), {
    width: 256,
    height: 256,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 4);
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() correctly produces grayscale alpha images instead of tRNS", async () => {
  const buffer = await encodePNG(new Uint8Array(256 * 256 * 4).fill(254), {
    width: 256,
    height: 256,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 4);
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() correctly produces indexed images", async () => {
  const buffer = await encodePNG(
    Uint8Array.from(
      new Array(256 * 256)
        .fill(0)
        .map((_, i) => i % 2 ? [255, 0, 0, 255] : [255, 0, 255, 255])
        .flat(),
    ),
    {
      width: 256,
      height: 256,
      compression: 0,
      filter: 0,
      interlace: 0,
    },
  );
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 3);
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() correctly produces truecolor images", async () => {
  const buffer = await encodePNG(
    Uint8Array.from(
      new Array(256 * 256)
        .fill(0)
        .map((_, i) => {
          const r = i / 256 | 0;
          const c = i % 256;
          return [255 - r, r, c, 255];
        })
        .flat(),
    ),
    {
      width: 256,
      height: 256,
      compression: 0,
      filter: 0,
      interlace: 0,
    },
  );
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 2);
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() correctly produces truecolor images with tRNS", async () => {
  const input = Uint8Array.from(
    new Array(256 * 256)
      .fill(0)
      .map((_, i) => {
        const r = i / 256 | 0;
        const c = i % 256;
        return [255 - r, r, c, 255];
      })
      .flat(),
  );
  input[3] = 0;
  const buffer = await encodePNG(input, {
    width: 256,
    height: 256,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  let foundtRNS = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 2);
    } else if (
      buffer[i + 4] == 116 &&
      buffer[i + 5] == 82 &&
      buffer[i + 6] == 78 &&
      buffer[i + 7] == 83
    ) {
      foundtRNS = true;
      assertEquals(view.getUint32(i), 6);
    }
    if (foundIHDR && foundtRNS) break;
  }
  assertEquals(foundIHDR, true);
  assertEquals(foundtRNS, true);
});

Deno.test("encodePNG() correctly produces truecolor alpha images", async () => {
  const buffer = await encodePNG(
    Uint8Array.from(
      new Array(256 * 256)
        .fill(0)
        .map((_, i) => {
          const r = i / 256 | 0;
          const c = i % 256;
          return [255 - r, r, c, 254];
        })
        .flat(),
    ),
    {
      width: 256,
      height: 256,
      compression: 0,
      filter: 0,
      interlace: 0,
    },
  );
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let foundIHDR = false;
  for (let i = 8; i < buffer.length; i += 12 + view.getUint32(i)) {
    if (
      buffer[i + 4] == 73 &&
      buffer[i + 5] == 72 &&
      buffer[i + 6] == 68 &&
      buffer[i + 7] == 82
    ) {
      foundIHDR = true;
      assertEquals(buffer[i + 17], 6);
      break;
    }
  }
  assertEquals(foundIHDR, true);
});

Deno.test("encodePNG() aborts", async () => {
  const controller = new AbortController();
  controller.abort(new TypeError("POTATO"));

  await assertRejects(
    () =>
      encodePNG(new Uint8Array(4), {
        width: 1,
        height: 1,
        compression: 0,
        filter: 0,
        interlace: 0,
      }, controller.signal),
    TypeError,
    "POTATO",
  );
});
