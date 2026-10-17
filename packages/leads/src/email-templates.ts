import { SITE } from "@ibtatech/config";
import { brand, ink } from "@ibtatech/utils";
import { formatMinorToMajor, type ProposalLine } from "./domain";
import type {
  ContractWithRelations,
  InvoiceWithRelations,
  Lead,
  ProposalWithCreator,
} from "./repository";
import { parseProposalLines } from "./repository";
import type { EmailMessage } from "./email";
import {
  invoicePdfFromRow,
  proposalPdfFromRow,
  renderInvoicePdf,
  renderProposalPdf,
  type PdfAttachment,
} from "./pdf";

const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact form",
  "website-audit": "Website audit",
  "seo-audit": "SEO audit",
  "ads-audit": "Ads audit",
  estimate: "Estimate request",
  booking: "Booking",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || name.trim();
}

function withPdf(message: EmailMessage, render: () => PdfAttachment): EmailMessage {
  try {
    const doc = render();
    return { ...message, attachments: [{ filename: doc.filename, content: doc.bytes }] };
  } catch (error) {
    console.error("[email] pdf attachment failed", error);
    return message;
  }
}

function compactRows(rows: [string, string | undefined | null][]): [string, string][] {
  return rows
    .map(([label, value]): [string, string] => [label, (value ?? "").trim()])
    .filter(([, value]) => value.length > 0);
}

function rowsHtml(rows: [string, string][]): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${ink[200]};color:${ink[500]};font-size:13px;width:38%">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid ${ink[200]};color:${ink[900]};font-size:14px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">${body}</table>`;
}

function rowsText(rows: [string, string][]): string {
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

function wrap(options: { title: string; bodyHtml: string; bodyText: string }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.title)}</title></head><body style="margin:0;padding:0;background:${ink[50]};font-family:Arial,Helvetica,sans-serif;color:${ink[900]}"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${ink[50]}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${ink[200]};border-radius:12px;overflow:hidden"><tr><td style="background:${brand[700]};color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700">${escapeHtml(SITE.name)}</td></tr><tr><td style="padding:24px">${options.bodyHtml}</td></tr><tr><td style="padding:16px 24px;border-top:1px solid ${ink[200]};color:${ink[500]};font-size:12px;line-height:18px">${escapeHtml(SITE.legalName)} · ${escapeHtml(SITE.domain)} · <a href="mailto:${escapeHtml(SITE.email)}" style="color:${brand[700]}">${escapeHtml(SITE.email)}</a></td></tr></table></td></tr></table></body></html>`;
}

export function renderLeadNoticeEmail(lead: Lead, adminUrl?: string): EmailMessage {
  const url = adminUrl ?? `${SITE.url}/admin/leads/${lead.id}`;
  const label = sourceLabel(lead.source);
  const rows = compactRows([
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.company],
    ["Website", lead.website],
    ["Country", lead.country],
    ["Source", label],
    ["Budget", lead.budgetBand],
    ["Timeline", lead.timeline],
    ["Status", lead.status],
    ["Marketing consent", lead.marketingConsent ? "given" : "not given"],
    ["Lead ID", lead.id],
  ]);
  const subject = `New ${label.toLowerCase()} lead: ${lead.name}`;
  const message = lead.message.trim();

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[600]}">A new enquiry arrived on ${escapeHtml(SITE.domain)}. It is stored in the CRM and needs triage.</p>` +
    rowsHtml(rows) +
    (message
      ? `<p style="margin:16px 0 4px;font-size:13px;font-weight:700;color:${ink[500]};text-transform:uppercase">Message</p>` +
        `<blockquote style="margin:0;padding:12px 16px;background:${ink[50]};border-left:3px solid ${brand[600]};color:${ink[700]};font-size:14px;line-height:21px;white-space:pre-wrap">${escapeHtml(message)}</blockquote>`
      : "") +
    `<p style="margin:20px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:${brand[600]};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:700">Open in the CRM</a></p>`;

  const bodyText = [
    `A new enquiry arrived on ${SITE.domain}. It is stored in the CRM and needs triage.`,
    "",
    rowsText(rows),
    message ? `\nMessage:\n${message}` : "",
    `\nOpen in the CRM: ${url}`,
  ].join("\n");

  return {
    to: process.env.LEAD_NOTIFY_EMAIL?.trim() || SITE.email,
    subject,
    html: wrap({ title: subject, bodyHtml, bodyText }),
    text: bodyText,
    replyTo: lead.email,
    tags: [
      { name: "type", value: "lead-notice" },
      { name: "source", value: lead.source },
    ],
  };
}

export function renderLeadAcknowledgementEmail(lead: Lead): EmailMessage | null {
  const to = lead.email.trim();
  if (!to) return null;

  const name = firstName(lead.name);
  const message = lead.message.trim();
  const subject = `Thanks ${name} - we received your enquiry`;

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[900]}">Hi ${escapeHtml(name)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[600]}">Thanks for contacting ${escapeHtml(SITE.name)}. This confirms your enquiry reached us. A member of the team replies within one business day with next steps.</p>` +
    (message
      ? `<p style="margin:16px 0 4px;font-size:13px;font-weight:700;color:${ink[500]};text-transform:uppercase">What you sent</p>` +
        `<blockquote style="margin:0;padding:12px 16px;background:${ink[50]};border-left:3px solid ${brand[600]};color:${ink[700]};font-size:14px;line-height:21px;white-space:pre-wrap">${escapeHtml(message)}</blockquote>`
      : "") +
    `<p style="margin:16px 0 0;font-size:15px;line-height:22px;color:${ink[600]}>Need to add something? Reply to this email - it reaches the same inbox.</p>`;

  const bodyText = [
    `Hi ${name},`,
    "",
    `Thanks for contacting ${SITE.name}. This confirms your enquiry reached us. A member of the team replies within one business day with next steps.`,
    message ? `\nWhat you sent:\n${message}` : "",
    "",
    `Need to add something? Reply to this email - it reaches ${SITE.email}.`,
  ].join("\n");

  return {
    to,
    subject,
    html: wrap({ title: subject, bodyHtml, bodyText }),
    text: bodyText,
    replyTo: SITE.email,
    tags: [
      { name: "type", value: "lead-acknowledgement" },
      { name: "source", value: lead.source },
    ],
  };
}

// ── CRM event emails ────────────────────────────────────────────────────
// Renderers for the CRM event hooks (ARCHITECTURE §7): proposal sent and
// accepted, contract signed, invoice issued, portal access provisioned.
// Same honesty contract as the lead flow — rendering never claims delivery.

/** Minimal contact shape shared by the client-facing templates. */
export interface ContactPerson {
  id: string;
  name: string;
  email: string;
}

/** Minor units + ISO currency → `1234.56 GBP`, matching the CRM display. */
function money(minor: number, currency: string): string {
  return `${formatMinorToMajor(minor)} ${currency}`;
}

/** `YYYY-MM-DD` → `31 Dec 2026`, parsed as calendar parts (no TZ shift). */
function isoDateLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}

function lineItemsHtml(lines: ProposalLine[], currency: string): string {
  if (lines.length === 0) return "";
  const cell = `padding:8px 0;border-bottom:1px solid ${ink[200]};font-size:14px`;
  const head = `padding:6px 0;font-size:12px;font-weight:700;color:${ink[500]};text-transform:uppercase;border-bottom:1px solid ${ink[200]}`;
  const body = lines
    .map(
      (line) =>
        `<tr><td style="${cell};color:${ink[900]}">${escapeHtml(line.description)}</td>` +
        `<td align="right" style="${cell};color:${ink[600]};white-space:nowrap">${line.quantity}</td>` +
        `<td align="right" style="${cell};color:${ink[900]};white-space:nowrap">${escapeHtml(
          money(line.quantity * line.unitPriceMinor, currency),
        )}</td></tr>`,
    )
    .join("");
  return (
    `<p style="margin:16px 0 4px;font-size:13px;font-weight:700;color:${ink[500]};text-transform:uppercase">Scope</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">` +
    `<tr><td style="${head}">Description</td>` +
    `<td align="right" style="${head}">Qty</td>` +
    `<td align="right" style="${head}">Amount</td></tr>` +
    body +
    `</table>`
  );
}

function lineItemsText(lines: ProposalLine[], currency: string): string[] {
  if (lines.length === 0) return [];
  return [
    "Scope:",
    ...lines.map(
      (line) =>
        `  - ${line.description}: ${line.quantity} x ${money(line.unitPriceMinor, currency)}` +
        ` = ${money(line.quantity * line.unitPriceMinor, currency)}`,
    ),
    "",
  ];
}

function adminButton(url: string, label: string): string {
  return `<p style="margin:20px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:${brand[600]};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:700">${escapeHtml(label)}</a></p>`;
}

/** Proposal ready — sent to the client contact when the CRM marks it sent. */
export function renderProposalSentEmail(
  proposal: ProposalWithCreator,
  lead: ContactPerson,
): EmailMessage | null {
  const to = lead.email.trim();
  if (!to) return null;

  const name = firstName(lead.name);
  const subject = `Proposal ready: ${proposal.title}`;
  const notes = proposal.notes?.trim() ?? "";
  const rows = compactRows([
    ["Proposal", `${proposal.title} (version ${proposal.version})`],
    ["Total", money(proposal.totalMinor, proposal.currency)],
    ["Valid until", isoDateLabel(proposal.validUntil)],
    ["Reference", proposal.id],
  ]);

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[900]}">Hi ${escapeHtml(name)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[600]}">Your proposal from ${escapeHtml(SITE.name)} is ready. The scope and totals we prepared for you are listed below.</p>` +
    rowsHtml(rows) +
    lineItemsHtml(parseProposalLines(proposal.lines), proposal.currency) +
    (notes
      ? `<p style="margin:16px 0 4px;font-size:13px;font-weight:700;color:${ink[500]};text-transform:uppercase">Notes</p>` +
        `<blockquote style="margin:0;padding:12px 16px;background:${ink[50]};border-left:3px solid ${brand[600]};color:${ink[700]};font-size:14px;line-height:21px;white-space:pre-wrap">${escapeHtml(notes)}</blockquote>`
      : "") +
    `<p style="margin:20px 0 0;font-size:15px;line-height:22px;color:${ink[600]}">Questions or changes? Reply to this email - it reaches the same inbox.</p>`;

  const bodyText = [
    `Hi ${name},`,
    "",
    `Your proposal from ${SITE.name} is ready. The scope and totals we prepared for you are listed below.`,
    "",
    rowsText(rows),
    "",
    ...lineItemsText(parseProposalLines(proposal.lines), proposal.currency),
    notes ? `Notes:\n${notes}\n` : "",
    `Questions or changes? Reply to this email - it reaches ${SITE.email}.`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return withPdf(
    {
      to,
      subject,
      html: wrap({ title: subject, bodyHtml, bodyText }),
      text: bodyText,
      replyTo: SITE.email,
      tags: [
        { name: "type", value: "proposal-sent" },
        { name: "reference", value: proposal.id },
      ],
    },
    () => renderProposalPdf(proposalPdfFromRow(proposal, lead.name)),
  );
}

/** Accepted proposal — the internal win signal for the CRM inbox. */
export function renderProposalAcceptedEmail(
  proposal: ProposalWithCreator,
  lead: ContactPerson,
): EmailMessage {
  const subject = `Proposal accepted: ${proposal.title}`;
  const contact = lead.email.trim();
  const url = `${SITE.url}/admin/leads/${lead.id}`;
  const rows = compactRows([
    ["Client contact", lead.name],
    ["Email", contact],
    ["Proposal", `${proposal.title} (version ${proposal.version})`],
    ["Total", money(proposal.totalMinor, proposal.currency)],
    ["Valid until", isoDateLabel(proposal.validUntil)],
  ]);

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[900]}">${escapeHtml(lead.name)} accepted the proposal <strong>${escapeHtml(proposal.title)}</strong>.</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[600]}">This is not a win yet - use Accept &amp; Win on the lead to move the pipeline forward.</p>` +
    rowsHtml(rows) +
    adminButton(url, "Open in the CRM");

  const bodyText = [
    `${lead.name} accepted the proposal ${proposal.title}.`,
    "",
    "This is not a win yet - use Accept & Win on the lead to move the pipeline forward.",
    "",
    rowsText(rows),
    "",
    `Open in the CRM: ${url}`,
  ].join("\n");

  return {
    to: process.env.LEAD_NOTIFY_EMAIL?.trim() || SITE.email,
    subject,
    html: wrap({ title: subject, bodyHtml, bodyText }),
    text: bodyText,
    ...(contact ? { replyTo: contact } : {}),
    tags: [
      { name: "type", value: "proposal-accepted" },
      { name: "reference", value: proposal.id },
    ],
  };
}

/** Contract reached `active` (signed) — internal notice for the CRM inbox. */
export function renderContractSignedEmail(contract: ContractWithRelations): EmailMessage {
  const subject = `Contract is active: ${contract.title}`;
  const clientName = contract.client.organizationName?.trim() || contract.client.name;
  const url = `${SITE.url}/admin/clients/${contract.clientId}`;
  const rows = compactRows([
    ["Client", clientName],
    ["Contact", contract.client.email],
    ["Total", money(contract.totalMinor, contract.currency)],
    ["Status", contract.status],
    ["Reference", contract.id],
  ]);

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[900]}">The contract for <strong>${escapeHtml(contract.title)}</strong> is now active.</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[600]}">An active contract can be invoiced and opens project delivery.</p>` +
    rowsHtml(rows) +
    adminButton(url, "Open client in the CRM");

  const bodyText = [
    `The contract for ${contract.title} is now active.`,
    "An active contract can be invoiced and opens project delivery.",
    "",
    rowsText(rows),
    "",
    `Open client in the CRM: ${url}`,
  ].join("\n");

  return {
    to: process.env.LEAD_NOTIFY_EMAIL?.trim() || SITE.email,
    subject,
    html: wrap({ title: subject, bodyHtml, bodyText }),
    text: bodyText,
    replyTo: contract.client.email,
    tags: [
      { name: "type", value: "contract-signed" },
      { name: "reference", value: contract.id },
    ],
  };
}

/**
 * Invoice issued (`sent`) — sent to the client contact. `portalUrl` is only
 * supplied when this client actually has a portal login, so the message
 * never advertises a link the recipient cannot open.
 */
export function renderInvoiceIssuedEmail(
  invoice: InvoiceWithRelations,
  portalUrl?: string,
): EmailMessage | null {
  const to = invoice.contract.client.email.trim();
  if (!to) return null;

  const subject = `Invoice ${invoice.invoiceNumber} from ${SITE.name}`;
  const rows = compactRows([
    ["Invoice", invoice.invoiceNumber],
    ["For", invoice.title],
    ["Issued", isoDateLabel(invoice.issueDate)],
    ["Due", invoice.dueDate ? isoDateLabel(invoice.dueDate) : ""],
    ["Total", money(invoice.totalMinor, invoice.currency)],
  ]);

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[900]}">Invoice ${escapeHtml(invoice.invoiceNumber)} is ready for payment.</p>` +
    rowsHtml(rows) +
    lineItemsHtml(parseProposalLines(invoice.lines), invoice.currency) +
    (portalUrl
      ? adminButton(portalUrl, "View in your portal")
      : `<p style="margin:20px 0 0;font-size:15px;line-height:22px;color:${ink[600]}">Reply to this email if anything on the invoice needs correcting.</p>`);

  const bodyText = [
    `Invoice ${invoice.invoiceNumber} is ready for payment.`,
    "",
    rowsText(rows),
    "",
    ...lineItemsText(parseProposalLines(invoice.lines), invoice.currency),
    portalUrl
      ? `View in your portal: ${portalUrl}`
      : `Reply to this email if anything needs correcting.`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return withPdf(
    {
      to,
      subject,
      html: wrap({ title: subject, bodyHtml, bodyText }),
      text: bodyText,
      replyTo: SITE.email,
      tags: [
        { name: "type", value: "invoice-issued" },
        { name: "reference", value: invoice.invoiceNumber },
      ],
    },
    () => renderInvoicePdf(invoicePdfFromRow(invoice)),
  );
}

/**
 * Portal credentials — only sent when an admin explicitly asks for it while
 * provisioning. The password travels here because the admin chose to share
 * it; without that opt-in nothing about the login leaves the server.
 */
export function renderPortalAccessEmail(input: {
  name: string;
  email: string;
  password?: string;
}): EmailMessage | null {
  const to = input.email.trim();
  if (!to) return null;

  const name = firstName(input.name);
  const subject = `Your ${SITE.name} client portal login`;
  const url = `${SITE.url}/portal/login`;
  const rows = compactRows([
    ["Portal", url],
    ["Login", to],
    ["Password", input.password ?? ""],
  ]);

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[900]}">Hi ${escapeHtml(name)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:${ink[600]}">Your ${escapeHtml(SITE.name)} client portal login is ready. It shows your proposals, projects and invoices in one place, and is read-only.</p>` +
    rowsHtml(rows) +
    adminButton(url, "Sign in to the portal") +
    `<p style="margin:20px 0 0;font-size:15px;line-height:22px;color:${ink[600]}">If anything looks wrong, reply to this email and we will reset it.</p>`;

  const bodyText = [
    `Hi ${name},`,
    "",
    `Your ${SITE.name} client portal login is ready. It shows your proposals, projects and invoices in one place, and is read-only.`,
    "",
    rowsText(rows),
    "",
    `Sign in: ${url}`,
    "",
    "If anything looks wrong, reply to this email and we will reset it.",
  ].join("\n");

  return {
    to,
    subject,
    html: wrap({ title: subject, bodyHtml, bodyText }),
    text: bodyText,
    replyTo: SITE.email,
    tags: [{ name: "type", value: "portal-access" }],
  };
}
