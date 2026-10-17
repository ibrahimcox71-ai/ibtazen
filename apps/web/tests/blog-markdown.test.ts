import { describe, expect, it } from "vitest";
import {
  blogPlainText,
  clampText,
  headingAnchor,
  parseBlogContent,
  parseInline,
  safeHref,
} from "@/lib/blog/markdown";

/**
 * The article body is user-authored Markdown. These assertions lock the two
 * properties that matter: the subset renders predictably, and hostile input
 * (raw HTML, `javascript:` links) stays inert text.
 */

describe("safeHref", () => {
  it("accepts site-relative and well-known absolute targets", () => {
    expect(safeHref("/services")).toBe("/services");
    expect(safeHref("https://example.com/a?b=c")).toBe("https://example.com/a?b=c");
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("mailto:hello@ibtatech.com")).toBe("mailto:hello@ibtatech.com");
  });

  it("drops script and protocol-relative targets", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JavaScript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });
});

describe("parseInline", () => {
  it("reads emphasis, code spans and links", () => {
    expect(parseInline("a **b** *c* `d`")).toEqual([
      { type: "text", value: "a " },
      { type: "strong", children: [{ type: "text", value: "b" }] },
      { type: "text", value: " " },
      { type: "em", children: [{ type: "text", value: "c" }] },
      { type: "text", value: " " },
      { type: "code", value: "d" },
    ]);

    expect(parseInline("read [docs](/faq) now")).toEqual([
      { type: "text", value: "read " },
      { type: "link", href: "/faq", children: [{ type: "text", value: "docs" }] },
      { type: "text", value: " now" },
    ]);
  });

  it("keeps unsafe link targets as plain text", () => {
    expect(parseInline("[click](javascript:alert(1))")).toEqual([
      { type: "text", value: "[click](javascript:alert(1))" },
    ]);
  });

  it("leaves raw HTML as visible text", () => {
    expect(parseInline('<img src=x onerror="alert(1)">')).toEqual([
      { type: "text", value: '<img src=x onerror="alert(1)">' },
    ]);
  });

  it("does not treat an unmatched marker as emphasis", () => {
    expect(parseInline("5 * 3 = 15")).toEqual([{ type: "text", value: "5 * 3 = 15" }]);
    expect(parseInline("**unclosed")).toEqual([{ type: "text", value: "**unclosed" }]);
    expect(parseInline("a * b ** c")).toEqual([{ type: "text", value: "a * b ** c" }]);
  });
});

describe("parseBlogContent", () => {
  it("splits the block subset", () => {
    const blocks = parseBlogContent(
      [
        "## Intro",
        "",
        "First paragraph",
        "still the first paragraph.",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
        "",
        "> quoted line",
        "",
        "```ts",
        "const x = 1;",
        "```",
        "",
        "---",
      ].join("\n"),
    );

    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "list",
      "quote",
      "code",
      "hr",
    ]);
    expect(blocks[0]).toMatchObject({ level: 2, id: "intro" });
    expect(blocks[1]).toMatchObject({
      children: [{ type: "text", value: "First paragraph still the first paragraph." }],
    });
    expect(blocks[2]).toMatchObject({ ordered: false });
    expect(blocks[3]).toMatchObject({ ordered: true });
    expect(blocks[5]).toMatchObject({ language: "ts", code: "const x = 1;" });
  });

  it("gives every heading a stable anchor id", () => {
    expect(headingAnchor("What & why?")).toBe("what-why");
    expect(headingAnchor("**Bold** heading")).toBe("bold-heading");

    const [heading] = parseBlogContent("### The 4-step rollout");
    expect(heading).toMatchObject({ level: 3, id: "the-4-step-rollout" });
  });

  it("treats an unclosed fence as a code block rather than prose", () => {
    const blocks = parseBlogContent("```js\nalert('hi')");
    expect(blocks).toEqual([{ type: "code", language: "js", code: "alert('hi')" }]);
  });

  it("degrades blank and prose-only input to paragraphs", () => {
    expect(parseBlogContent("")).toEqual([]);
    expect(parseBlogContent("   \n\n")).toEqual([]);
    expect(parseBlogContent("Just a sentence.")).toEqual([
      { type: "paragraph", children: [{ type: "text", value: "Just a sentence." }] },
    ]);
  });

  it("handles Windows line endings", () => {
    expect(parseBlogContent("## Title\r\n\r\nBody")).toMatchObject([
      { type: "heading", level: 2 },
      { type: "paragraph" },
    ]);
  });
});

describe("plain text helpers", () => {
  it("flattens a body for summaries", () => {
    const text = blogPlainText(
      ["## Why it matters", "", "We rebuilt the checkout.", "- faster", "- clearer"].join("\n"),
    );
    expect(text).toBe("Why it matters We rebuilt the checkout. faster clearer");
  });

  it("clamps on a word boundary", () => {
    expect(clampText("short one", 100)).toBe("short one");
    const long = "the quick brown fox jumps over the lazy dog again";
    expect(clampText(long, 20)).toBe("the quick brown…");
    expect(clampText(long, 20).length).toBeLessThanOrEqual(20);
  });
});
