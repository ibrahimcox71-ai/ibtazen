import { submitLead } from "@ibtatech/leads";
import { apiErrorResponse, apiJsonResponse, readJsonBody, requestClientIp } from "@/lib/api";

/**
 * Public lead API — the JSON twin of the contact and estimate forms.
 *
 * Contract: `POST /api/leads` with an `application/json` object body
 * (`source` optional, `contact` | `estimate`) -> 201 `{ ok, leadId }`.
 * Every failure is an `ApiError` body: 400 `invalid_request` /
 * `invalid` (+ `field` + `fieldErrors`), 405, 409 `duplicate`,
 * 413 `payload_too_large`, 415 `unsupported_media_type`, 429 `rate_limited`
 * (+ `Retry-After`), 500 `internal_error`. The lead engine still owns
 * validation, rate limiting, dedupe and notifications — this route only
 * adapts transport, so a form post and an API post behave identically.
 */

export const dynamic = "force-dynamic";

/** Sources a public client may claim; CRM-side sources stay server-only. */
const PUBLIC_SOURCES = new Set(["contact", "estimate"]);

/** Matches the lead limiter window (5 requests / 10 minutes per IP). */
const RATE_LIMIT_RETRY_AFTER_SECONDS = 600;

function invalidSource(): Response {
  return apiErrorResponse(400, {
    code: "invalid_request",
    message: 'source must be "contact" or "estimate".',
    field: "source",
  });
}

export async function POST(request: Request): Promise<Response> {
  const read = await readJsonBody(request);
  if (!read.ok) return apiErrorResponse(read.status, read.error);

  const { source, ...payload } = read.body;
  if (source !== undefined && (typeof source !== "string" || !PUBLIC_SOURCES.has(source))) {
    return invalidSource();
  }

  const result = await submitLead(payload, requestClientIp(request), source ?? "contact");

  if (result.ok) {
    return apiJsonResponse(201, { ok: true, leadId: result.leadId });
  }

  switch (result.error) {
    case "invalid": {
      const fieldErrors = result.fieldErrors ?? {};
      const entries = Object.entries(fieldErrors);
      const [field, message] = entries[0] ?? [];
      return apiErrorResponse(400, {
        code: "invalid",
        message: message ?? "The lead payload failed validation.",
        ...(field ? { field } : {}),
        ...(entries.length > 0 ? { fieldErrors } : {}),
      });
    }
    case "rate_limited":
      return apiErrorResponse(
        429,
        {
          code: "rate_limited",
          message: "Too many submissions from this address. Try again later.",
        },
        { "retry-after": String(RATE_LIMIT_RETRY_AFTER_SECONDS) },
      );
    case "duplicate":
      return apiErrorResponse(409, {
        code: "duplicate",
        message: "An open request from this email already exists.",
        field: "email",
      });
    default:
      return apiErrorResponse(500, {
        code: "internal_error",
        message: "The lead could not be saved. Try again later.",
      });
  }
}

export async function GET(): Promise<Response> {
  return apiErrorResponse(
    405,
    { code: "method_not_allowed", message: "Use POST to submit a lead." },
    { allow: "POST" },
  );
}
