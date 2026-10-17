/**
 * Server-side ingest for client error reports + the server-side request-error
 * logger. Pure logic (no Next imports) so it is unit-testable; the route
 * handler in `app/api/client-errors` is a thin adapter over `ingestClientError`.
 */

import {
  MAX_REPORT_BODY_LENGTH,
  createWindowCounter,
  parseErrorReport,
  toErrorReport,
  type ErrorReport,
} from "./core";

/** Per-IP budget: enough for real debugging, useless for log flooding. */
export const CLIENT_INGEST_RATE = {
  limit: 20,
  windowMs: 60_000,
  maxKeys: 500,
} as const;

export const CLIENT_INGEST_LOG_PREFIX = "[web:error]";
export const REQUEST_ERROR_LOG_PREFIX = "[web:request-error]";

const limiter = createWindowCounter(CLIENT_INGEST_RATE);

export interface IngestInput {
  /** Raw request body, already read by the route handler. */
  body: string;
  /** Client identity for the budget - forwarded header when behind a proxy. */
  ip?: string;
  now?: number;
  /** Logging seam (tests capture it); defaults to one structured console line. */
  log?: (report: ErrorReport) => void;
}

export interface IngestResult {
  status: 204 | 400 | 413 | 429;
}

export function logErrorReport(report: ErrorReport): void {
  // One JSON line - greppable, shipper-friendly, no interpolation needed.
  console.error(CLIENT_INGEST_LOG_PREFIX, JSON.stringify(report));
}

export function ingestClientError(input: IngestInput): IngestResult {
  try {
    const { body, ip = "unknown" } = input;
    if (typeof body !== "string") return { status: 400 };
    if (body.length > MAX_REPORT_BODY_LENGTH) return { status: 413 };

    const now = input.now ?? Date.now();
    if (!limiter.hit(ip === "" ? "unknown" : ip, now)) return { status: 429 };

    const report = parseErrorReport(body);
    if (!report) return { status: 400 };

    // Logging must never fail a request - a broken sink still returns 204.
    try {
      (input.log ?? logErrorReport)(report);
    } catch {
      // swallow: the report reached the server, the sink misbehaved
    }
    return { status: 204 };
  } catch {
    return { status: 400 };
  }
}

export interface RequestErrorInput {
  error: unknown;
  request?: { path?: string; method?: string };
  context?: { routePath?: string; routeType?: string };
}

/**
 * `instrumentation.ts#onRequestError` logger: every failed route handler,
 * server action and RSC render lands here as one structured line, carrying
 * Next's `digest` (the correlation id shown in production error pages).
 */
export function logRequestError(input: RequestErrorInput): void {
  try {
    const report = toErrorReport({
      error: input.error,
      route: input.request?.path ?? input.context?.routePath ?? "/",
      source: "request",
    });
    console.error(
      REQUEST_ERROR_LOG_PREFIX,
      JSON.stringify({
        ...report,
        method: input.request?.method,
        routeType: input.context?.routeType,
      }),
    );
  } catch {
    // Instrumentation must never throw into the request path.
  }
}
