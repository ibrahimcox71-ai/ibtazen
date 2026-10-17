import { z } from "zod";
import { isBudgetBand } from "./budgets";
import { requiredWebsite } from "./validation";
import { trimmed } from "./strings";

/**
 * Audit request schema (website / SEO / ads variants). Lives in the engine so
 * every lead surface validates through one zod instance and one policy.
 * Ads-audit extras (platform, spend band, goal) are typed config values.
 */

export const AUDIT_KINDS = ["website", "seo", "ads"] as const;
export type AuditKind = (typeof AUDIT_KINDS)[number];

export function isAuditKind(v: string): v is AuditKind {
  return (AUDIT_KINDS as readonly string[]).includes(v);
}

export const AD_PLATFORMS = ["google-ads", "meta-ads", "linkedin-ads", "other"] as const;

export const AD_SPEND_BANDS = ["under-2k", "2k-10k", "10k-50k", "50k-plus", "not-sure"] as const;

const email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.string().regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, "Enter a valid email address"))
  .transform((v) => v.toLowerCase());

const honeypot = z.string().max(0, "Spam detected").optional();

const auditBase = z
  .object({
    name: trimmed(120).pipe(z.string().min(2).max(120)),
    email,
    company: trimmed(160).optional(),
    website: requiredWebsite,
    serviceInterest: z
      .string()
      .refine((v) => (AUDIT_KINDS as readonly string[]).includes(v), "Choose an audit focus")
      .optional(),
    challenge: trimmed(300).optional(),
    message: trimmed(5000).optional(),
    consent: z.literal(true, { message: "Consent is required" }),
    marketingConsent: z.boolean().optional().default(false),
    adPlatform: z
      .string()
      .refine((v) => (AD_PLATFORMS as readonly string[]).includes(v), "Choose a platform")
      .optional(),
    monthlyAdSpend: z
      .string()
      .refine((v) => (AD_SPEND_BANDS as readonly string[]).includes(v), "Choose a spend range")
      .optional(),
    primaryGoal: trimmed(160).optional(),
    _gotcha: honeypot,
  })
  .strict();

export type AuditInput = z.infer<typeof auditBase>;

export interface ParsedAudit {
  success: boolean;
  data?: AuditInput;
  fieldErrors?: Record<string, string>;
}

export function parseAuditPayload(raw: unknown): ParsedAudit {
  const result = auditBase.safeParse(raw);
  if (!result.success) {
    const out: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!out[key]) out[key] = issue.message;
    }
    return { success: false, fieldErrors: out };
  }
  return { success: true, data: result.data };
}

export function auditToLeadPayload(a: AuditInput) {
  const detail: Record<string, string> = {
    auditKind: a.serviceInterest ?? "website",
  };
  if (a.challenge) detail.challenge = a.challenge;
  if (a.adPlatform) detail.adPlatform = a.adPlatform;
  if (a.monthlyAdSpend) detail.monthlyAdSpend = a.monthlyAdSpend;
  if (a.primaryGoal) detail.primaryGoal = a.primaryGoal;
  if (a.message) detail.notes = a.message;

  return {
    name: a.name,
    email: a.email,
    company: a.company,
    website: a.website,
    message: a.message || a.challenge || `Audit request (${detail.auditKind}) for ${a.website}`,
    consent: true,
    marketingConsent: a.marketingConsent,
    detail,
  };
}

// Re-export for callers that validate bands independently.
export { isBudgetBand };
