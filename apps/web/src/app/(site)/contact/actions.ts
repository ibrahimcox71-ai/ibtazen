"use server";

import type { SubmitResult } from "@ibtatech/leads";
import { submitLeadAction } from "@/lib/lead-action";

/**
 * Contact form server action. Validation, rate limiting, duplicate
 * protection, persistence and notifications all live in @ibtatech/leads —
 * this adapter only translates the transport.
 */

export type { SubmitResult as ContactResult };

type ContactResult = SubmitResult;

export async function submitContactLead(
  _prev: ContactResult | null,
  formData: FormData,
): Promise<ContactResult> {
  return submitLeadAction({ source: "contact", form: formData });
}
