import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE } from "@ibtatech/config";
import type { EmailMessage } from "../src/email";
import { setEmailTransport } from "../src/email";
import {
  escapeHtml,
  renderPortalAccessEmail,
  renderProposalAcceptedEmail,
  renderProposalSentEmail,
} from "../src/email-templates";
import {
  changeContractStatus,
  changeInvoiceStatus,
  changeProposalStatus,
  convertWonLeadToClient,
  createAdminUser,
  createContractFromProposal,
  createInvoiceFromContract,
  createLeadProposal,
  ensureBootstrapAdmin,
  getInvoice,
  getPrisma,
  hashPassword,
  notifyInvoiceIssued,
  provisionPortalAccess,
  submitLead,
  type CrmUser,
  type ProposalWithCreator,
} from "../src/index";

const CLIENT_EMAIL = "phase18-client@example.com";

function clearEmailEnv(): void {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_TRANSPORT;
  delete process.env.LEAD_NOTIFY_EMAIL;
  delete process.env.EMAIL_FROM;
}

function captureTransport(seen: EmailMessage[]) {
  return vi.fn(async (message: EmailMessage) => {
    seen.push(message);
    return { delivered: true };
  });
}

async function createOperator(
  email: string,
  name: string,
  role: "admin" | "staff",
): Promise<CrmUser> {
  const user = await createAdminUser({
    email,
    name,
    passwordHash: hashPassword("correct-horse-battery-staple"),
    role,
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "admin" | "staff",
  };
}

async function createFixtureLead(name: string, email: string, ip: string): Promise<string> {
  const lead = await submitLead(
    { name, email, message: "Lead used for Phase 18 CRM event email coverage.", consent: true },
    ip,
  );
  if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
  return lead.leadId;
}

const sampleLines = [
  { description: "Discovery workshop", quantity: "1", unitPrice: "1500" },
  { description: "Design hours", quantity: "10", unitPrice: "95.50" },
];

/** Fresh draft proposal — every status test owns its own row. */
async function freshProposal(leadId: string, actor: CrmUser, title: string): Promise<string> {
  const created = await createLeadProposal(actor, leadId, {
    title,
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Phase 18 fixture.",
    lines: sampleLines,
  });
  if (!created.ok) throw new Error(`proposal create failed: ${created.error}`);
  return created.proposal.id;
}

function proposalFixture(overrides: Partial<ProposalWithCreator> = {}): ProposalWithCreator {
  return {
    id: "cmo0proposalfixture0000000001",
    leadId: "cmo0leadfixture000000000001",
    createdById: "cmo0adminfixture0000000001",
    version: 2,
    status: "sent",
    title: "Platform rebuild",
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: null,
    lines: JSON.stringify([
      { description: "Discovery workshop", quantity: 1, unitPriceMinor: 150000 },
    ]),
    subtotalMinor: 150000,
    totalMinor: 150000,
    sentAt: null,
    acceptedAt: null,
    declinedAt: null,
    createdAt: new Date("2026-01-05T10:00:00.000Z"),
    updatedAt: new Date("2026-01-05T10:00:00.000Z"),
    createdBy: { id: "cmo0adminfixture0000000001", name: "Ada Admin", email: "ada@crm.test" },
    ...overrides,
  } as ProposalWithCreator;
}

const contact = {
  id: "cmo0leadfixture000000000001",
  name: "Ada Lovelace",
  email: "ada@example.com",
};

describe("CRM event email templates", () => {
  beforeEach(() => clearEmailEnv());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearEmailEnv();
  });

  it("renders the client proposal email with formatted money and escaped HTML", () => {
    const message = renderProposalSentEmail(
      proposalFixture({ notes: 'Scope <script>alert("x")</script> done' }),
      { ...contact, name: '<img src=x onerror="alert(1)">' },
    );

    expect(message).not.toBeNull();
    expect(message!.to).toBe("ada@example.com");
    expect(message!.subject).toBe("Proposal ready: Platform rebuild");
    expect(message!.replyTo).toBe(SITE.email);
    expect(message!.tags).toContainEqual({ name: "type", value: "proposal-sent" });
    // 150000 minor units display as 1500.00 GBP, never as raw integers.
    expect(message!.text).toContain("1500.00 GBP");
    expect(message!.html).toContain("1500.00 GBP");
    expect(message!.html).toContain("Discovery workshop");
    expect(message!.html).not.toContain("<script>alert");
    expect(message!.html).not.toContain("<img src=x");
    expect(message!.text).toContain('<script>alert("x")</script>');
    expect(message!.html).toContain(escapeHtml("Platform rebuild"));
  });

  it("returns no proposal email when the contact has no address", () => {
    expect(renderProposalSentEmail(proposalFixture(), { ...contact, email: "  " })).toBeNull();
  });

  it("routes the accepted notice to the CRM inbox and replies to the client", () => {
    const message = renderProposalAcceptedEmail(proposalFixture(), contact);

    expect(message.to).toBe(SITE.email);
    expect(message.subject).toBe("Proposal accepted: Platform rebuild");
    expect(message.replyTo).toBe("ada@example.com");
    expect(message.tags).toContainEqual({ name: "type", value: "proposal-accepted" });
    expect(message.html).toContain(`/admin/leads/${contact.id}`);
    expect(message.html).toContain("1500.00 GBP");
  });

  it("honours LEAD_NOTIFY_EMAIL for internal notices", () => {
    vi.stubEnv("LEAD_NOTIFY_EMAIL", "ops@ibtatech.com");

    expect(renderProposalAcceptedEmail(proposalFixture(), contact).to).toBe("ops@ibtatech.com");
  });

  it("renders the portal invite with the URL and the shared password", () => {
    const message = renderPortalAccessEmail({
      name: "Ada Lovelace",
      email: "ada-portal@example.com",
      password: "correct-horse-battery-staple",
    });

    expect(message).not.toBeNull();
    expect(message!.to).toBe("ada-portal@example.com");
    expect(message!.subject).toContain("client portal login");
    expect(message!.tags).toContainEqual({ name: "type", value: "portal-access" });
    expect(message!.html).toContain(`${SITE.url}/portal/login`);
    expect(message!.text).toContain("correct-horse-battery-staple");
    expect(message!.replyTo).toBe(SITE.email);
  });
});

describe("CRM event emails (integration)", () => {
  let admin: CrmUser;
  let leadId: string;
  let clientId: string;
  let invoiceId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase18-admin@example.com", "Phase18 Admin", "admin");
    leadId = await createFixtureLead("Phase18 Subject", CLIENT_EMAIL, "203.0.113.180");

    // Won lead → client → accepted proposal → active contract → draft invoice.
    const proposalId = await freshProposal(leadId, admin, "Phase18 Engagement");
    const sent = await changeProposalStatus(admin, proposalId, "sent");
    if (!sent.ok) throw new Error("send failed");
    const accepted = await changeProposalStatus(admin, proposalId, "accepted");
    if (!accepted.ok) throw new Error("accept failed");

    await getPrisma().lead.update({ where: { id: leadId }, data: { status: "won" } });
    const converted = await convertWonLeadToClient(admin, leadId);
    if (!converted.ok) throw new Error("client conversion failed");
    clientId = converted.client.id;

    const contract = await createContractFromProposal(admin, clientId, proposalId);
    if (!contract.ok) throw new Error("contract create failed");
    const ofs = await changeContractStatus(admin, contract.contract.id, "out_for_signature");
    if (!ofs.ok) throw new Error("out_for_signature failed");
    const active = await changeContractStatus(admin, contract.contract.id, "active");
    if (!active.ok) throw new Error("activate failed");

    const invoice = await createInvoiceFromContract(admin, contract.contract.id);
    if (!invoice.ok) throw new Error("invoice create failed");
    invoiceId = invoice.invoice.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.adminUser.deleteMany({ where: { clientId } });
    await prisma.invoice.deleteMany({ where: { contract: { clientId } } });
    await prisma.project.deleteMany({ where: { clientId } });
    await prisma.contract.deleteMany({ where: { clientId } });
    await prisma.client.deleteMany({ where: { id: clientId } }).catch(() => undefined);
    await prisma.leadActivity.deleteMany({ where: { leadId } });
    await prisma.proposal.deleteMany({ where: { leadId } });
    await prisma.followUp.deleteMany({ where: { leadId } });
    await prisma.leadNote.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } }).catch(() => undefined);
  });

  beforeEach(() => {
    clearEmailEnv();
    setEmailTransport(undefined);
  });

  afterEach(() => {
    setEmailTransport(undefined);
    vi.restoreAllMocks();
    clearEmailEnv();
  });

  it("emails the client contact when a proposal is marked sent", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));
    const proposalId = await freshProposal(leadId, admin, "Phase18 Second Proposal");

    const result = await changeProposalStatus(admin, proposalId, "sent");

    expect(result).toMatchObject({ ok: true });
    expect(seen).toHaveLength(1);
    const message = seen[0]!;
    expect(message.to).toBe(CLIENT_EMAIL);
    expect(message.subject).toBe("Proposal ready: Phase18 Second Proposal");
    expect(message.replyTo).toBe(SITE.email);
    expect(message.tags).toContainEqual({ name: "type", value: "proposal-sent" });
    expect(message.text).toContain("1500.00 GBP");
  });

  it("emails the CRM inbox when a proposal is accepted", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));
    const proposalId = await freshProposal(leadId, admin, "Phase18 Accepted Proposal");
    const sent = await changeProposalStatus(admin, proposalId, "sent");
    expect(sent).toMatchObject({ ok: true });
    seen.length = 0;

    const result = await changeProposalStatus(admin, proposalId, "accepted");

    expect(result).toMatchObject({ ok: true });
    expect(seen).toHaveLength(1);
    const message = seen[0]!;
    expect(message.to).toBe(SITE.email);
    expect(message.subject).toBe("Proposal accepted: Phase18 Accepted Proposal");
    expect(message.replyTo).toBe(CLIENT_EMAIL);
    expect(message.html).toContain(`/admin/leads/${leadId}`);
  });

  it("never fails a transition when the transport rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setEmailTransport(async () => {
      throw new Error("provider exploded");
    });
    const proposalId = await freshProposal(leadId, admin, "Phase18 Failing Transport");

    const result = await changeProposalStatus(admin, proposalId, "sent");

    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.proposal.status).toBe("sent");
  });

  it("notifies the CRM inbox when the contract becomes active", async () => {
    const proposalId = await freshProposal(leadId, admin, "Phase18 Contract Proposal");
    await changeProposalStatus(admin, proposalId, "sent");
    await changeProposalStatus(admin, proposalId, "accepted");
    const contract = await createContractFromProposal(admin, clientId, proposalId);
    expect(contract).toMatchObject({ ok: true });
    if (!contract.ok) return;
    const ofs = await changeContractStatus(admin, contract.contract.id, "out_for_signature");
    expect(ofs).toMatchObject({ ok: true });

    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));
    const result = await changeContractStatus(admin, contract.contract.id, "active");

    expect(result).toMatchObject({ ok: true });
    expect(seen).toHaveLength(1);
    const message = seen[0]!;
    expect(message.to).toBe(SITE.email);
    expect(message.subject).toContain("Contract is active");
    expect(message.tags).toContainEqual({ name: "type", value: "contract-signed" });
    expect(message.html).toContain(`/admin/clients/${clientId}`);
  });

  it("emails the client when an invoice is issued", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    const result = await changeInvoiceStatus(admin, invoiceId, "sent");

    expect(result).toMatchObject({ ok: true });
    expect(seen).toHaveLength(1);
    const message = seen[0]!;
    expect(message.to).toBe(CLIENT_EMAIL);
    expect(message.subject).toContain("from Ibtatech");
    expect(message.replyTo).toBe(SITE.email);
    expect(message.tags).toContainEqual({ name: "type", value: "invoice-issued" });
    // No portal login exists yet — the email must not advertise a dead link.
    expect(message.html).not.toContain("/portal/invoices/");
  });

  it("sends the portal invite only when the admin asked for it", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    const skipped = await provisionPortalAccess(admin, clientId, {
      email: "phase18-portal@example.com",
      password: "correct-horse-battery-staple",
    });

    expect(skipped).toMatchObject({ ok: true });
    if (!skipped.ok) return;
    expect(skipped.invite).toEqual({ requested: false, delivered: false });
    expect(seen).toHaveLength(0);

    const invited = await provisionPortalAccess(admin, clientId, {
      email: "phase18-portal@example.com",
      password: "correct-horse-battery-staple",
      sendInvite: "on",
    });

    expect(invited).toMatchObject({ ok: true });
    if (!invited.ok) return;
    expect(invited.invite).toEqual({ requested: true, delivered: true });
    expect(seen).toHaveLength(1);
    const message = seen[0]!;
    expect(message.to).toBe("phase18-portal@example.com");
    expect(message.html).toContain(`${SITE.url}/portal/login`);
    expect(message.text).toContain("correct-horse-battery-staple");
  });

  it("advertises the portal invoice link only for clients with a login", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));
    const provisioned = await provisionPortalAccess(admin, clientId, {
      // Same address as the invite test: one portal login per Client.
      email: "phase18-portal@example.com",
      password: "correct-horse-battery-staple",
    });
    expect(provisioned).toMatchObject({ ok: true });
    seen.length = 0;

    const invoice = await getInvoice(invoiceId);
    expect(invoice).not.toBeNull();
    const result = await notifyInvoiceIssued(invoice!);

    expect(result.delivered).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.html).toContain(`/portal/invoices/${invoiceId}`);
    expect(seen[0]!.to).toBe(CLIENT_EMAIL);
  });
});
