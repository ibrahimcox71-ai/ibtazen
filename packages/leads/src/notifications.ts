import type { Lead } from "./repository";
import type { EmailMessage } from "./email";
import { describeEmailTransport, sendEmail } from "./email";
import { renderLeadAcknowledgementEmail, renderLeadNoticeEmail } from "./email-templates";

/**
 * NotificationService — persistence-first notifications. The lead is already
 * safely stored by the time this runs, and nothing is ever faked: with no
 * provider configured the transport logs and reports `delivered: false`.
 * Resend is selected by `RESEND_API_KEY` (`EMAIL_TRANSPORT=console` forces the
 * local fallback); tests inject a transport via `setEmailTransport`.
 */

export interface LeadNotificationPayload {
  lead: Lead;
}

export interface NotificationResult {
  provider: string;
  delivered: boolean;
  error?: string;
}

/** Delivery never throws into the request path — failures are logged and
 * surfaced in the result. */
export type NotificationSender = (
  payload: LeadNotificationPayload,
) => Promise<{ delivered: boolean; error?: string }>;

function createEmailSender(): NotificationSender {
  return async ({ lead }) => {
    const messages = [renderLeadNoticeEmail(lead), renderLeadAcknowledgementEmail(lead)].filter(
      (message): message is EmailMessage => message !== null,
    );
    const results = await Promise.all(messages.map((message) => sendEmail(message)));
    const failed = results.filter((result) => !result.delivered);
    if (failed.length === 0) return { delivered: true };
    return {
      delivered: false,
      error: failed.map((result) => result.error ?? "unknown error").join("; "),
    };
  };
}

let sender: NotificationSender | undefined;

/** Test seam — inject a spy sender. */
export function setNotificationSender(s: NotificationSender | undefined): void {
  sender = s;
}

/**
 * Ops-visible delivery outcome. The lead flow used to be silent on success
 * (the caller discarded the result), so "did the mail actually go out?" was
 * unanswerable from the log — every submit now prints one line either way.
 */
function logOutcome(result: NotificationResult): void {
  if (result.delivered) {
    console.info(`[notifications] lead notice delivered: true (provider=${result.provider})`);
  } else {
    console.error(
      `[notifications] lead notice delivered: false (provider=${result.provider}): ${
        result.error ?? "unknown error"
      }`,
    );
  }
}

export async function notifyNewLead(payload: LeadNotificationPayload): Promise<NotificationResult> {
  const s = sender ?? createEmailSender();
  const provider = describeEmailTransport();
  try {
    const r = await s(payload);
    const result: NotificationResult = r.error
      ? { provider, delivered: r.delivered, error: r.error }
      : { provider, delivered: r.delivered };
    logOutcome(result);
    return result;
  } catch (error) {
    console.error("[notifications] delivery failed", error);
    const result: NotificationResult = {
      provider,
      delivered: false,
      error: error instanceof Error ? error.message : String(error),
    };
    logOutcome(result);
    return result;
  }
}
