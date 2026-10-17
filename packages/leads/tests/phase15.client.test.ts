import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CONTRACT_STATUSES,
  LEAD_ACTIVITY_TYPES,
  canContractTransition,
  changeContractStatus,
  convertWonLeadToClient,
  createAdminUser,
  createContractFromProposal,
  createInvoiceFromContract,
  createLeadProposal,
  createProjectFromContract,
  ensureBootstrapAdmin,
  getClientDetailForActor,
  getClientForActor,
  getPrisma,
  hashPassword,
  isLeadActivityType,
  listInvoicesByClientId,
  listLeadActivities,
  listProjectsByClientId,
  submitLead,
  updateContractStatusWithActivity,
  type CrmUser,
} from "../src/index";

async function createOperator(
  email: string,
  name: string,
  role: "admin" | "staff" | "client",
): Promise<CrmUser> {
  const user = await createAdminUser({
    email,
    name,
    passwordHash: hashPassword("correct-horse-battery-staple"),
    role,
  });
  return { id: user.id, email: user.email, name: user.name, role: user.role as CrmUser["role"] };
}

// Phase 15 only reads, but every fixture needs its own lead IP: the lead
// limiter is 5 submissions per IP per 10 minutes.
let ipOctet = 0;
async function createFixtureLead(name: string, email: string): Promise<string> {
  ipOctet += 1;
  const lead = await submitLead(
    {
      name,
      email,
      message: "Lead used for Phase 15 client detail coverage.",
      consent: true,
    },
    `198.51.100.${ipOctet}`,
  );
  if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
  return lead.leadId;
}

async function toClient(leadId: string, actor: CrmUser): Promise<string> {
  await getPrisma().lead.update({ where: { id: leadId }, data: { status: "won" } });
  const converted = await convertWonLeadToClient(actor, leadId);
  if (!converted.ok) throw new Error(`client conversion failed: ${converted.error}`);
  return converted.client.id;
}

async function acceptedProposal(leadId: string, actor: CrmUser, title: string): Promise<string> {
  const created = await createLeadProposal(actor, leadId, {
    title,
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Accepted for Phase 15 client detail aggregation tests.",
    lines: [{ description: "Discovery workshop", quantity: "1", unitPrice: "1500" }],
  });
  if (!created.ok) throw new Error(`proposal create failed: ${created.error}`);
  const { changeProposalStatus } = await import("../src/index");
  const sent = await changeProposalStatus(actor, created.proposal.id, "sent");
  if (!sent.ok) throw new Error("send failed");
  const accepted = await changeProposalStatus(actor, created.proposal.id, "accepted");
  if (!accepted.ok) throw new Error("accept failed");
  return created.proposal.id;
}

async function newContract(clientId: string, proposalId: string, actor: CrmUser): Promise<string> {
  const contract = await createContractFromProposal(actor, clientId, proposalId);
  if (!contract.ok) throw new Error(`contract create failed: ${contract.error}`);
  return contract.contract.id;
}

async function activate(contractId: string, actor: CrmUser): Promise<void> {
  const ofs = await changeContractStatus(actor, contractId, "out_for_signature");
  if (!ofs.ok) throw new Error(`out_for_signature failed: ${ofs.error}`);
  const active = await changeContractStatus(actor, contractId, "active");
  if (!active.ok) throw new Error(`activate failed: ${active.error}`);
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

describe("client detail domain", () => {
  it("exposes contract_status_changed in the canonical activity vocabulary", () => {
    expect(LEAD_ACTIVITY_TYPES).toContain("contract_status_changed");
    expect(isLeadActivityType("contract_status_changed")).toBe(true);
    expect(isLeadActivityType("contract_status")).toBe(false);
    expect(isLeadActivityType("contract_changed")).toBe(false);
  });

  it("keeps the contract lifecycle vocabulary unchanged", () => {
    expect(CONTRACT_STATUSES).toEqual(["draft", "out_for_signature", "active", "void"]);
    expect(canContractTransition("draft", "active")).toBe(false);
    expect(canContractTransition("draft", "out_for_signature")).toBe(true);
    expect(canContractTransition("out_for_signature", "active")).toBe(true);
    expect(canContractTransition("active", "void")).toBe(true);
  });
});

describe("client detail service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let outsider: CrmUser;

  let emptyLeadId: string;
  let emptyClientId: string;
  let singleLeadId: string;
  let singleClientId: string;
  let singleContractId: string;
  let multiLeadId: string;
  let multiClientId: string;
  let multiContractA: string;
  let multiContractB: string;
  let otherLeadId: string;
  let otherClientId: string;
  let atomicLeadId: string;
  let atomicClientId: string;
  let atomicContractId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase15-admin@example.com", "Phase15 Admin", "admin");
    staff = await createOperator("phase15-staff@example.com", "Phase15 Staff", "staff");
    outsider = await createOperator("phase15-client@example.com", "Phase15 Portal User", "client");

    emptyLeadId = await createFixtureLead("Phase15 Empty Client", "phase15-empty@example.com");
    emptyClientId = await toClient(emptyLeadId, staff);

    singleLeadId = await createFixtureLead("Phase15 Single Client", "phase15-single@example.com");
    singleClientId = await toClient(singleLeadId, staff);
    singleContractId = await newContract(
      singleClientId,
      await acceptedProposal(singleLeadId, staff, "Phase15 Single Engagement"),
      staff,
    );
    await activate(singleContractId, staff);
    const project = await createProjectFromContract(staff, singleClientId, singleContractId, {
      name: "Phase15 Single Project",
    });
    if (!project.ok) throw new Error(`project create failed: ${project.error}`);
    const invoice = await createInvoiceFromContract(staff, singleContractId);
    if (!invoice.ok) throw new Error(`invoice create failed: ${invoice.error}`);

    multiLeadId = await createFixtureLead("Phase15 Multi Client", "phase15-multi@example.com");
    multiClientId = await toClient(multiLeadId, staff);
    multiContractA = await newContract(
      multiClientId,
      await acceptedProposal(multiLeadId, staff, "Phase15 Engagement A"),
      staff,
    );
    multiContractB = await newContract(
      multiClientId,
      await acceptedProposal(multiLeadId, staff, "Phase15 Engagement B"),
      staff,
    );
    await activate(multiContractA, staff);
    await activate(multiContractB, staff);
    const projectA = await createProjectFromContract(staff, multiClientId, multiContractA, {
      name: "Phase15 Project A",
    });
    if (!projectA.ok) throw new Error(`project A failed: ${projectA.error}`);
    const projectB = await createProjectFromContract(staff, multiClientId, multiContractB, {
      name: "Phase15 Project B",
    });
    if (!projectB.ok) throw new Error(`project B failed: ${projectB.error}`);
    const invoiceA = await createInvoiceFromContract(staff, multiContractA);
    if (!invoiceA.ok) throw new Error(`invoice A failed: ${invoiceA.error}`);
    const invoiceB = await createInvoiceFromContract(staff, multiContractB);
    if (!invoiceB.ok) throw new Error(`invoice B failed: ${invoiceB.error}`);

    otherLeadId = await createFixtureLead("Phase15 Other Client", "phase15-other@example.com");
    otherClientId = await toClient(otherLeadId, admin);
    const otherContract = await newContract(
      otherClientId,
      await acceptedProposal(otherLeadId, admin, "Phase15 Other Engagement"),
      admin,
    );
    await activate(otherContract, admin);
    const otherInvoice = await createInvoiceFromContract(admin, otherContract);
    if (!otherInvoice.ok) throw new Error(`other invoice failed: ${otherInvoice.error}`);

    atomicLeadId = await createFixtureLead("Phase15 Atomic Client", "phase15-atomic@example.com");
    atomicClientId = await toClient(atomicLeadId, admin);
    atomicContractId = await newContract(
      atomicClientId,
      await acceptedProposal(atomicLeadId, admin, "Phase15 Atomic Engagement"),
      admin,
    );
  });

  afterAll(async () => {
    for (const leadId of [emptyLeadId, singleLeadId, multiLeadId, otherLeadId, atomicLeadId]) {
      await cleanupLead(leadId);
    }
  });

  it("reads clients for CRM actors only", async () => {
    expect(await getClientForActor(null, singleClientId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await getClientForActor(outsider, singleClientId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await getClientDetailForActor(null, multiClientId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await getClientDetailForActor(outsider, multiClientId)).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const asStaff = await getClientForActor(staff, singleClientId);
    expect(asStaff.ok).toBe(true);
    if (asStaff.ok) {
      expect(asStaff.client.id).toBe(singleClientId);
      expect(asStaff.client.leadId).toBe(singleLeadId);
      expect(asStaff.client.lead.status).toBe("won");
      expect(typeof asStaff.client.lead.source).toBe("string");
      expect(asStaff.client.createdBy.id).toBe(staff.id);
    }
    expect((await getClientForActor(admin, singleClientId)).ok).toBe(true);
  });

  it("rejects malformed and unknown client ids", async () => {
    expect(await getClientForActor(admin, "not-a-cuid")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getClientForActor(admin, "c0000000000000000000000000")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getClientDetailForActor(staff, "")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getClientDetailForActor(staff, "clients/1")).toEqual({
      ok: false,
      error: "not_found",
    });
    // A well-formed cuid that does not exist must not be distinguishable
    // from a malformed one.
    expect(await getClientDetailForActor(staff, "c0000000000000000000000000")).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("returns an empty aggregate for a client with zero contracts", async () => {
    const result = await getClientDetailForActor(staff, emptyClientId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.client.id).toBe(emptyClientId);
    expect(result.detail.contracts).toEqual([]);
    expect(result.detail.projects).toEqual([]);
    expect(result.detail.invoices).toEqual([]);
    expect(result.detail.activities.length).toBeGreaterThan(0);
    expect(result.detail.activities.some((a) => a.type === "converted_to_client")).toBe(true);
  });

  it("returns exactly one contract for a single-contract client", async () => {
    const result = await getClientDetailForActor(admin, singleClientId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.contracts).toHaveLength(1);
    expect(result.detail.contracts[0]?.id).toBe(singleContractId);
    expect(result.detail.contracts[0]?.clientId).toBe(singleClientId);
    expect(result.detail.contracts[0]?.status).toBe("active");
  });

  it("returns EVERY contract for a multi-contract client without truncation", async () => {
    const direct = await getClientDetailForActor(staff, multiClientId);
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;

    const ids = direct.detail.contracts.map((c) => c.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids).toContain(multiContractA);
    expect(ids).toContain(multiContractB);
    for (const contract of direct.detail.contracts) {
      expect(contract.clientId).toBe(multiClientId);
      expect(contract.client.id).toBe(multiClientId);
      expect(contract.proposal.leadId).toBe(multiLeadId);
    }
    // Every contract is individually addressable - no "first contract only".
    expect(direct.detail.contracts.every((c) => c.id !== singleContractId)).toBe(true);
    expect(direct.detail.contracts[0]?.id).not.toBe(direct.detail.contracts[1]?.id);
  });

  it("aggregates every project scoped strictly to the client", async () => {
    expect(await listProjectsByClientId(multiClientId)).toHaveLength(2);
    const projects = await listProjectsByClientId(multiClientId);
    expect(projects.map((p) => p.contractId).sort()).toEqual(
      [multiContractA, multiContractB].sort(),
    );
    for (const project of projects) {
      expect(project.clientId).toBe(multiClientId);
      expect(project.contract.clientId).toBe(multiClientId);
    }

    expect(await listProjectsByClientId(emptyClientId)).toEqual([]);

    const detail = await getClientDetailForActor(staff, multiClientId);
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.detail.projects).toHaveLength(2);

    const otherProjects = await listProjectsByClientId(otherClientId);
    expect(otherProjects).toEqual([]);
    const singleProjects = await listProjectsByClientId(singleClientId);
    expect(singleProjects).toHaveLength(1);
    expect(singleProjects[0]?.contractId).toBe(singleContractId);
  });

  it("aggregates every invoice through Invoice -> Contract -> Client", async () => {
    const invoices = await listInvoicesByClientId(multiClientId);
    expect(invoices).toHaveLength(2);
    expect(new Set(invoices.map((i) => i.contractId)).size).toBe(2);
    expect(invoices.map((i) => i.contractId).sort()).toEqual(
      [multiContractA, multiContractB].sort(),
    );
    for (const invoice of invoices) {
      expect(invoice.contract.clientId).toBe(multiClientId);
      expect(invoice.contract.client.leadId).toBe(multiLeadId);
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}$/);
    }

    expect(await listInvoicesByClientId(emptyClientId)).toEqual([]);
    expect(await listInvoicesByClientId(singleClientId)).toHaveLength(1);
    expect(await listInvoicesByClientId(otherClientId)).toHaveLength(1);

    const detail = await getClientDetailForActor(admin, multiClientId);
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.detail.invoices).toHaveLength(2);
    expect(detail.detail.invoices.every((i) => i.contract.clientId === multiClientId)).toBe(true);
  });

  it("records contract_status_changed atomically with full commercial metadata", async () => {
    const activities = await listLeadActivities(multiLeadId);
    const changes = activities.filter((a) => a.type === "contract_status_changed");
    // Two transitions per contract (draft -> out_for_signature -> active).
    expect(changes).toHaveLength(4);
    expect(changes.every((a) => a.actor.id === staff.id)).toBe(true);

    const metadata = changes.map((a) => JSON.parse(a.metadata ?? "{}") as Record<string, unknown>);
    const contractIds = new Set(metadata.map((m) => String(m.contractId)));
    expect(contractIds).toEqual(new Set([multiContractA, multiContractB]));
    for (const change of changes) {
      const meta = JSON.parse(change.metadata ?? "{}") as Record<string, unknown>;
      expect(change.fromStatus).toBeTruthy();
      expect(change.toStatus).toBeTruthy();
      expect(meta.fromStatus).toBe(change.fromStatus);
      expect(meta.toStatus).toBe(change.toStatus);
      expect(meta.clientId).toBe(multiClientId);
      expect(typeof meta.title).toBe("string");
      expect(typeof meta.proposalVersion).toBe("number");
      expect(meta.currency).toBe("GBP");
      expect(typeof meta.totalMinor).toBe("number");
      expect(meta.toStatus === "active" || meta.toStatus === "out_for_signature").toBe(true);
    }

    // The stored row agrees with the recorded transition.
    const contractA = await getPrisma().contract.findUnique({ where: { id: multiContractA } });
    expect(contractA?.status).toBe("active");
    const contractB = await getPrisma().contract.findUnique({ where: { id: multiContractB } });
    expect(contractB?.status).toBe("active");
  });

  it("leaves no orphan activity or partial write when the status write fails", async () => {
    const before = await getPrisma().contract.findUnique({ where: { id: atomicContractId } });
    expect(before?.status).toBe("draft");
    const beforeChanges = (await listLeadActivities(atomicLeadId)).filter(
      (a) => a.type === "contract_status_changed",
    );
    expect(beforeChanges).toHaveLength(0);

    // The contract update succeeds first; the activity insert then violates the
    // leadId foreign key, so the whole transaction must roll back.
    await expect(
      updateContractStatusWithActivity({
        id: atomicContractId,
        from: "draft",
        to: "out_for_signature",
        leadId: "c0000000000000000000000000",
        actorId: admin.id,
        metadata: { title: "Phase15 Atomic Engagement" },
      }),
    ).rejects.toThrow();

    const after = await getPrisma().contract.findUnique({ where: { id: atomicContractId } });
    expect(after?.status).toBe("draft");
    const afterChanges = (await listLeadActivities(atomicLeadId)).filter(
      (a) => a.type === "contract_status_changed",
    );
    expect(afterChanges).toHaveLength(0);

    // Invalid transitions are refused before any write at all.
    await expect(
      updateContractStatusWithActivity({
        id: atomicContractId,
        from: "draft",
        to: "active",
        leadId: atomicLeadId,
        actorId: admin.id,
      }),
    ).rejects.toThrow(/invalid_contract_transition/);
    const stillDraft = await getPrisma().contract.findUnique({ where: { id: atomicContractId } });
    expect(stillDraft?.status).toBe("draft");
    expect(
      (await listLeadActivities(atomicLeadId)).filter((a) => a.type === "contract_status_changed"),
    ).toHaveLength(0);
  });

  it("returns a newest-first unified timeline covering every record type", async () => {
    const result = await getClientDetailForActor(staff, multiClientId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { activities } = result.detail;
    expect(activities.length).toBeGreaterThan(0);
    for (const activity of activities) {
      expect(activity.actor).toBeTruthy();
      expect(typeof activity.type).toBe("string");
      expect(activity.createdAt).toBeInstanceOf(Date);
    }

    const types = new Set(activities.map((a) => a.type));
    expect(types).toContain("converted_to_client");
    expect(types).toContain("contract_created");
    expect(types).toContain("contract_status_changed");
    expect(types).toContain("project_created");
    expect(types).toContain("invoice_created");
    expect(types).toContain("proposal_created");

    // Newest first.
    for (let i = 1; i < activities.length; i++) {
      const previous = new Date(activities[i - 1]!.createdAt).getTime();
      const current = new Date(activities[i]!.createdAt).getTime();
      expect(previous).toBeGreaterThanOrEqual(current);
    }

    // The timeline is scoped to this client's lead only.
    const foreign = activities.find(
      (a) => a.type === "converted_to_client" && a.leadId !== multiLeadId,
    );
    expect(foreign).toBeUndefined();
    expect(activities.every((a) => a.leadId === multiLeadId)).toBe(true);
  });

  it("never leaks another client's contracts, projects, or invoices", async () => {
    // Single-tenant CRM: the isolation boundary is the CRM role, not a
    // per-client tenant. Every non-CRM actor is refused for any client id.
    for (const clientId of [multiClientId, otherClientId]) {
      expect(await getClientDetailForActor(outsider, clientId)).toEqual({
        ok: false,
        error: "unauthorized",
      });
      expect(await getClientForActor(null, clientId)).toEqual({
        ok: false,
        error: "unauthorized",
      });
    }

    const multi = await getClientDetailForActor(staff, multiClientId);
    const other = await getClientDetailForActor(staff, otherClientId);
    expect(multi.ok).toBe(true);
    expect(other.ok).toBe(true);
    if (!multi.ok || !other.ok) return;

    const multiContractIds = new Set(multi.detail.contracts.map((c) => c.id));
    const otherContractIds = new Set(other.detail.contracts.map((c) => c.id));
    expect([...multiContractIds].filter((id) => otherContractIds.has(id))).toEqual([]);
    expect(multiContractIds.has(otherClientId)).toBe(false);

    const multiInvoiceIds = new Set(multi.detail.invoices.map((i) => i.id));
    const otherInvoiceIds = new Set(other.detail.invoices.map((i) => i.id));
    expect([...multiInvoiceIds].filter((id) => otherInvoiceIds.has(id))).toEqual([]);
    expect(multi.detail.invoices.every((i) => i.contract.clientId === multiClientId)).toBe(true);
    expect(other.detail.invoices.every((i) => i.contract.clientId === otherClientId)).toBe(true);

    expect(multi.detail.projects.every((p) => p.clientId === multiClientId)).toBe(true);
    expect(other.detail.projects.every((p) => p.clientId === otherClientId)).toBe(true);

    expect(multi.detail.client.id).toBe(multiClientId);
    expect(other.detail.client.id).toBe(otherClientId);
    expect(multi.detail.client.leadId).toBe(multiLeadId);
    expect(other.detail.client.leadId).toBe(otherLeadId);
    expect(multi.detail.activities.every((a) => a.leadId === multiLeadId)).toBe(true);
    expect(other.detail.activities.every((a) => a.leadId === otherLeadId)).toBe(true);
  });
});
