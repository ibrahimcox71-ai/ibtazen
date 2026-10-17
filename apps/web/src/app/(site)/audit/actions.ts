"use server";

import type { SubmitResult } from "@ibtatech/leads";
import { auditToLeadPayload, checkRateLimit, parseAuditPayload, submitLead } from "@ibtatech/leads";
import { getClientIp } from "@/lib/lead-action";

/**
 * Audit request server action. Engine owns validation, rate limiting,
 * persistence; this adapter only translates the transport and derives the
 * lead source from the chosen audit focus.
 */

export type { SubmitResult as AuditResult };

type AuditResult = SubmitResult;

export async function submitAuditRequest(
  _prev: AuditResult | null,
  formData: FormData,
): Promise<AuditResult> {
  const f = formData;
  const get = (key: string) => {
    const v = f.get(key);
    return typeof v === "string" ? v : "";
  };

  const raw = {
    name: get("name"),
    email: get("email"),
    company: get("company") || undefined,
    website: get("website"),
    serviceInterest: get("serviceInterest") || undefined,
    challenge: get("challenge") || undefined,
    message: get("message") || undefined,
    adPlatform: get("adPlatform") || undefined,
    monthlyAdSpend: get("monthlyAdSpend") || undefined,
    primaryGoal: get("primaryGoal") || undefined,
    consent: get("consent") === "on",
    marketingConsent: get("marketingConsent") === "on",
    _gotcha: get("websiteUrl"),
  };

  const parsed = parseAuditPayload(raw);
  if (!parsed.success || !parsed.data) {
    return { ok: false, error: "invalid", fieldErrors: parsed.fieldErrors };
  }

  const ip = await getClientIp();
  try {
    checkRateLimit(ip);
  } catch {
    return { ok: false, error: "rate_limited" };
  }

  const source = parsed.data.serviceInterest === "ads" ? "ads-audit" : "seo-audit";
  return submitLead(auditToLeadPayload(parsed.data), ip, source);
}
