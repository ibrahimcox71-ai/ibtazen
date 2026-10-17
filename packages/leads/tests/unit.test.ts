import { describe, expect, it } from "vitest";
import { canTransition, isLeadSource, isTimeline } from "../src/domain";
import { isBudgetBand } from "../src/budgets";
import { parseLeadPayload } from "../src/validation";
import { checkRateLimit, RateLimitError, resetRateLimiter } from "../src/rate-limit";

describe("lead status transitions", () => {
  it("permits the documented happy path", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("contacted", "qualified")).toBe(true);
    expect(canTransition("qualified", "proposal")).toBe(true);
    expect(canTransition("proposal", "won")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(canTransition("new", "won")).toBe(false);
    expect(canTransition("won", "lost")).toBe(false);
    expect(canTransition("spam", "new")).toBe(false);
  });

  it("allows re-engagement from lost", () => {
    expect(canTransition("lost", "contacted")).toBe(true);
  });
});

describe("enum guards", () => {
  it("validates sources", () => {
    expect(isLeadSource("contact")).toBe(true);
    expect(isLeadSource("website-audit")).toBe(true);
    expect(isLeadSource("admin")).toBe(false);
  });

  it("validates timelines", () => {
    expect(isTimeline("asap")).toBe(true);
    expect(isTimeline("tomorrow")).toBe(false);
  });

  it("validates budget bands", () => {
    expect(isBudgetBand("50k-100k")).toBe(true);
    expect(isBudgetBand("millions")).toBe(false);
  });
});

describe("parseLeadPayload (boundary validation)", () => {
  it("accepts a valid international lead", () => {
    const r = parseLeadPayload({
      name: "Müller & Söhne GmbH",
      email: "sales@muller-sohne.de",
      message: "Wir brauchen eine neue B2B-Plattform mit Anbindung an unser ERP.",
      consent: true,
    });
    expect(r.success).toBe(true);
  });

  it("normalises and accepts bare domains", () => {
    const r = parseLeadPayload({
      name: "Example Co",
      email: "a@example.com",
      website: "Example.co.uk/path/?utm_source=x&fbclid=y",
      message: "Please audit our current site performance and SEO.",
      consent: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBe("https://example.co.uk/path");
  });

  it("rejects javascript: and data: URLs", () => {
    const r = parseLeadPayload({
      name: "Evil Corp",
      email: "e@example.com",
      website: "javascript:alert(1)",
      message: "Please audit our current site performance and SEO.",
      consent: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejects oversized payloads", () => {
    const r = parseLeadPayload({
      name: "X".repeat(200),
      email: "x@example.com",
      message: "y".repeat(6000),
      consent: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing consent", () => {
    const r = parseLeadPayload({
      name: "No Consent",
      email: "nc@example.com",
      message: "Please audit our current site performance and SEO.",
      consent: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects honeypot-filled submissions", () => {
    const r = parseLeadPayload({
      name: "Bot",
      email: "bot@example.com",
      message: "Please audit our current site performance and SEO.",
      consent: true,
      _gotcha: "http://spam.example",
    });
    expect(r.success).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows five then throws", () => {
    resetRateLimiter();
    for (let i = 0; i < 5; i++) expect(() => checkRateLimit("k1")).not.toThrow();
    expect(() => checkRateLimit("k1")).toThrow(RateLimitError);
    expect(() => checkRateLimit("k2")).not.toThrow();
  });
});
