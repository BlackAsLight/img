import { extname } from "@std/path/extname";
import { decodePNG, encodePNG } from "@img/png";
import { decodeQOI, encodeQOI } from "@img/qoi";

document.querySelector<HTMLFormElement>("form")
  ?.addEventListener("submit", async function (event): Promise<void> {
    event.preventDefault();
    if (event.submitter == undefined) return;
    const inputTag = event.submitter as HTMLInputElement;
    const files = this
      .querySelector<HTMLInputElement>('input[type="file"]')!.files;
    if (files == undefined) return;

    this
      .querySelectorAll<HTMLInputElement>("input")
      .forEach((tag) => tag.disabled = true);

    for (const file of files) {
      try {
        console.log(file.name, file.type);
        const url = URL.createObjectURL(
          await new Response(await encode(inputTag, ...await decode(file)))
            .blob(),
        );
        const aTag = document.createElement("a");
        aTag.href = url;
        aTag.download = file.name.slice(0, -extname(file.name).length) +
          newExt(inputTag);
        aTag.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
      }
    }

    this.querySelector<HTMLInputElement>('input[type="file"]')!.value = "";
    this
      .querySelectorAll<HTMLInputElement>("input")
      .forEach((tag) => tag.disabled = false);
  });

async function decode(
  file: File,
): Promise<[Uint8Array<ArrayBuffer>, number, number]> {
  switch (file.type ?? extname(file.name)) {
    case ".png":
    case "image/png": {
      const x = await decodePNG(await file.bytes() as Uint8Array<ArrayBuffer>);
      return [x.body, x.header.width, x.header.height];
    }
    default: {
      const x = decodeQOI(await file.bytes() as Uint8Array<ArrayBuffer>);
      return [x.body, x.header.width, x.header.height];
    }
  }
}

async function encode(
  inputTag: HTMLInputElement,
  input: Uint8Array<ArrayBuffer>,
  width: number,
  height: number,
): Promise<Uint8Array<ArrayBuffer>> {
  switch (inputTag.value) {
    case "PNG":
      return await encodePNG(input, {
        width,
        height,
        compression: 0,
        filter: 0,
        interlace: 0,
      });
    default:
      return encodeQOI(input, {
        width,
        height,
        channels: "rgba",
        colorspace: 0,
      });
  }
}

function newExt(inputTag: HTMLInputElement): string {
  switch (inputTag.value) {
    case "PNG":
      return ".png";
    default:
      return ".qoi";
  }
}
