import type { CreateLeadInput } from "./repository";
import { createLead } from "./repository";
import type { LeadSource } from "./domain";
import { isLeadSource } from "./domain";
import { notifyNewLead } from "./notifications";
import { checkRateLimit } from "./rate-limit";
import { parseLeadPayload, toCreateLeadInput } from "./validation";

/**
 * LeadService — one pipeline for every surface (contact, audits, estimate,
 * booking): parse → rate-limit → dedupe → persist → notify. Server actions
 * call `submitLead` with an explicit source; nothing else needs to know how
 * leads are stored.
 */

export interface SubmitResult {
  ok: boolean;
  error?: "rate_limited" | "invalid" | "duplicate" | "persistence_failed";
  fieldErrors?: Record<string, string>;
  leadId?: string;
}

async function persistAndNotify(input: CreateLeadInput): Promise<SubmitResult> {
  try {
    const lead = await createLead(input);
    await notifyNewLead({ lead });
    return { ok: true, leadId: lead.id };
  } catch (error) {
    if (
      error instanceof Object &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "duplicate" };
    }
    console.error("[leads] persistence failed", error);
    return { ok: false, error: "persistence_failed" };
  }
}

function throttle(ip: string): SubmitResult | null {
  try {
    checkRateLimit(ip);
    return null;
  } catch {
    return { ok: false, error: "rate_limited" };
  }
}

export async function submitLead(
  raw: unknown,
  ip: string,
  source: string = "contact",
): Promise<SubmitResult> {
  // Source is server-assigned, never trusted from the wire.
  const leadSource: LeadSource = isLeadSource(source) ? source : "contact";
  const parsed = parseLeadPayload(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fieldErrors: parsed.fieldErrors };
  }
  const limited = throttle(ip);
  if (limited) return limited;
  return persistAndNotify(toCreateLeadInput(parsed.data, leadSource));
}
