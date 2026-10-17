/**
 * Observability core - pure, dependency-free primitives shared by the client
 * reporter (`report.ts`) and the server ingest handler (`ingest.ts`).
 *
 * No DOM, no Next, no I/O: everything here is unit-tested. The whole seam is
 * provider-free by design (same philosophy as `packages/ui/src/analytics.ts`):
 * structured one-line JSON on stdout, so any log shipper can pick it up later
 * without a code change.
 */

/** Version tag on every payload so a future pipeline can evolve safely. */
export const ERROR_REPORT_VERSION = 1 as const;

export type ErrorReportSource = "error" | "global-error" | "request";

export const ERROR_REPORT_SOURCES: readonly ErrorReportSource[] = [
  "error",
  "global-error",
  "request",
];

/** One normalised, sendable error report. Never carries cookies/headers/PII. */
export interface ErrorReport {
  v: typeof ERROR_REPORT_VERSION;
  name: string;
  message: string;
  digest?: string;
  /** Path only - no query string, so tokens can never leak into logs. */
  route: string;
  source: ErrorReportSource;
  /** ISO-8601 timestamp. */
  at: string;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_ROUTE_LENGTH = 200;
export const MAX_DIGEST_LENGTH = 64;
export const MAX_TIMESTAMP_LENGTH = 40;

/** Hard cap for a report body on the wire (ingest rejects anything bigger). */
export const MAX_REPORT_BODY_LENGTH = 4_000;

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** Route input keeps only the path - `?query` and `#hash` are dropped. */
function normaliseRoute(route: string | undefined): string {
  const segments = (route ?? "").split(/[?#]/);
  const path = (segments[0] ?? "").trim();
  if (path === "") return "/";
  return clamp(path, MAX_ROUTE_LENGTH);
}

function readDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const { digest } = error as { digest?: unknown };
    if (typeof digest === "string" && digest !== "") {
      return clamp(digest, MAX_DIGEST_LENGTH);
    }
  }
  return undefined;
}

function readErrorText(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: clamp(error.name || "Error", MAX_NAME_LENGTH),
      message: clamp(error.message || String(error), MAX_MESSAGE_LENGTH),
    };
  }
  if (typeof error === "string") {
    return { name: "NonError", message: clamp(error, MAX_MESSAGE_LENGTH) };
  }
  if (typeof error === "object" && error !== null) {
    const maybe = error as { name?: unknown; message?: unknown };
    const name = typeof maybe.name === "string" && maybe.name !== "" ? maybe.name : "NonError";
    // A non-string `message` means this is not an Error - keep the whole
    // object so nothing (codes, contexts) is lost on the way to the log.
    const message =
      typeof maybe.message === "string" && maybe.message !== ""
        ? maybe.message
        : safeStringify(error);
    return {
      name: clamp(name, MAX_NAME_LENGTH),
      message: clamp(message, MAX_MESSAGE_LENGTH),
    };
  }
  return { name: "NonError", message: clamp(safeStringify(error), MAX_MESSAGE_LENGTH) };
}

function safeStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "function") return "[function]";
  try {
    const text = JSON.stringify(value);
    return typeof text === "string" ? text : String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/** Normalise anything thrown (Error, string, object, undefined) into a report. */
export function toErrorReport(input: {
  error: unknown;
  route: string | undefined;
  source: ErrorReportSource;
  at?: string;
}): ErrorReport {
  const { name, message } = readErrorText(input.error);
  const at =
    typeof input.at === "string" && input.at !== ""
      ? clamp(input.at, MAX_TIMESTAMP_LENGTH)
      : new Date().toISOString();
  const digest = readDigest(input.error);
  return {
    v: ERROR_REPORT_VERSION,
    name,
    message,
    ...(digest === undefined ? {} : { digest }),
    route: normaliseRoute(input.route),
    source: input.source,
    at,
  };
}

/**
 * Dedup key for the reporter: the same failure hitting the same route twice in
 * a row is one incident, not two. Source is part of it so a client-side
 * boundary and the server-side request error stay distinguishable.
 */
export function errorFingerprint(report: ErrorReport): string {
  return [report.source, report.route, report.name, report.message, report.digest ?? ""].join("|");
}

export interface WindowCounterOptions {
  /** How many hits a key gets per window. */
  limit: number;
  windowMs: number;
  /** Cap on tracked keys so the map can never grow unbounded. */
  maxKeys?: number;
}

export interface WindowCounter {
  /** `true` if the hit was allowed (and counted). */
  hit(key: string, now: number): boolean;
  /** Number of tracked keys - exposed for tests/observability of the limiter. */
  size(): number;
}

/**
 * Fixed-window counter used on both sides of the seam: the browser reporter
 * (dedupe + send budget) and the ingest route (per-IP budget). State is
 * in-memory by design - single process today; a multi-instance deployment
 * swaps this for a shared store behind the same two methods.
 */
export function createWindowCounter(options: WindowCounterOptions): WindowCounter {
  const { limit, windowMs, maxKeys = 500 } = options;
  const counts = new Map<string, { count: number; resetAt: number }>();

  function prune(now: number): void {
    for (const [key, entry] of counts) {
      if (entry.resetAt <= now) counts.delete(key);
    }
    // FIFO eviction keeps the map bounded even with hostile key churn.
    while (counts.size > maxKeys) {
      const oldest = counts.keys().next();
      if (oldest.done) break;
      counts.delete(oldest.value);
    }
  }

  return {
    hit(key: string, now: number): boolean {
      if (limit <= 0 || windowMs <= 0) return false;
      const entry = counts.get(key);
      if (!entry || entry.resetAt <= now) {
        counts.set(key, { count: 1, resetAt: now + windowMs });
        // Enforce the bound right after growth, so size never exceeds maxKeys.
        if (counts.size > maxKeys) prune(now);
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    size(): number {
      return counts.size;
    },
  };
}

/**
 * Hand-rolled (but strict) validation for an inbound report body.
 *
 * Deliberately not zod: the ingest path must stay dependency-free and must
 * never throw on hostile input. Shape violations are rejected (`null`);
 * over-long strings are truncated instead of rejected, so a buggy client still
 * gets logged rather than silently dropped.
 */
export function parseErrorReport(raw: unknown): ErrorReport | null {
  if (typeof raw !== "string" || raw === "") return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (record.v !== ERROR_REPORT_VERSION) return null;
  if (typeof record.name !== "string" || record.name === "") return null;
  if (typeof record.message !== "string" || record.message === "") return null;
  if (typeof record.source !== "string") return null;
  if (!ERROR_REPORT_SOURCES.includes(record.source as ErrorReportSource)) return null;
  if (record.route !== undefined && typeof record.route !== "string") return null;
  if (record.at !== undefined && typeof record.at !== "string") return null;
  if (record.digest !== undefined && typeof record.digest !== "string") return null;

  return {
    v: ERROR_REPORT_VERSION,
    name: clamp(record.name, MAX_NAME_LENGTH),
    message: clamp(record.message, MAX_MESSAGE_LENGTH),
    ...(typeof record.digest === "string" && record.digest !== ""
      ? { digest: clamp(record.digest, MAX_DIGEST_LENGTH) }
      : {}),
    route: normaliseRoute(record.route),
    source: record.source as ErrorReportSource,
    at:
      typeof record.at === "string" && record.at !== ""
        ? clamp(record.at, MAX_TIMESTAMP_LENGTH)
        : new Date().toISOString(),
  };
}
