import type { PublishedBlogPost } from "@ibtatech/leads";
import { blogPlainText, clampText } from "./markdown";

/**
 * RSS 2.0 feed for `/blog/rss.xml` (Phase 25). Built as data, not string
 * interpolation of raw markup: every value passes through `xmlEscape`, and
 * descriptions come from the plain-text rendering of the stored body, so a
 * post can never break out of the feed or ship an HTML payload.
 */

const CHANNEL_TITLE = "Ibtatech blog";
const CHANNEL_DESCRIPTION =
  "Practical notes on web, mobile, growth and the engineering behind both — from the Ibtatech team.";
const CHANNEL_LIMIT = 20;

/** Escape the five XML entities (plus apostrophe for attribute safety). */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 822 date — the format RSS readers expect. */
function rfc822(date: Date): string {
  return date.toUTCString();
}

function item(post: PublishedBlogPost, siteUrl: string): string {
  const url = `${siteUrl}/blog/${post.slug}`;
  const summary = clampText(post.excerpt || blogPlainText(post.content), 300);
  const published = post.publishedAt ?? post.updatedAt;
  const categories = post.tags
    .map((tag) => `    <category>${xmlEscape(tag)}</category>`)
    .join("\n");

  return [
    "  <item>",
    `    <title>${xmlEscape(post.title)}</title>`,
    `    <link>${xmlEscape(url)}</link>`,
    `    <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
    `    <pubDate>${rfc822(published)}</pubDate>`,
    `    <description>${xmlEscape(summary)}</description>`,
    categories,
    "  </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Render the whole feed — newest first, capped at `CHANNEL_LIMIT` items. */
export function renderBlogRss(
  posts: readonly PublishedBlogPost[],
  siteUrl: string,
  now: Date = new Date(),
): string {
  const items = [...posts]
    .filter((post) => post.publishedAt)
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, CHANNEL_LIMIT)
    .map((post) => item(post, siteUrl));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xmlEscape(CHANNEL_TITLE)}</title>`,
    `    <link>${xmlEscape(`${siteUrl}/blog`)}</link>`,
    `    <description>${xmlEscape(CHANNEL_DESCRIPTION)}</description>`,
    "    <language>en-gb</language>",
    `    <lastBuildDate>${rfc822(now)}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(`${siteUrl}/blog/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    items.join("\n"),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
