import { decodePNG, encodePNG } from "@img/png";
import { decodeQOI, encodeQOI } from "@img/qoi";

const width = 256;
const height = 256;
function getData(): Promise<Uint8Array<ArrayBuffer>> {
  return new Response(
    ReadableStream.from(function* (): Generator<Uint8Array<ArrayBuffer>> {
      for (let r = 0; r < width; ++r) {
        for (let c = 0; c < height; ++c) {
          yield Uint8Array.from([255 - r, c, r, 255]);
        }
      }
    }()),
  )
    .bytes() as Promise<Uint8Array<ArrayBuffer>>;
}

const RAW_INPUT = await getData();
const QOI_ENCODED = encodeQOI(RAW_INPUT.slice(), {
  width,
  height,
  channels: "rgba",
  colorspace: 0,
});

const PNG_ENCODED = await encodePNG(RAW_INPUT.slice(), {
  width,
  height,
  compression: 0,
  filter: 0,
  interlace: 0,
});

Deno.bench({ name: "QOI", group: "encode" }, () => {
  encodeQOI(RAW_INPUT.slice(), {
    width,
    height,
    channels: "rgba",
    colorspace: 0,
  });
});

Deno.bench({ name: "PNG", group: "encode" }, async () => {
  await encodePNG(RAW_INPUT.slice(), {
    width,
    height,
    compression: 0,
    filter: 0,
    interlace: 0,
  });
});

Deno.bench({ name: "QOI", group: "decode" }, () => {
  decodeQOI(QOI_ENCODED.slice());
});

Deno.bench({ name: "PNG", group: "decode" }, async () => {
  await decodePNG(PNG_ENCODED.slice());
});
