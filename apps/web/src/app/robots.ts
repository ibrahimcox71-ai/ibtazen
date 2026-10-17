import type { MetadataRoute } from "next";
import { absoluteUrl } from "@ibtatech/config";

/**
 * `/llms.txt` cannot be advertised here: Next's `Robots` type (v16.3.5) has no
 * `llmsTxt` field and the generated file has no comment syntax, so a pointer to
 * it would be dropped. Discovery is by convention instead — llmstxt.org places
 * it at the site root, exactly like `/robots.txt`, which is what
 * `apps/web/src/app/llms.txt/route.ts` serves.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
