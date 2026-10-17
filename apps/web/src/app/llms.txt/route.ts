import { renderLlmsTxt } from "@ibtatech/config";

/**
 * `/llms.txt` — a markdown index of the site for AI answer engines, following
 * llmstxt.org. Discovery is by convention (same as `/robots.txt`); the body is
 * rendered from `packages/config` so it always matches the live pages.
 */

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return new Response(renderLlmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
