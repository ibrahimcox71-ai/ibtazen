"use server";

import { submitLead, type SubmitResult } from "@ibtatech/leads";
import { headers } from "next/headers";

/**
 * Shared server-action boundary for every lead surface. The lead engine owns
 * validation, rate limiting, dedupe, persistence and notifications — actions
 * only adapt transport (FormData → payload) and map errors to field names.
 */

export type { SubmitResult };

/** Client IP for rate limiting — forwarded header first (proxy setups). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export interface ActionPayload {
  /** Lead source slug recorded in the database. */
  source: string;
  form: FormData;
}

export async function submitLeadAction(payload: ActionPayload): Promise<SubmitResult> {
  const f = payload.form;
  const get = (key: string) => {
    const v = f.get(key);
    return typeof v === "string" ? v : "";
  };

  // `detail.*` form fields feed the lead's structured metadata. The engine
  // caps each value; here we only collect non-empty strings.
  const detail: Record<string, string> = {};
  const service = get("service");
  if (service) detail.service = service;
  for (const [key, value] of f.entries()) {
    if (
      key.startsWith("detail.") &&
      typeof value === "string" &&
      value.trim() &&
      detail[key.slice("detail.".length)] === undefined
    ) {
      detail[key.slice("detail.".length)] = value.trim();
    }
  }

  const raw = {
    name: get("name"),
    email: get("email"),
    phone: get("phone") || undefined,
    company: get("company") || undefined,
    website: get("website") || undefined,
    country: get("country") || undefined,
    budgetBand: get("budgetBand") || undefined,
    timeline: get("timeline") || undefined,
    message: get("message"),
    consent: get("consent") === "on" || get("consent") === "true",
    marketingConsent: get("marketingConsent") === "on" || get("marketingConsent") === "true",
    _gotcha: get("websiteUrl"),
    detail: Object.keys(detail).length > 0 ? detail : undefined,
  };

  return submitLead(raw, await getClientIp());
}
