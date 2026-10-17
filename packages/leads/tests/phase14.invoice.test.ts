import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  INVOICE_STATUSES,
  InvoiceAlreadyExistsError,
  canInvoiceTransition,
  changeContractStatus,
  changeInvoiceStatus,
  convertWonLeadToClient,
  createAdminUser,
  createContractFromProposal,
  createInvoiceFromContract,
  createInvoiceWithActivity,
  createLeadProposal,
  ensureBootstrapAdmin,
  findInvoiceByContractId,
  getInvoiceForActor,
  getPrisma,
  hashPassword,
  isInvoiceStatus,
  isLeadActivityType,
  LEAD_ACTIVITY_TYPES,
  listLeadActivities,
  listInvoices,
  listInvoicesForActor,
  submitLead,
  type CrmUser,
} from "../src/index";

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
    {
      name,
      email,
      message: "Lead used for Phase 14 invoice coverage.",
      consent: true,
    },
    ip,
  );
  if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
  return lead.leadId;
}

const sampleLines = [
  { description: "Discovery workshop", quantity: "1", unitPrice: "1500" },
  { description: "Design hours", quantity: "10", unitPrice: "95.50" },
];

async function createAcceptedProposal(leadId: string, actor: CrmUser): Promise<string> {
  const created = await createLeadProposal(actor, leadId, {
    title: "Phase14 Engagement",
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Accepted for invoice snapshot tests.",
    lines: sampleLines,
  });
  if (!created.ok) throw new Error(`proposal create failed: ${created.error}`);
  const proposalId = created.proposal.id;
  const { changeProposalStatus } = await import("../src/index");
  const sent = await changeProposalStatus(actor, proposalId, "sent");
  if (!sent.ok) throw new Error("send failed");
  const accepted = await changeProposalStatus(actor, proposalId, "accepted");
  if (!accepted.ok) throw new Error("accept failed");
  return proposalId;
}

async function createContractInStatus(
  leadId: string,
  actor: CrmUser,
  target: "draft" | "active" | "void",
): Promise<{ clientId: string; contractId: string }> {
  await getPrisma().lead.update({ where: { id: leadId }, data: { status: "won" } });
  const converted = await convertWonLeadToClient(actor, leadId);
  if (!converted.ok) throw new Error("client conversion failed");
  const proposalId = await createAcceptedProposal(leadId, actor);
  const contract = await createContractFromProposal(actor, converted.client.id, proposalId);
  if (!contract.ok) throw new Error("contract create failed");
  const contractId = contract.contract.id;
  if (target === "draft") {
    return { clientId: converted.client.id, contractId };
  }
  const ofs = await changeContractStatus(actor, contractId, "out_for_signature");
  if (!ofs.ok) throw new Error("out_for_signature failed");
  if (target === "void") {
    const voided = await changeContractStatus(actor, contractId, "void");
    if (!voided.ok) throw new Error("void failed");
    return { clientId: converted.client.id, contractId };
  }
  const active = await changeContractStatus(actor, contractId, "active");
  if (!active.ok) throw new Error("activate failed");
  return { clientId: converted.client.id, contractId };
}

async function cleanupLead(leadId: string): Promise<void> {
  const prisma = getPrisma();
  const client = await prisma.client.findUnique({ where: { leadId } });
  if (client) {
    await prisma.invoice.deleteMany({ where: { contract: { clientId: client.id } } });
    await prisma.project.deleteMany({ where: { clientId: client.id } });
    await prisma.contract.deleteMany({ where: { clientId: client.id } });
    await prisma.client.delete({ where: { id: client.id } });
  }
  await prisma.leadActivity.deleteMany({ where: { leadId } });
  await prisma.proposal.deleteMany({ where: { leadId } });
  await prisma.followUp.deleteMany({ where: { leadId } });
  await prisma.leadNote.deleteMany({ where: { leadId } });
  await prisma.lead.delete({ where: { id: leadId } }).catch(() => undefined);
}

describe("invoice domain", () => {
  it("exposes canonical invoice status vocabulary and activity types", () => {
    expect(INVOICE_STATUSES).toEqual(["draft", "sent", "paid", "void"]);
    expect(isInvoiceStatus("draft")).toBe(true);
    expect(isInvoiceStatus("partially_paid")).toBe(false);
    expect(isInvoiceStatus("overdue")).toBe(false);
    expect(isInvoiceStatus("cancelled")).toBe(false);
    expect(LEAD_ACTIVITY_TYPES).toContain("invoice_created");
    expect(LEAD_ACTIVITY_TYPES).toContain("invoice_status_changed");
    expect(isLeadActivityType("invoice_created")).toBe(true);
    expect(isLeadActivityType("invoice")).toBe(false);
  });

  it("allows only the explicit invoice transitions with terminal paid/void", () => {
    expect(canInvoiceTransition("draft", "sent")).toBe(true);
    expect(canInvoiceTransition("draft", "void")).toBe(true);
    expect(canInvoiceTransition("draft", "paid")).toBe(false);
    expect(canInvoiceTransition("sent", "paid")).toBe(true);
    expect(canInvoiceTransition("sent", "void")).toBe(true);
    expect(canInvoiceTransition("sent", "draft")).toBe(false);
    expect(canInvoiceTransition("paid", "sent")).toBe(false);
    expect(canInvoiceTransition("paid", "void")).toBe(false);
    expect(canInvoiceTransition("paid", "draft")).toBe(false);
    expect(canInvoiceTransition("void", "draft")).toBe(false);
    expect(canInvoiceTransition("void", "sent")).toBe(false);
    expect(canInvoiceTransition("void", "paid")).toBe(false);
  });
});

describe("invoice service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let activeLeadId: string;
  let activeContractId: string;
  let activeClientId: string;
  let invoiceId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase14-admin@example.com", "Phase14 Admin", "admin");
    staff = await createOperator("phase14-staff@example.com", "Phase14 Staff", "staff");

    activeLeadId = await createFixtureLead(
      "Phase14 Invoice Subject",
      "phase14-invoice@example.com",
      "203.0.113.140",
    );
    const active = await createContractInStatus(activeLeadId, staff, "active");
    activeClientId = active.clientId;
    activeContractId = active.contractId;
  });

  afterAll(async () => {
    await cleanupLead(activeLeadId);
  });

  it("rejects unauthenticated and non-CRM actors on create", async () => {
    expect(await createInvoiceFromContract(null, activeContractId)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await createInvoiceFromContract(outsider, activeContractId)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await createInvoiceFromContract(admin, "not-a-cuid")).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await createInvoiceFromContract(admin, "c0000000000000000000000000")).toMatchObject({
      ok: false,
      error: "not_found",
    });
  });

  it("rejects inactive, draft, and void contracts", async () => {
    const draftLead = await createFixtureLead(
      "Phase14 Draft Contract",
      "phase14-draft@example.com",
      "203.0.113.141",
    );
    const draft = await createContractInStatus(draftLead, admin, "draft");
    expect(await createInvoiceFromContract(admin, draft.contractId)).toMatchObject({
      ok: false,
      error: "invalid_status",
    });

    const voidLead = await createFixtureLead(
      "Phase14 Void Contract",
      "phase14-void@example.com",
      "203.0.113.142",
    );
    const voided = await createContractInStatus(voidLead, admin, "void");
    expect(await createInvoiceFromContract(admin, voided.contractId)).toMatchObject({
      ok: false,
      error: "invalid_status",
    });

    await cleanupLead(draftLead);
    await cleanupLead(voidLead);
  });

  it("creates an invoice that snapshots contract financials server-side", async () => {
    const contract = await getPrisma().contract.findUnique({
      where: { id: activeContractId },
      include: { client: true },
    });
    expect(contract).toBeTruthy();
    if (!contract) return;

    // Browser-supplied junk fields do not exist on this API — only contractId.
    const created = await createInvoiceFromContract(staff, activeContractId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    invoiceId = created.invoice.id;

    expect(created.invoice.status).toBe("draft");
    expect(created.invoice.currency).toBe(contract.currency);
    expect(created.invoice.subtotalMinor).toBe(contract.subtotalMinor);
    expect(created.invoice.totalMinor).toBe(contract.totalMinor);
    expect(created.invoice.lines).toBe(contract.lines);
    expect(created.invoice.title).toBe(contract.title);
    expect(created.invoice.createdBy.id).toBe(staff.id);
    expect(created.invoice.contract.client.leadId).toBe(activeLeadId);
    expect(created.invoice.contract.client.id).toBe(activeClientId);
    expect(created.invoice.invoiceNumber).toMatch(/^INV-\d{6}$/);
    expect(created.invoice.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(created.invoice.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // No tax/discount/ledger fields exist on the row.
    const row = await getPrisma().invoice.findUnique({ where: { id: invoiceId } });
    expect(row).toBeTruthy();
    expect(row && "taxMinor" in row).toBe(false);
    expect(row && "discountMinor" in row).toBe(false);
  });

  it("records invoice_created activity atomically with creation", async () => {
    const activities = await listLeadActivities(activeLeadId);
    const created = activities.filter((a) => a.type === "invoice_created");
    expect(created.length).toBeGreaterThanOrEqual(1);
    const latest = created[0];
    expect(latest).toBeTruthy();
    if (!latest) return;
    const meta = JSON.parse(latest.metadata ?? "{}") as Record<string, unknown>;
    expect(meta.invoiceId).toBe(invoiceId);
    expect(meta.contractId).toBe(activeContractId);
    expect(typeof meta.totalMinor).toBe("number");
    expect(typeof meta.currency).toBe("string");
  });

  it("rejects repeated creation for the same contract (duplicate policy)", async () => {
    expect(await createInvoiceFromContract(admin, activeContractId)).toMatchObject({
      ok: false,
      error: "already_exists",
    });
    const existing = await findInvoiceByContractId(activeContractId);
    expect(existing?.id).toBe(invoiceId);
    const invoices = await getPrisma().invoice.findMany({
      where: { contractId: activeContractId },
    });
    expect(invoices).toHaveLength(1);
  });

  it("maps unique contractId constraint to InvoiceAlreadyExistsError", async () => {
    const contract = await getPrisma().contract.findUnique({
      where: { id: activeContractId },
      include: { client: true },
    });
    expect(contract).toBeTruthy();
    if (!contract) return;
    await expect(
      createInvoiceWithActivity({
        contractId: activeContractId,
        createdById: admin.id,
        status: "draft",
        currency: contract.currency,
        issueDate: "2026-09-24",
        title: contract.title,
        lines: contract.lines,
        subtotalMinor: contract.subtotalMinor,
        totalMinor: contract.totalMinor,
        leadId: contract.client.leadId,
        activityMetadata: {},
      }),
    ).rejects.toBeInstanceOf(InvoiceAlreadyExistsError);
  });

  it("allows only one invoice per contract under concurrent creates", async () => {
    const raceLeadId = await createFixtureLead(
      "Phase14 Race",
      "phase14-race@example.com",
      "203.0.113.143",
    );
    const active = await createContractInStatus(raceLeadId, admin, "active");
    const attempt = () => createInvoiceFromContract(admin, active.contractId);
    const results = await Promise.all([attempt(), attempt(), attempt()]);
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);
    for (const f of failures) {
      expect(f).toMatchObject({ ok: false, error: "already_exists" });
    }
    const rows = await getPrisma().invoice.findMany({
      where: { contractId: active.contractId },
    });
    expect(rows).toHaveLength(1);
    const activities = await listLeadActivities(raceLeadId);
    expect(activities.filter((a) => a.type === "invoice_created")).toHaveLength(1);

    await cleanupLead(raceLeadId);
  });

  it("rolls back invoice insert when activity write fails (atomicity)", async () => {
    const atomicLeadId = await createFixtureLead(
      "Phase14 Atomic",
      "phase14-atomic@example.com",
      "203.0.113.144",
    );
    const active = await createContractInStatus(atomicLeadId, admin, "active");
    const contract = await getPrisma().contract.findUnique({
      where: { id: active.contractId },
      include: { client: true },
    });
    expect(contract).toBeTruthy();
    if (!contract) return;

    await expect(
      createInvoiceWithActivity({
        contractId: active.contractId,
        createdById: admin.id,
        status: "draft",
        currency: contract.currency,
        issueDate: "2026-09-24",
        title: contract.title,
        lines: contract.lines,
        subtotalMinor: contract.subtotalMinor,
        totalMinor: contract.totalMinor,
        leadId: contract.client.leadId,
        activityMetadata: {},
        failActivity: true,
      }),
    ).rejects.toThrow();

    expect(await findInvoiceByContractId(active.contractId)).toBeNull();
    const activities = await listLeadActivities(atomicLeadId);
    expect(activities.filter((a) => a.type === "invoice_created")).toHaveLength(0);

    await cleanupLead(atomicLeadId);
  });

  it("applies valid status transitions with atomic activity", async () => {
    const toSent = await changeInvoiceStatus(staff, invoiceId, "sent");
    expect(toSent.ok).toBe(true);
    if (toSent.ok) expect(toSent.invoice.status).toBe("sent");

    const toPaid = await changeInvoiceStatus(admin, invoiceId, "paid");
    expect(toPaid.ok).toBe(true);
    if (toPaid.ok) expect(toPaid.invoice.status).toBe("paid");

    const activities = await listLeadActivities(activeLeadId);
    const changes = activities.filter((a) => a.type === "invoice_status_changed");
    expect(changes.length).toBeGreaterThanOrEqual(2);
    const latest = changes[0];
    expect(latest?.fromStatus).toBeTruthy();
    expect(latest?.toStatus).toBe("paid");
    const meta = JSON.parse(latest?.metadata ?? "{}") as Record<string, unknown>;
    expect(meta.invoiceId).toBe(invoiceId);
    expect(meta.fromStatus).toBe(latest?.fromStatus);
    expect(meta.toStatus).toBe("paid");
  });

  it("rejects invalid, forged, and terminal status transitions", async () => {
    // paid is terminal
    expect(await changeInvoiceStatus(admin, invoiceId, "sent")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeInvoiceStatus(admin, invoiceId, "void")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeInvoiceStatus(admin, invoiceId, "draft")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    // forged status vocabulary
    expect(await changeInvoiceStatus(admin, invoiceId, "partially_paid")).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await changeInvoiceStatus(admin, invoiceId, "refunded")).toMatchObject({
      ok: false,
      error: "invalid",
    });
    // forged ids
    expect(await changeInvoiceStatus(admin, "not-a-cuid", "sent")).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await changeInvoiceStatus(admin, "c0000000000000000000000000", "sent")).toMatchObject({
      ok: false,
      error: "not_found",
    });
    // unauthorized
    expect(await changeInvoiceStatus(null, invoiceId, "sent")).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await changeInvoiceStatus(outsider, invoiceId, "sent")).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("supports draft → void on a separate invoice", async () => {
    const voidLeadId = await createFixtureLead(
      "Phase14 Void Invoice",
      "phase14-void-inv@example.com",
      "203.0.113.145",
    );
    const active = await createContractInStatus(voidLeadId, admin, "active");
    const created = await createInvoiceFromContract(admin, active.contractId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const voided = await changeInvoiceStatus(admin, created.invoice.id, "void");
    expect(voided.ok).toBe(true);
    if (voided.ok) expect(voided.invoice.status).toBe("void");

    // void is terminal
    expect(await changeInvoiceStatus(admin, created.invoice.id, "draft")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeInvoiceStatus(admin, created.invoice.id, "paid")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });

    await cleanupLead(voidLeadId);
  });

  it("lists invoices for CRM actors only and loads detail with context", async () => {
    expect(await listInvoicesForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await listInvoicesForActor(outsider)).toEqual({ ok: false, error: "unauthorized" });

    const list = await listInvoicesForActor(staff);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.invoices.some((i) => i.id === invoiceId)).toBe(true);
    }
    const all = await listInvoices();
    expect(all.some((i) => i.id === invoiceId)).toBe(true);

    expect(await getInvoiceForActor(null, invoiceId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await getInvoiceForActor(outsider, invoiceId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await getInvoiceForActor(admin, "not-a-cuid")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getInvoiceForActor(admin, "c0000000000000000000000000")).toEqual({
      ok: false,
      error: "not_found",
    });

    const detail = await getInvoiceForActor(staff, invoiceId);
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.invoice.id).toBe(invoiceId);
    expect(detail.invoice.contract.client.leadId).toBe(activeLeadId);
    expect(detail.invoice.contract.client.id).toBe(activeClientId);
    expect(detail.invoice.contract.id).toBe(activeContractId);
    expect(detail.invoice.createdBy.id).toBe(staff.id);
    expect(detail.invoice.status).toBe("paid");
    expect(detail.invoice.subtotalMinor).toBe(detail.invoice.totalMinor);
    expect(detail.invoice.currency).toBe("GBP");
  });

  it("does not invent financial fields from any browser-shaped payload", async () => {
    // The public service accepts only (actor, contractId). Extra shape cannot
    // override snapshot values — verify stored row still matches contract.
    const contract = await getPrisma().contract.findUnique({
      where: { id: activeContractId },
    });
    const invoice = await getPrisma().invoice.findUnique({ where: { id: invoiceId } });
    expect(contract).toBeTruthy();
    expect(invoice).toBeTruthy();
    if (!contract || !invoice) return;
    expect(invoice.currency).toBe(contract.currency);
    expect(invoice.subtotalMinor).toBe(contract.subtotalMinor);
    expect(invoice.totalMinor).toBe(contract.totalMinor);
    expect(invoice.lines).toBe(contract.lines);
    expect(invoice.createdById).toBe(staff.id);
  });
});
