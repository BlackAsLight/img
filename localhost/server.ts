import { contentType } from "@std/media-types";
import { extname, join } from "@std/path";

Deno.serve({ port: 3000 }, async (request) => {
  const url = new URL(request.url);
  let path = join("localhost/static/", url.pathname);
  let stats = await Deno.stat(path).catch(() => null);
  if (stats?.isDirectory) {
    path = join(path, "index.html");
    stats = await Deno.stat(path).catch(() => null);
  }
  if (stats == null || !stats.isFile) path = "localhost/static/404.html";
  return new Response((await Deno.open(path)).readable, {
    headers: {
      "Content-Type": contentType(extname(path) ?? "") ?? "",
    },
  });
});
