import { SITE } from "@ibtatech/config";
import { listPublishedBlogPosts } from "@ibtatech/leads";
import { renderBlogRss } from "@/lib/blog/rss";

/**
 * RSS 2.0 feed for the blog (Phase 25). Same published-only read as the
 * public pages, so a draft can never leak through a different surface.
 */
export const revalidate = 60;

export async function GET(): Promise<Response> {
  const posts = await listPublishedBlogPosts();
  const xml = renderBlogRss(posts, SITE.url);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
