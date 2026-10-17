"use client";

/**
 * Analytics — typed, private-by-design event vocabulary. No PII: events carry
 * only which flow, which step, and coarse outcome. The provider is Plausible
 * (cookieless — see `packages/config/analytics.ts`); the site layout loads its
 * script only where a site is configured, so here we simply forward each event
 * through `window.plausible` when that script is present. No script, no call:
 * local dev and analytics-free deployments stay silent without a flag.
 */

declare global {
  interface Window {
    /** Queue installed by the Plausible script the site layout injects. */
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
  }
}

export type LeadEvent =
  | { type: "lead_form_started"; source: string }
  | { type: "lead_form_completed"; source: string }
  | { type: "lead_form_failed"; source: string; error: string }
  | { type: "estimate_step_completed"; step: number }
  | { type: "cta_clicked"; cta: string };

const dispatched = new Set<string>();

/** Dedup by event key — fires at most once per key per page load. */
function eventKey(event: LeadEvent): string {
  switch (event.type) {
    case "estimate_step_completed":
      return `${event.type}:${event.step}`;
    case "cta_clicked":
      return `${event.type}:${event.cta}`;
    case "lead_form_failed":
      // A failed attempt may legitimately retry (e.g. fixing validation),
      // so failures are not deduped like one-shot lifecycle events.
      return "";
    default:
      return `${event.type}:${event.source}`;
  }
}

/**
 * Custom-event props — a closed vocabulary of coarse values. Nothing here
 * identifies a person: no URLs with query strings, no form contents, no
 * free-text beyond a clamped error code.
 */
function eventProps(event: LeadEvent): Record<string, string | number> {
  switch (event.type) {
    case "estimate_step_completed":
      return { step: event.step };
    case "cta_clicked":
      return { cta: event.cta };
    case "lead_form_failed":
      return { source: event.source, error: event.error.slice(0, 64) };
    default:
      return { source: event.source };
  }
}

function dispatch(event: LeadEvent): void {
  const key = eventKey(event);
  if (key !== "") {
    if (dispatched.has(key)) return;
    dispatched.add(key);
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible(event.type, { props: eventProps(event) });
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event);
  }
}

export function trackLeadFormStarted(source: string): void {
  dispatch({ type: "lead_form_started", source });
}

export function trackLeadFormCompleted(source: string): void {
  dispatch({ type: "lead_form_completed", source });
}

export function trackLeadFormFailed(source: string, error: string): void {
  dispatch({ type: "lead_form_failed", source, error });
}

export function trackEstimateStep(step: number): void {
  dispatch({ type: "estimate_step_completed", step });
}

export function trackCta(cta: string): void {
  dispatch({ type: "cta_clicked", cta });
}
