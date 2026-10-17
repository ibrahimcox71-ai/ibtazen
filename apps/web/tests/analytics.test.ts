import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Plausible hookup for the shared analytics vocabulary (check.md #9, #18).
 * An event reaches the provider only once its script installed
 * `window.plausible`; props stay a closed, non-identifying vocabulary; and the
 * per-page-load dedup set survives the forwarding.
 */

type WindowWithPlausible = { plausible?: unknown };

function setWindow(plausible?: unknown): void {
  (globalThis as { window?: WindowWithPlausible }).window = plausible ? { plausible } : {};
}

function getWindow(): WindowWithPlausible | undefined {
  return (globalThis as { window?: WindowWithPlausible }).window;
}

async function loadTracker() {
  // Fresh module = fresh dedup set, so tests cannot leak keys into each other.
  vi.resetModules();
  return import("@ibtatech/ui/analytics");
}

beforeEach(() => setWindow());
afterEach(() => {
  delete (globalThis as { window?: WindowWithPlausible }).window;
  vi.restoreAllMocks();
});

describe("event forwarding", () => {
  it("forwards a lead-form event with only its coarse source", async () => {
    const plausible = vi.fn();
    setWindow(plausible);
    const { trackLeadFormStarted } = await loadTracker();

    trackLeadFormStarted("contact");

    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("lead_form_started", {
      props: { source: "contact" },
    });
  });

  it("keeps the one-shot dedup that the vocabulary promises", async () => {
    const plausible = vi.fn();
    setWindow(plausible);
    const { trackLeadFormCompleted } = await loadTracker();

    trackLeadFormCompleted("estimate");
    trackLeadFormCompleted("estimate");
    trackLeadFormCompleted("contact"); // different key — still worth sending

    expect(plausible).toHaveBeenCalledTimes(2);
  });

  it("sends every failure, clamped to a prop-sized error code", async () => {
    const plausible = vi.fn();
    setWindow(plausible);
    const { trackLeadFormFailed } = await loadTracker();

    trackLeadFormFailed("contact", "invalid");
    trackLeadFormFailed("contact", "x".repeat(200));

    expect(plausible).toHaveBeenCalledTimes(2);
    expect(plausible).toHaveBeenNthCalledWith(1, "lead_form_failed", {
      props: { source: "contact", error: "invalid" },
    });
    const secondProps = plausible.mock.calls[1]?.[1]?.props as { error: string };
    expect(secondProps.error).toHaveLength(64);
  });

  it("labels estimate steps and CTA clicks without free text", async () => {
    const plausible = vi.fn();
    setWindow(plausible);
    const { trackCta, trackEstimateStep } = await loadTracker();

    trackEstimateStep(3);
    trackCta("hero-primary");

    expect(plausible).toHaveBeenNthCalledWith(1, "estimate_step_completed", {
      props: { step: 3 },
    });
    expect(plausible).toHaveBeenNthCalledWith(2, "cta_clicked", {
      props: { cta: "hero-primary" },
    });
  });
});

describe("provider absent", () => {
  it("stays silent — and never throws — before the script loads", async () => {
    const { trackLeadFormStarted } = await loadTracker();

    expect(getWindow()?.plausible).toBeUndefined();
    expect(() => trackLeadFormStarted("contact")).not.toThrow();
  });

  it("ignores a window.plausible that is not a function", async () => {
    setWindow([]); // the script's pre-load queue, not a callable
    const { trackCta } = await loadTracker();

    expect(() => trackCta("footer-cta")).not.toThrow();
  });
});
