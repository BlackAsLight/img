/**
 * This is a TypeScript implementation of the PNG image format. The module
 * offers encoding and decoding abilities. The raw pixel format/ the decoded
 * format is a repeating sequence of `[ r, g, b, a ]` in a `Uint8Array`, or
 * `Uint8ClampedArray`.
 *
 * This implementation is based off the
 * [PNG Specification](https://www.w3.org/TR/2003/REC-PNG-20031110/).
 *
 * @example
 * ```ts
 * import { encodePNG } from "@img/png";
 *
 * await Deno.mkdir(".output/", { recursive: true });
 *
 * const rawData = await new Response(ReadableStream.from(async function* () {
 *   for (let r = 0; r < 256; ++r) {
 *     for (let c = 0; c < 256; ++c) {
 *       yield Uint8Array.from([255 - r, c, r, 255]);
 *     }
 *   }
 * }())).bytes();
 *
 * await Deno.writeFile(".output/mod.png", await encodePNG(rawData, {
 *   width: 256,
 *   height: 256,
 *   compression: 0,
 *   filter: 0,
 *   interlace: 0,
 * }));
 * ```
 *
 * @module
 */

export * from "./decode/mod.ts";
export * from "./encode/mod.ts";
export * from "./types.ts";
