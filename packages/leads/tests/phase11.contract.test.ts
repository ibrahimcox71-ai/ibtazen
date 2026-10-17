import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CONTRACT_STATUSES,
  ContractAlreadyExistsError,
  canContractTransition,
  changeContractStatus,
  convertWonLeadToClient,
  createAdminUser,
  createContractFromProposal,
  createContractWithActivity,
  createLeadProposal,
  ensureBootstrapAdmin,
  findAcceptedProposal,
  findClientByLeadId,
  findContractByProposalId,
  getPrisma,
  hashPassword,
  isContractStatus,
  isLeadActivityType,
  LEAD_ACTIVITY_TYPES,
  listContracts,
  listContractsForActor,
  listLeadActivities,
  listLeadProposals,
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

async function createFixtureLead(
  name: string,
  email: string,
  ip: string,
  company?: string,
): Promise<string> {
  const lead = await submitLead(
    {
      name,
      email,
      message: "Lead used for Phase 11 contract coverage.",
      consent: true,
      ...(company ? { company } : {}),
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
    title: "Phase11 Engagement",
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Accepted for contract snapshot tests.",
    lines: sampleLines,
  });
  if (!created.ok) throw new Error(`proposal create failed: ${created.error}`);
  const proposalId = created.proposal.id;
  // draft → sent → accepted via the service path (repo row updates + activities).
  const { changeProposalStatus } = await import("../src/index");
  const sent = await changeProposalStatus(actor, proposalId, "sent");
  if (!sent.ok) throw new Error("send failed");
  const accepted = await changeProposalStatus(actor, proposalId, "accepted");
  if (!accepted.ok) throw new Error("accept failed");
  return proposalId;
}

describe("contract domain", () => {
  it("exposes contract status vocabulary and activity type", () => {
    expect(CONTRACT_STATUSES).toEqual(["draft", "out_for_signature", "active", "void"]);
    expect(isContractStatus("draft")).toBe(true);
    expect(isContractStatus("signed")).toBe(false);
    expect(LEAD_ACTIVITY_TYPES).toContain("contract_created");
    expect(isLeadActivityType("contract_created")).toBe(true);
    expect(isLeadActivityType("contract")).toBe(false);
  });

  it("allows only the explicit contract transitions", () => {
    expect(canContractTransition("draft", "out_for_signature")).toBe(true);
    expect(canContractTransition("draft", "void")).toBe(true);
    expect(canContractTransition("draft", "active")).toBe(false);
    expect(canContractTransition("out_for_signature", "active")).toBe(true);
    expect(canContractTransition("out_for_signature", "void")).toBe(true);
    expect(canContractTransition("active", "void")).toBe(true);
    expect(canContractTransition("active", "draft")).toBe(false);
    expect(canContractTransition("void", "active")).toBe(false);
    expect(canContractTransition("void", "draft")).toBe(false);
  });
});

describe("contract service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let leadId: string;
  let clientId: string;
  let acceptedProposalId: string;
  let contractId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase11-admin@example.com", "Phase11 Admin", "admin");
    staff = await createOperator("phase11-staff@example.com", "Phase11 Staff", "staff");

    leadId = await createFixtureLead(
      "Phase11 Won Subject",
      "phase11-won@example.com",
      "203.0.113.110",
      "Phase11 Won Co Ltd",
    );
    await getPrisma().lead.update({
      where: { id: leadId },
      data: { status: "won" },
    });
    const converted = await convertWonLeadToClient(staff, leadId);
    if (!converted.ok) throw new Error("client conversion failed");
    clientId = converted.client.id;
    acceptedProposalId = await createAcceptedProposal(leadId, staff);
  });

  afterAll(async () => {
    await getPrisma().contract.deleteMany({ where: { clientId } });
    await getPrisma().client.deleteMany({ where: { leadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId } });
    await getPrisma().lead.deleteMany({ where: { id: leadId } });
    await getPrisma().adminUser.deleteMany({
      where: {
        email: {
          in: [
            "phase11-admin@example.com",
            "phase11-staff@example.com",
            "phase11-other@example.com",
          ],
        },
      },
    });
  });

  it("creates a contract from an accepted proposal (happy path)", async () => {
    const result = await createContractFromProposal(staff, clientId, acceptedProposalId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    contractId = result.contract.id;
    expect(result.contract.status).toBe("draft");
    expect(result.contract.proposalVersion).toBe(1);
    expect(result.contract.createdById).toBe(staff.id);
    expect(result.contract.clientId).toBe(clientId);
    expect(result.contract.proposalId).toBe(acceptedProposalId);
    expect(await findContractByProposalId(acceptedProposalId)).toBeTruthy();
  });

  it("snapshots proposal lines exactly", async () => {
    const contract = await getPrisma().contract.findUnique({ where: { id: contractId } });
    const proposal = await getPrisma().proposal.findUnique({
      where: { id: acceptedProposalId },
    });
    expect(contract).toBeTruthy();
    expect(proposal).toBeTruthy();
    expect(contract?.lines).toBe(proposal?.lines);
    const parsed = JSON.parse(contract?.lines ?? "[]") as Array<{
      description: string;
      quantity: number;
      unitPriceMinor: number;
    }>;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      description: "Discovery workshop",
      quantity: 1,
      unitPriceMinor: 150000,
    });
    expect(parsed[1]).toMatchObject({
      description: "Design hours",
      quantity: 10,
      unitPriceMinor: 9550,
    });
  });

  it("snapshots proposal money exactly (subtotal and total)", async () => {
    const contract = await getPrisma().contract.findUnique({ where: { id: contractId } });
    const proposal = await getPrisma().proposal.findUnique({
      where: { id: acceptedProposalId },
    });
    expect(contract?.subtotalMinor).toBe(proposal?.subtotalMinor);
    expect(contract?.totalMinor).toBe(proposal?.totalMinor);
    // 1500.00 + (10 × 95.50) = 2455.00 → 245500 minor
    expect(contract?.totalMinor).toBe(245500);
    expect(contract?.currency).toBe(proposal?.currency);
    expect(contract?.validUntil).toBe(proposal?.validUntil);
    expect(contract?.title).toBe(proposal?.title);
  });

  it("copies client identity server-side from the Client row", async () => {
    const client = await findClientByLeadId(leadId);
    const contract = await getPrisma().contract.findUnique({ where: { id: contractId } });
    expect(client).toBeTruthy();
    expect(contract).toBeTruthy();
    expect(contract?.clientName).toBe(client?.name);
    expect(contract?.clientEmail).toBe(client?.email);
    expect(contract?.organizationName).toBe(client?.organizationName);
    expect(contract?.organizationName).toBe("Phase11 Won Co Ltd");
  });

  it("rejects a non-accepted proposal", async () => {
    const draftCreated = await createLeadProposal(staff, leadId, {
      title: "Draft only",
      currency: "GBP",
      validUntil: "2026-12-31",
      lines: sampleLines,
    });
    expect(draftCreated.ok).toBe(true);
    if (!draftCreated.ok) return;
    const result = await createContractFromProposal(admin, clientId, draftCreated.proposal.id);
    expect(result).toMatchObject({ ok: false, error: "invalid_status" });
    expect(await findContractByProposalId(draftCreated.proposal.id)).toBeNull();
  });

  it("rejects a proposal that does not belong to the client/lead", async () => {
    const otherLeadId = await createFixtureLead(
      "Phase11 Other Subject",
      "phase11-other-subject@example.com",
      "203.0.113.111",
    );
    await getPrisma().lead.update({ where: { id: otherLeadId }, data: { status: "won" } });
    const otherConverted = await convertWonLeadToClient(admin, otherLeadId);
    expect(otherConverted.ok).toBe(true);
    if (!otherConverted.ok) return;
    const otherProposalId = await createAcceptedProposal(otherLeadId, admin);

    // Cross-wire: this client's lead does not own otherProposalId.
    const result = await createContractFromProposal(admin, clientId, otherProposalId);
    expect(result).toMatchObject({ ok: false, error: "not_found" });
    expect(await findContractByProposalId(otherProposalId)).toBeNull();

    // And the reverse: other client cannot use our accepted proposal.
    const reverse = await createContractFromProposal(
      admin,
      otherConverted.client.id,
      acceptedProposalId,
    );
    expect(reverse).toMatchObject({ ok: false, error: "not_found" });

    await getPrisma().contract.deleteMany({ where: { clientId: otherConverted.client.id } });
    await getPrisma().client.deleteMany({ where: { leadId: otherLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: otherLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: otherLeadId } });
    await getPrisma().lead.delete({ where: { id: otherLeadId } });
  });

  it("rejects unauthorized roles, unauthenticated, and forged actors", async () => {
    expect(await createContractFromProposal(null, clientId, acceptedProposalId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await listContractsForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    expect(await changeContractStatus(null, contractId, "void")).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const clientRole = {
      id: "clientroleid000000000000",
      email: "portal@example.com",
      name: "Portal",
      role: "client",
    } as unknown as CrmUser;
    expect(await createContractFromProposal(clientRole, clientId, acceptedProposalId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await listContractsForActor(clientRole)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await changeContractStatus(clientRole, contractId, "void")).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const superadmin = {
      id: "superadmin00000000000000",
      email: "sa@example.com",
      name: "SA",
      role: "superadmin",
    } as unknown as CrmUser;
    expect(await createContractFromProposal(superadmin, clientId, acceptedProposalId)).toEqual({
      ok: false,
      error: "unauthorized",
    });

    // Forged actor id that does not exist in AdminUser — FK fails, txn rolls back.
    const forged = {
      id: "cmuforgedcontractactor0000",
      email: "forged@example.com",
      name: "Forged",
      role: "admin",
    } as unknown as CrmUser;
    const before = await getPrisma().contract.count();
    const forgedLeadId = await createFixtureLead(
      "Phase11 Forged",
      "phase11-forged@example.com",
      "203.0.113.112",
    );
    await getPrisma().lead.update({ where: { id: forgedLeadId }, data: { status: "won" } });
    const forgedClient = await convertWonLeadToClient(admin, forgedLeadId);
    expect(forgedClient.ok).toBe(true);
    if (!forgedClient.ok) return;
    const forgedProposal = await createAcceptedProposal(forgedLeadId, admin);

    const result = await createContractFromProposal(forged, forgedClient.client.id, forgedProposal);
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(await findContractByProposalId(forgedProposal)).toBeNull();
    expect(await getPrisma().contract.count()).toBe(before);

    await getPrisma().client.deleteMany({ where: { leadId: forgedLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: forgedLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: forgedLeadId } });
    await getPrisma().lead.delete({ where: { id: forgedLeadId } });
  });

  it("rejects invalid cuids and nonexistent client/proposal without leaking data", async () => {
    expect(await createContractFromProposal(admin, "not-a-cuid", acceptedProposalId)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await createContractFromProposal(admin, clientId, "")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(
      await createContractFromProposal(admin, clientId, "cmufakeproposal000000000"),
    ).toMatchObject({ ok: false, error: "not_found" });
    expect(
      await createContractFromProposal(admin, "cmufakeclient00000000000", acceptedProposalId),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await changeContractStatus(admin, "DROP TABLE Contract;--", "void")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await changeContractStatus(admin, "cmufakectr000000000000000", "void")).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("rejects duplicate contract creation", async () => {
    const again = await createContractFromProposal(admin, clientId, acceptedProposalId);
    expect(again).toMatchObject({ ok: false, error: "already_exists" });
    const count = await getPrisma().contract.count({ where: { proposalId: acceptedProposalId } });
    expect(count).toBe(1);
  });

  it("protects concurrent duplicates with the unique proposalId constraint", async () => {
    // Bypass the service pre-check — DB must reject and roll back the activity too.
    const proposal = await getPrisma().proposal.findUnique({
      where: { id: acceptedProposalId },
    });
    const client = await findClientByLeadId(leadId);
    expect(proposal && client).toBeTruthy();
    if (!proposal || !client) return;

    await expect(
      createContractWithActivity({
        clientId,
        proposalId: acceptedProposalId,
        createdById: admin.id,
        leadId,
        proposalVersion: proposal.version,
        title: proposal.title,
        currency: proposal.currency,
        validUntil: proposal.validUntil,
        clientName: client.name,
        clientEmail: client.email,
        organizationName: client.organizationName,
        lines: proposal.lines,
        subtotalMinor: proposal.subtotalMinor,
        totalMinor: proposal.totalMinor,
        activityMetadata: { title: proposal.title },
      }),
    ).rejects.toThrow(ContractAlreadyExistsError);

    const [first, second] = await Promise.all([
      createContractFromProposal(admin, clientId, acceptedProposalId),
      createContractFromProposal(staff, clientId, acceptedProposalId),
    ]);
    expect(first).toMatchObject({ ok: false, error: "already_exists" });
    expect(second).toMatchObject({ ok: false, error: "already_exists" });

    const count = await getPrisma().contract.count({ where: { proposalId: acceptedProposalId } });
    expect(count).toBe(1);
    const activities = await listLeadActivities(leadId);
    expect(activities.filter((a) => a.type === "contract_created")).toHaveLength(1);
  });

  it("creates contract_created activity atomically with the contract", async () => {
    const activities = await listLeadActivities(leadId);
    const created = activities.find((a) => a.type === "contract_created");
    expect(created).toBeTruthy();
    expect(created?.actorId).toBe(staff.id);
    expect(created?.metadata).toBeTruthy();
    const meta = JSON.parse(created?.metadata ?? "{}") as Record<string, unknown>;
    expect(meta.contractId).toBe(contractId);
    expect(meta.clientId).toBe(clientId);
    expect(meta.proposalId).toBe(acceptedProposalId);
    expect(meta.proposalVersion).toBe(1);
    expect(meta.totalMinor).toBe(245500);
    expect(meta.currency).toBe("GBP");
    // No password or session material in metadata.
    expect(meta.passwordHash).toBeUndefined();
    expect(meta.token).toBeUndefined();
  });

  it("leaves no partial contract/activity when the transaction fails", async () => {
    const raceLeadId = await createFixtureLead(
      "Phase11 Race Subject",
      "phase11-race@example.com",
      "203.0.113.113",
    );
    await getPrisma().lead.update({ where: { id: raceLeadId }, data: { status: "won" } });
    const converted = await convertWonLeadToClient(admin, raceLeadId);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const raceProposalId = await createAcceptedProposal(raceLeadId, admin);
    const beforeActivities = await getPrisma().leadActivity.count({
      where: { leadId: raceLeadId, type: "contract_created" },
    });

    const proposal = await getPrisma().proposal.findUnique({
      where: { id: raceProposalId },
    });
    if (!proposal) throw new Error("race proposal missing");

    await expect(
      createContractWithActivity({
        clientId: converted.client.id,
        proposalId: raceProposalId,
        // Actor that does not exist → FK failure mid-transaction.
        createdById: "cmunonexistentactor0000000",
        leadId: raceLeadId,
        proposalVersion: proposal.version,
        title: proposal.title,
        currency: proposal.currency,
        validUntil: proposal.validUntil,
        clientName: "Race",
        clientEmail: "race@example.com",
        lines: proposal.lines,
        subtotalMinor: proposal.subtotalMinor,
        totalMinor: proposal.totalMinor,
        activityMetadata: { title: proposal.title },
      }),
    ).rejects.toThrow();

    expect(await findContractByProposalId(raceProposalId)).toBeNull();
    const afterActivities = await getPrisma().leadActivity.count({
      where: { leadId: raceLeadId, type: "contract_created" },
    });
    expect(afterActivities).toBe(beforeActivities);

    await getPrisma().client.deleteMany({ where: { leadId: raceLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: raceLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: raceLeadId } });
    await getPrisma().lead.delete({ where: { id: raceLeadId } });
  });

  it("applies valid status transitions only", async () => {
    const toSignature = await changeContractStatus(staff, contractId, "out_for_signature");
    expect(toSignature.ok).toBe(true);
    if (toSignature.ok) expect(toSignature.contract.status).toBe("out_for_signature");

    const activate = await changeContractStatus(staff, contractId, "active");
    expect(activate.ok).toBe(true);
    if (activate.ok) expect(activate.contract.status).toBe("active");

    const voided = await changeContractStatus(admin, contractId, "void");
    expect(voided.ok).toBe(true);
    if (voided.ok) expect(voided.contract.status).toBe("void");
  });

  it("rejects invalid status transitions", async () => {
    // From void — nothing allowed.
    expect(await changeContractStatus(admin, contractId, "active")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeContractStatus(admin, contractId, "draft")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeContractStatus(admin, contractId, "void")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeContractStatus(admin, contractId, "signed")).toMatchObject({
      ok: false,
      error: "invalid",
    });

    // Fresh draft cannot jump straight to active (no auto-activation).
    const draftLeadId = await createFixtureLead(
      "Phase11 Draft Status",
      "phase11-draft-status@example.com",
      "203.0.113.114",
    );
    await getPrisma().lead.update({ where: { id: draftLeadId }, data: { status: "won" } });
    const converted = await convertWonLeadToClient(admin, draftLeadId);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const draftProposalId = await createAcceptedProposal(draftLeadId, admin);
    const created = await createContractFromProposal(admin, converted.client.id, draftProposalId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(await changeContractStatus(admin, created.contract.id, "active")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });

    await getPrisma().contract.deleteMany({ where: { clientId: converted.client.id } });
    await getPrisma().client.deleteMany({ where: { leadId: draftLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: draftLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: draftLeadId } });
    await getPrisma().lead.delete({ where: { id: draftLeadId } });
  });

  it("requires CRM access for listing and rejects client role on internal operations", async () => {
    expect(await listContractsForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await listContractsForActor(outsider)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await createContractFromProposal(outsider, clientId, acceptedProposalId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await changeContractStatus(outsider, contractId, "void")).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const allowed = await listContractsForActor(staff);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      expect(allowed.contracts.some((c) => c.id === contractId)).toBe(true);
      // Relationship navigable for IDOR checks.
      const row = allowed.contracts.find((c) => c.id === contractId);
      expect(row?.clientId).toBe(clientId);
      expect(row?.proposal.leadId).toBe(leadId);
      expect(row?.client.leadId).toBe(leadId);
    }
    const direct = await listContracts();
    expect(direct.some((c) => c.id === contractId)).toBe(true);

    // Accepted proposal still findable for the source lead.
    const accepted = await findAcceptedProposal(leadId);
    expect(accepted?.id).toBe(acceptedProposalId);
    const proposals = await listLeadProposals(leadId);
    expect(proposals.some((p) => p.id === acceptedProposalId && p.status === "accepted")).toBe(
      true,
    );
  });
});
