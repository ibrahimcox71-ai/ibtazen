import type { ApiError } from "@ibtatech/types";

/**
 * Public JSON API helpers. Every error body is an `ApiError`
 * (`@ibtatech/types`) — `fieldErrors` is the only optional extension, so a
 * form client can highlight each invalid input at once.
 */

export interface ApiErrorBody extends ApiError {
  fieldErrors?: Record<string, string>;
}

/** Hard cap on request bodies — defence before JSON.parse touches the text. */
export const MAX_JSON_BODY_BYTES = 32 * 1024;

export type JsonReadResult =
  { ok: true; body: Record<string, unknown> } | { ok: false; status: number; error: ApiErrorBody };

function baseHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return headers;
}

export function apiErrorResponse(
  status: number,
  error: ApiErrorBody,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(error), { status, headers: baseHeaders(extraHeaders) });
}

export function apiJsonResponse(
  status: number,
  body: unknown,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), { status, headers: baseHeaders(extraHeaders) });
}

/** Client IP for rate limiting — forwarded header first (proxy setups). */
export function requestClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Read a JSON object body with the transport checks the engine assumes:
 * JSON content type, decodable text, size cap, and an object at the root
 * (arrays and scalars are not payloads this API accepts).
 */
export async function readJsonBody(request: Request): Promise<JsonReadResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      status: 415,
      error: {
        code: "unsupported_media_type",
        message: "Send the body as application/json.",
      },
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      status: 400,
      error: { code: "invalid_request", message: "The request body could not be read." },
    };
  }

  if (text.length > MAX_JSON_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      error: {
        code: "payload_too_large",
        message: `Body must be ${MAX_JSON_BODY_BYTES} bytes or fewer.`,
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      status: 400,
      error: { code: "invalid_request", message: "The body is not valid JSON." },
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      status: 400,
      error: { code: "invalid_request", message: "The body must be a JSON object." },
    };
  }

  return { ok: true, body: parsed as Record<string, unknown> };
}
