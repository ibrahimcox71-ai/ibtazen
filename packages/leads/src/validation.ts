import { z } from "zod";
import { isBudgetBand } from "./budgets";
import { LEAD_SOURCES, TIMELINES, type LeadSource } from "./domain";
import { normaliseUrl } from "./url";
import { trimmed } from "./strings";

/**
 * Boundary validation — the single security gate for lead input. Server
 * actions hand raw form data here; persistence never sees unvalidated shapes.
 *
 * Policy:
 * - trim + collapse whitespace, hard length caps (payload-limit defence)
 * - email: pragmatic pattern accepting international B2B addresses
 * - website: http(s) only, normalised before persistence (see url.ts)
 * - honeypot `_gotcha` must be absent or empty
 * - privileged fields (status/notes/id/source) are never accepted from
 *   clients — `.strict()` rejects them server-side (mass-assignment defence)
 */

const name = trimmed(120).pipe(z.string().min(2).max(120));

const email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.string().regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, "Enter a valid email address"))
  .transform((v) => v.toLowerCase());

/** Website that must be present and valid (audit/ads-audit forms). */
export const requiredWebsite = z
  .string()
  .min(1, "Website is required")
  .max(500)
  .transform((v) => normaliseUrl(v))
  .refine((v): v is string => v !== undefined, "Enter a valid website URL");

const optionalWebsite = z
  .preprocess(
    (v) => (v === undefined || v === null ? "" : v),
    z.union([z.literal(""), requiredWebsite]),
  )
  .transform((v) => (v === "" ? undefined : v));

/** Honeypot: bots fill every input they see; legitimate UIs never send it. */
const honeypot = z.string().max(0, "Spam detected").optional();

export const leadSourceSchema = z.enum(LEAD_SOURCES);

/** Fields any lead surface may send. Server assigns `source` itself. */
export const leadBaseSchema = z
  .object({
    name,
    email,
    phone: trimmed(40).optional(),
    company: trimmed(160).optional(),
    website: optionalWebsite,
    country: trimmed(80).optional(),
    budgetBand: z.string().refine(isBudgetBand, "Invalid budget band").optional(),
    timeline: z
      .string()
      .refine((v) => (TIMELINES as readonly string[]).includes(v), "Invalid timeline")
      .optional(),
    message: trimmed(5000).pipe(z.string().min(10, "Please add a few more details")),
    consent: z.literal(true, { message: "Consent is required" }),
    marketingConsent: z.boolean().optional().default(false),
    _gotcha: honeypot,
    detail: z.record(z.string(), trimmed(500)).optional(),
  })
  .strict();

export type LeadBaseInput = z.infer<typeof leadBaseSchema>;

export type ParsedLead =
  { success: true; data: LeadBaseInput } | { success: false; fieldErrors: Record<string, string> };

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseLeadPayload(raw: unknown): ParsedLead {
  const result = leadBaseSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(result.error) };
  }
  return { success: true, data: result.data };
}

export function toCreateLeadInput(payload: LeadBaseInput, source: LeadSource = "contact") {
  return {
    name: payload.name,
    email: payload.email,
    phone: payload.phone || undefined,
    company: payload.company || undefined,
    website: payload.website,
    country: payload.country,
    source,
    budgetBand: payload.budgetBand,
    timeline: payload.timeline,
    message: payload.message,
    consent: true,
    marketingConsent: payload.marketingConsent,
    detail: payload.detail,
  };
}
