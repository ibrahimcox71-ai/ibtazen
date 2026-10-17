import { getSiteSettings } from "@ibtatech/leads";
import { SITE_ASSET_FILENAME_PATTERN } from "@ibtatech/leads/domain";
import { readBrandImage, readDefaultFavicon } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const IMMUTABLE = "public, max-age=31536000, immutable";
/** The alias changes identity on every upload — never let a browser hold it. */
const ALIAS = "public, max-age=300, must-revalidate";

/**
 * Brand bytes. A generated key serves that file; the bare `favicon` alias
 * serves whatever the settings row points at and falls back to the bundled
 * `/favicon.svg`, so the URL declared in the root metadata always resolves.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!file) return new Response("Not found", { status: 404 });

  let image: { bytes: Uint8Array; contentType: string } | null = null;
  let cacheControl = IMMUTABLE;

  if (file === "favicon") {
    cacheControl = ALIAS;
    const { faviconPath } = await getSiteSettings();
    if (faviconPath && SITE_ASSET_FILENAME_PATTERN.test(faviconPath)) {
      image = await readBrandImage(faviconPath);
    }
    if (!image) image = await readDefaultFavicon();
  } else if (SITE_ASSET_FILENAME_PATTERN.test(file)) {
    image = await readBrandImage(file);
  }

  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Uint8Array.from(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.byteLength),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
