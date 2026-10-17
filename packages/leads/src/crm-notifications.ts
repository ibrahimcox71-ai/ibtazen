import { SITE } from "@ibtatech/config";
import type { EmailMessage } from "./email";
import { describeEmailTransport, sendEmail } from "./email";
import {
  renderContractSignedEmail,
  renderInvoiceIssuedEmail,
  renderPortalAccessEmail,
  renderProposalAcceptedEmail,
  renderProposalSentEmail,
  type ContactPerson,
} from "./email-templates";
import type { NotificationResult } from "./notifications";
import {
  findPortalUserByClientId,
  getLead,
  type ContractWithRelations,
  type InvoiceWithRelations,
  type ProposalWithCreator,
} from "./repository";

/**
 * CRM event notifications — the "next hooks" from ARCHITECTURE §7: proposal
 * sent / accepted, contract signed, invoice issued, portal access created.
 *
 * Contract, identical to `notifyNewLead`:
 * - never throws into the request path (a failed email can never fail a CRM
 *   transition, and it never rolls back committed state),
 * - never fakes delivery — the console transport reports `delivered: false`
 *   until a provider is configured,
 * - sends only what the recipient needs: client emails carry the document,
 *   internal events go to the CRM inbox, and no actor credentials leave the
 *   server unless an admin explicitly asked for the invite.
 */

async function deliver(
  label: string,
  messages: Array<EmailMessage | null>,
): Promise<NotificationResult> {
  const provider = describeEmailTransport();
  const list = messages.filter((message): message is EmailMessage => message !== null);
  if (list.length === 0) return { provider, delivered: true };
  try {
    const results = await Promise.all(list.map((message) => sendEmail(message)));
    const failed = results.filter((result) => !result.delivered);
    if (failed.length === 0) return { provider, delivered: true };
    return {
      provider,
      delivered: false,
      error: failed.map((result) => result.error ?? "unknown error").join("; "),
    };
  } catch (error) {
    console.error(`[notifications] ${label} delivery failed`, error);
    return {
      provider,
      delivered: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function logFailure(label: string, result: NotificationResult): void {
  if (!result.delivered) {
    console.error(`[notifications] ${label} email not delivered: ${result.error ?? "unknown"}`);
  }
}

function contactOf(lead: { id: string; name: string; email: string }): ContactPerson {
  return { id: lead.id, name: lead.name, email: lead.email };
}

// ── Direct notifications (rows already in hand) ─────────────────────────

export async function notifyProposalSent(
  proposal: ProposalWithCreator,
  lead: ContactPerson,
): Promise<NotificationResult> {
  const result = await deliver("proposal-sent", [renderProposalSentEmail(proposal, lead)]);
  logFailure("proposal sent", result);
  return result;
}

export async function notifyProposalAccepted(
  proposal: ProposalWithCreator,
  lead: ContactPerson,
): Promise<NotificationResult> {
  const result = await deliver("proposal-accepted", [renderProposalAcceptedEmail(proposal, lead)]);
  logFailure("proposal accepted", result);
  return result;
}

export async function notifyContractSigned(
  contract: ContractWithRelations,
): Promise<NotificationResult> {
  const result = await deliver("contract-signed", [renderContractSignedEmail(contract)]);
  logFailure("contract signed", result);
  return result;
}

export async function notifyInvoiceIssued(
  invoice: InvoiceWithRelations,
): Promise<NotificationResult> {
  // The portal link is advertised only when this client really has a login.
  const portalUser = await findPortalUserByClientId(invoice.contract.clientId).catch(() => null);
  const portalUrl = portalUser ? `${SITE.url}/portal/invoices/${invoice.id}` : undefined;
  const result = await deliver("invoice-issued", [renderInvoiceIssuedEmail(invoice, portalUrl)]);
  logFailure("invoice issued", result);
  return result;
}

export async function notifyPortalAccessProvisioned(input: {
  name: string;
  email: string;
  password?: string;
}): Promise<NotificationResult> {
  const result = await deliver("portal-access", [renderPortalAccessEmail(input)]);
  logFailure("portal access", result);
  return result;
}

// ── Service hooks (load whatever the transition did not have) ───────────

/**
 * Proposal status hooks: `sent` tells the client contact, `accepted` tells
 * the CRM inbox. Every other transition (declined, new draft version) is
 * deliberately silent. Missing lead data degrades to "no email" — never to
 * an exception inside the transition.
 */
export async function notifyProposalStatusChange(
  proposal: ProposalWithCreator,
  leadId: string,
  toStatus: string,
): Promise<void> {
  try {
    if (toStatus !== "sent" && toStatus !== "accepted") return;
    const lead = await getLead(leadId);
    if (!lead) return;
    const contact = contactOf(lead);
    if (toStatus === "sent") await notifyProposalSent(proposal, contact);
    else await notifyProposalAccepted(proposal, contact);
  } catch (error) {
    console.error("[notifications] proposal event failed", error);
  }
}

/** `active` is the signed contract — the only contract event worth an email. */
export async function notifyContractStatusChange(
  contract: ContractWithRelations,
  toStatus: string,
): Promise<void> {
  try {
    if (toStatus !== "active") return;
    await notifyContractSigned(contract);
  } catch (error) {
    console.error("[notifications] contract event failed", error);
  }
}

/** `sent` is the issued invoice — the only invoice event the client sees. */
export async function notifyInvoiceStatusChange(
  invoice: InvoiceWithRelations,
  toStatus: string,
): Promise<void> {
  try {
    if (toStatus !== "sent") return;
    await notifyInvoiceIssued(invoice);
  } catch (error) {
    console.error("[notifications] invoice event failed", error);
  }
}
