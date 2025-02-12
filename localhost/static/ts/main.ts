import { extname } from "@std/path/extname";
import { encodeQOI } from "@img/qoi/encode";

document.querySelector("form")
  ?.addEventListener("submit", async function (event): Promise<void> {
    event.preventDefault();
    const [encoder, ext] = getEncoder(
      event.submitter as HTMLInputElement | null,
    ) ?? [];
    if (encoder == undefined) return;
    const inputTag = this
      .querySelector<HTMLInputElement>('input[type="file"]');
    if (inputTag?.files == undefined) return;

    this
      .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")
      .forEach((tag) => tag.disabled = true);

    for (const file of inputTag.files) {
      console.log(file.name);
      try {
        const url = URL.createObjectURL(
          await new Response(await encoder(...await fileToInput(file)))
            .blob(),
        );
        const aTag = document.createElement("a");
        aTag.href = url;
        aTag.download = file.name.slice(0, -extname(file.name).length) + ext;
        aTag.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
      }
    }

    inputTag.value = "";
    this
      .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")
      .forEach((tag) => tag.disabled = false);
  });

function getEncoder(
  inputTag: HTMLInputElement | null,
): undefined | [
  (
    input: Uint8ClampedArray,
    width: number,
    height: number,
  ) => Uint8Array | Promise<Uint8Array>,
  string,
] {
  switch (inputTag?.value) {
    case "QOI":
      return [function (
        input: Uint8ClampedArray,
        width: number,
        height: number,
      ): Uint8Array {
        return encodeQOI(input, {
          width,
          height,
          channels: "rgba",
          colorspace: 0,
        });
      }, ".qoi"];
    default:
      return;
  }
}

async function fileToInput(
  file: File,
): Promise<[Uint8ClampedArray, number, number]> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await image.decode();
  const width = image.width;
  const height = image.height;

  const canvasTag = document.createElement("canvas");
  canvasTag.width = width;
  canvasTag.height = height;
  const context = canvasTag.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const input = context.getImageData(0, 0, width, height).data;

  URL.revokeObjectURL(url);
  return [input, width, height];
}
