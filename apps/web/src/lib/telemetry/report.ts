"use client";

/**
 * Client-side error reporter - the browser half of the observability seam.
 *
 * `error.tsx` / `global-error.tsx` call `reportWebError`; it normalises the
 * throw, suppresses repeats (dedupe) and floods (budget), then beacons the
 * report to `/api/client-errors`. Every call is best-effort: reporting an
 * error must never produce a second error.
 */

import {
  createWindowCounter,
  errorFingerprint,
  toErrorReport,
  type ErrorReport,
  type ErrorReportSource,
} from "./core";

export const CLIENT_ERROR_ENDPOINT = "/api/client-errors";

/** Reports allowed per minute in one page session (flood guard). */
export const CLIENT_REPORT_LIMIT = 8;
export const CLIENT_REPORT_WINDOW_MS = 60_000;
/** Identical fingerprint suppressed for this long (one incident, not many). */
export const CLIENT_DEDUPE_WINDOW_MS = 30_000;

export interface ReportContext {
  route: string;
  source: Exclude<ErrorReportSource, "request">;
}

export interface WebReporter {
  (error: unknown, context: ReportContext): boolean;
}

function beacon(report: ErrorReport): void {
  const body = JSON.stringify(report);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        CLIENT_ERROR_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      // `false` means the queue is full - fall through to fetch.
      if (sent) return;
    }
  } catch {
    // fall through to fetch
  }
  try {
    void fetch(CLIENT_ERROR_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // A reporter that cannot reach the server stays silent.
  }
}

export interface WebReporterOptions {
  /** Transport seam - tests inject a fake; production beacons. */
  transport?: (report: ErrorReport) => void;
  now?: () => number;
  limit?: number;
  windowMs?: number;
  dedupeWindowMs?: number;
}

export function createWebReporter(options: WebReporterOptions = {}): WebReporter {
  const now = options.now ?? (() => Date.now());
  const transport = options.transport ?? beacon;
  const budget = createWindowCounter({
    limit: options.limit ?? CLIENT_REPORT_LIMIT,
    windowMs: options.windowMs ?? CLIENT_REPORT_WINDOW_MS,
    maxKeys: 500,
  });
  const seen = createWindowCounter({
    limit: 1,
    windowMs: options.dedupeWindowMs ?? CLIENT_DEDUPE_WINDOW_MS,
    maxKeys: 500,
  });

  return function reportWebError(error: unknown, context: ReportContext): boolean {
    try {
      const report = toErrorReport({ error, route: context.route, source: context.source });
      const at = now();
      if (!seen.hit(errorFingerprint(report), at)) return false;
      if (!budget.hit("budget", at)) return false;
      transport(report);
      return true;
    } catch {
      return false;
    }
  };
}

/** Shared reporter instance used by the app's error boundaries. */
export const reportWebError: WebReporter = createWebReporter();
