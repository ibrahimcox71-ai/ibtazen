import { describe, expect, it } from "vitest";
import { renderLlmsTxt } from "@ibtatech/config";
import { GET } from "@/app/llms.txt/route";

/**
 * GEO/AEO entry point. The assertions are deliberately about facts the site
 * already publishes: if a claim here is not on a page, the test fails.
 */

const body = renderLlmsTxt();

describe("llms.txt content", () => {
  it("opens with the organisation heading and a quotable summary", () => {
    expect(body.startsWith("# Ibtatech")).toBe(true);
    expect(body).toContain("digital technology and growth agency");
    expect(body).toContain("Ibtatech Ltd");
    expect(body).toContain("hello@ibtatech.com");
    expect(body).toContain("https://ibtatech.com/book");
  });

  it("lists every service with an absolute, citable URL", () => {
    for (const slug of [
      "/services/web-development",
      "/services/mobile-app-development",
      "/services/email-marketing",
      "/services/paid-advertising",
    ]) {
      expect(body).toContain(`https://ibtatech.com${slug}`);
    }
    expect(body).toContain("## Services");
  });

  it("renders the engagement process and positioning facts as lists", () => {
    expect(body).toContain("## How an engagement works");
    expect(body).toContain("**Discovery call**");
    expect(body).toContain("## Why teams choose us");
    expect(body).toContain("**You own everything**");
  });

  it("answers the global FAQs as extractable Q&A headings", () => {
    expect(body).toContain("## Frequently asked questions");
    expect(body).toContain("### What does Ibtatech do?");
    expect(body).toContain("### How much does a project cost?");
    expect(body).toContain("### Where do you work with clients?");
  });

  it("points at the canonical pages and legal documents", () => {
    expect(body).toContain("## Key pages");
    expect(body).toContain("https://ibtatech.com/case-studies");
    expect(body).toContain("https://ibtatech.com/faq");
    expect(body).toContain("## Optional");
    expect(body).toContain("https://ibtatech.com/privacy");
    expect(body).toContain("https://ibtatech.com/sitemap.xml");
  });

  it("never invents metrics, clients or awards", () => {
    expect(body).not.toMatch(/award|winner|certified|guaranteed results/i);
    expect(body).not.toMatch(/\d+% (increase|growth|roi)/i);
  });
});

describe("GET /llms.txt", () => {
  it("serves markdown as plain text with a cache header", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toBeTruthy();
    const text = await response.text();
    expect(text.startsWith("# Ibtatech")).toBe(true);
    expect(text).toContain("## Frequently asked questions");
  });
});
