import { build, stop } from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

async function esbuild(
  input: string,
  output: string,
): Promise<void> {
  const { errors, warnings } = await build({
    plugins: denoPlugins(),
    entryPoints: [input],
    outfile: output,
    format: "esm",
    sourcemap: "inline",
    bundle: true,
    minify: true,
  });
  errors.forEach((error) => console.error(error));
  warnings.forEach((warning) => console.warn(warning));
}

await Deno.mkdir("localhost/static/js/", { recursive: true });
await esbuild("localhost/static/ts/main.ts", "localhost/static/js/main.js");

stop();
