import { describe, expect, it } from "vitest";
import { renderBlogRss, xmlEscape } from "@/lib/blog/rss";
import type { PublishedBlogPost } from "@ibtatech/leads";

/**
 * The feed is consumed by third-party readers — well-formed XML and escaped
 * values are the whole contract.
 */

function post(overrides: Partial<PublishedBlogPost> = {}): PublishedBlogPost {
  return {
    id: "c1",
    slug: "shipping-a-faster-checkout",
    title: "Shipping a faster checkout",
    excerpt: "What we measured when the checkout journey was rebuilt.",
    content: "A rebuilt checkout changes more than the buttons.",
    tags: ["cro", "checkout"],
    publishedAt: new Date("2026-09-01T09:00:00.000Z"),
    readingMinutes: 4,
    updatedAt: new Date("2026-09-02T09:00:00.000Z"),
    imagePath: null,
    imageAlt: null,
    videoEmbedUrl: null,
    ...overrides,
  };
}

const SITE = "https://ibtatech.com";

describe("xmlEscape", () => {
  it("escapes every character that can break a node", () => {
    expect(xmlEscape(`Tom & Jerry <b>"x"</b> 'y'`)).toBe(
      "Tom &amp; Jerry &lt;b&gt;&quot;x&quot;&lt;/b&gt; &apos;y&apos;",
    );
  });
});

describe("renderBlogRss", () => {
  it("produces a well-formed channel with one item per published post", () => {
    const xml = renderBlogRss([post()], SITE, new Date("2026-09-10T12:00:00.000Z"));

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<title>Ibtatech blog</title>");
    expect(xml).toContain(`<link>${SITE}/blog</link>`);
    expect(xml).toContain(`href="${SITE}/blog/rss.xml" rel="self"`);
    expect(xml).toContain("<lastBuildDate>Thu, 10 Sep 2026 12:00:00 GMT</lastBuildDate>");
    expect(xml).toContain(`<title>Shipping a faster checkout</title>`);
    expect(xml).toContain(`<link>${SITE}/blog/shipping-a-faster-checkout</link>`);
    expect(xml).toContain(
      `<guid isPermaLink="true">${SITE}/blog/shipping-a-faster-checkout</guid>`,
    );
    expect(xml).toContain("<pubDate>Tue, 01 Sep 2026 09:00:00 GMT</pubDate>");
    expect(xml).toContain("<category>cro</category>");
    expect(xml).toContain("<category>checkout</category>");
    expect(xml).toContain("</channel>");
    expect(xml.trimEnd().endsWith("</rss>")).toBe(true);
  });

  it("sorts newest first and caps the feed", () => {
    const posts = Array.from({ length: 25 }, (_, index) =>
      post({
        id: `c${index}`,
        slug: `post-${index}`,
        title: `Post ${index}`,
        publishedAt: new Date(Date.UTC(2026, 0, index + 1)),
      }),
    );

    const xml = renderBlogRss(posts, SITE, new Date("2026-09-10T12:00:00.000Z"));
    const links = [...xml.matchAll(/<link>(https:\/\/ibtatech\.com\/blog\/post-\d+)<\/link>/g)].map(
      (match) => match[1],
    );

    expect(links).toHaveLength(20);
    expect(links[0]).toBe(`${SITE}/blog/post-24`);
    expect(links.at(-1)).toBe(`${SITE}/blog/post-5`);
  });

  it("escapes titles and drops unpublished rows", () => {
    const xml = renderBlogRss(
      [
        post({ id: "a", title: "Ampersand & <script>" }),
        post({ id: "b", slug: "draft", publishedAt: null }),
      ],
      SITE,
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(xml).toContain("<title>Ampersand &amp; &lt;script&gt;</title>");
    expect(xml).not.toContain("draft");
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });

  it("falls back to the body when an excerpt is empty", () => {
    const xml = renderBlogRss(
      [post({ excerpt: "", content: "The body supplies this summary." })],
      SITE,
      new Date("2026-09-10T12:00:00.000Z"),
    );
    expect(xml).toContain("The body supplies this summary.");
  });
});
