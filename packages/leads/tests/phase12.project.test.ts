import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PROJECT_STATUSES,
  ProjectAlreadyExistsError,
  canProjectTransition,
  changeContractStatus,
  changeProjectStatus,
  convertWonLeadToClient,
  createAdminUser,
  createContractFromProposal,
  createLeadProposal,
  createProjectFromContract,
  createProjectWithActivity,
  ensureBootstrapAdmin,
  findClientByLeadId,
  findProjectByContractId,
  getProjectForActor,
  getPrisma,
  hashPassword,
  isLeadActivityType,
  isProjectStatus,
  LEAD_ACTIVITY_TYPES,
  listLeadActivities,
  listProjects,
  listProjectsForActor,
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
      message: "Lead used for Phase 12 project coverage.",
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
    title: "Phase12 Engagement",
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Accepted for project registry tests.",
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

async function createActiveContract(
  leadId: string,
  actor: CrmUser,
): Promise<{ clientId: string; contractId: string; proposalId: string }> {
  await getPrisma().lead.update({ where: { id: leadId }, data: { status: "won" } });
  const converted = await convertWonLeadToClient(actor, leadId);
  if (!converted.ok) throw new Error("client conversion failed");
  const proposalId = await createAcceptedProposal(leadId, actor);
  const contract = await createContractFromProposal(actor, converted.client.id, proposalId);
  if (!contract.ok) throw new Error("contract create failed");
  const ofs = await changeContractStatus(actor, contract.contract.id, "out_for_signature");
  if (!ofs.ok) throw new Error("out_for_signature failed");
  const active = await changeContractStatus(actor, contract.contract.id, "active");
  if (!active.ok) throw new Error("activate failed");
  return { clientId: converted.client.id, contractId: contract.contract.id, proposalId };
}

describe("project domain", () => {
  it("exposes canonical project status vocabulary and activity types", () => {
    expect(PROJECT_STATUSES).toEqual([
      "planning",
      "active",
      "review",
      "paused",
      "completed",
      "archived",
    ]);
    expect(isProjectStatus("planning")).toBe(true);
    expect(isProjectStatus("on_hold")).toBe(false);
    expect(isProjectStatus("cancelled")).toBe(false);
    expect(LEAD_ACTIVITY_TYPES).toContain("project_created");
    expect(LEAD_ACTIVITY_TYPES).toContain("project_status_changed");
    expect(isLeadActivityType("project_created")).toBe(true);
    expect(isLeadActivityType("project")).toBe(false);
  });

  it("allows only the explicit project transitions", () => {
    expect(canProjectTransition("planning", "active")).toBe(true);
    expect(canProjectTransition("planning", "archived")).toBe(true);
    expect(canProjectTransition("planning", "completed")).toBe(false);
    expect(canProjectTransition("planning", "review")).toBe(false);
    expect(canProjectTransition("active", "review")).toBe(true);
    expect(canProjectTransition("active", "paused")).toBe(true);
    expect(canProjectTransition("active", "archived")).toBe(true);
    expect(canProjectTransition("active", "planning")).toBe(false);
    expect(canProjectTransition("active", "completed")).toBe(false);
    expect(canProjectTransition("review", "active")).toBe(true);
    expect(canProjectTransition("review", "completed")).toBe(true);
    expect(canProjectTransition("review", "paused")).toBe(true);
    expect(canProjectTransition("review", "archived")).toBe(false);
    expect(canProjectTransition("paused", "active")).toBe(true);
    expect(canProjectTransition("paused", "archived")).toBe(true);
    expect(canProjectTransition("paused", "review")).toBe(false);
    expect(canProjectTransition("completed", "archived")).toBe(true);
    expect(canProjectTransition("completed", "active")).toBe(false);
    expect(canProjectTransition("archived", "active")).toBe(false);
    expect(canProjectTransition("archived", "planning")).toBe(false);
    expect(canProjectTransition("archived", "completed")).toBe(false);
  });
});

describe("project service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let leadId: string;
  let clientId: string;
  let contractId: string;
  let projectId: string;
  let inactiveContractId: string;
  let inactiveClientId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase12-admin@example.com", "Phase12 Admin", "admin");
    staff = await createOperator("phase12-staff@example.com", "Phase12 Staff", "staff");

    leadId = await createFixtureLead(
      "Phase12 Project Subject",
      "phase12-project@example.com",
      "203.0.113.120",
    );
    const active = await createActiveContract(leadId, staff);
    clientId = active.clientId;
    contractId = active.contractId;

    // Separate fixture with a non-active contract for precondition tests.
    const draftLeadId = await createFixtureLead(
      "Phase12 Draft Subject",
      "phase12-draft@example.com",
      "203.0.113.121",
    );
    await getPrisma().lead.update({ where: { id: draftLeadId }, data: { status: "won" } });
    const draftConverted = await convertWonLeadToClient(admin, draftLeadId);
    if (!draftConverted.ok) throw new Error("draft client conversion failed");
    inactiveClientId = draftConverted.client.id;
    const draftProposalId = await createAcceptedProposal(draftLeadId, admin);
    const draftContract = await createContractFromProposal(
      admin,
      inactiveClientId,
      draftProposalId,
    );
    if (!draftContract.ok) throw new Error("draft contract failed");
    inactiveContractId = draftContract.contract.id;
  });

  afterAll(async () => {
    await getPrisma().project.deleteMany({ where: { clientId } });
    await getPrisma().project.deleteMany({ where: { clientId: inactiveClientId } });
    const inactiveLead = await getPrisma().client.findUnique({
      where: { id: inactiveClientId },
      select: { leadId: true },
    });
    await getPrisma().contract.deleteMany({ where: { clientId } });
    await getPrisma().contract.deleteMany({ where: { clientId: inactiveClientId } });
    await getPrisma().client.deleteMany({ where: { id: inactiveClientId } });
    await getPrisma().client.deleteMany({ where: { leadId } });
    if (inactiveLead) {
      await getPrisma().leadActivity.deleteMany({ where: { leadId: inactiveLead.leadId } });
      await getPrisma().proposal.deleteMany({ where: { leadId: inactiveLead.leadId } });
      await getPrisma().lead.deleteMany({ where: { id: inactiveLead.leadId } });
    }
    await getPrisma().leadActivity.deleteMany({ where: { leadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId } });
    await getPrisma().lead.deleteMany({ where: { id: leadId } });
    await getPrisma().adminUser.deleteMany({
      where: {
        email: {
          in: [
            "phase12-admin@example.com",
            "phase12-staff@example.com",
            "phase12-other@example.com",
          ],
        },
      },
    });
  });

  it("creates a project from an active contract (happy path)", async () => {
    const result = await createProjectFromContract(staff, clientId, contractId, {
      name: "Phase12 Delivery",
      description: "Registry delivery project",
      startDate: "2026-10-01",
      targetEndDate: "2026-12-15",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    projectId = result.project.id;
    expect(result.project.status).toBe("planning");
    expect(result.project.createdById).toBe(staff.id);
    expect(result.project.clientId).toBe(clientId);
    expect(result.project.contractId).toBe(contractId);
    expect(result.project.name).toBe("Phase12 Delivery");
    expect(result.project.startDate).toBe("2026-10-01");
    expect(result.project.targetEndDate).toBe("2026-12-15");
    // No money fields on project.
    expect(result.project).not.toHaveProperty("totalMinor");
    expect(result.project).not.toHaveProperty("currency");
    expect(await findProjectByContractId(contractId)).toBeTruthy();

    const activities = await listLeadActivities(leadId);
    const created = activities.find((a) => a.type === "project_created");
    expect(created).toBeTruthy();
    expect(created?.actorId).toBe(staff.id);
    const meta = JSON.parse(created?.metadata ?? "{}") as Record<string, unknown>;
    expect(meta.projectId).toBe(projectId);
    expect(meta.contractId).toBe(contractId);
    expect(meta.clientId).toBe(clientId);
  });

  it("rejects duplicate project for the same contract", async () => {
    expect(
      await createProjectFromContract(admin, clientId, contractId, { name: "Dup" }),
    ).toMatchObject({ ok: false, error: "already_exists" });
    expect(await findProjectByContractId(contractId)).toBeTruthy();
  });

  it("rejects non-active contracts (draft)", async () => {
    expect(
      await createProjectFromContract(admin, inactiveClientId, inactiveContractId, {
        name: "Should not open",
      }),
    ).toMatchObject({ ok: false, error: "invalid_status" });
  });

  it("rejects non-active contracts (out_for_signature)", async () => {
    const ofsLeadId = await createFixtureLead(
      "Phase12 OFS Subject",
      "phase12-ofs@example.com",
      "203.0.113.122",
    );
    await getPrisma().lead.update({ where: { id: ofsLeadId }, data: { status: "won" } });
    const converted = await convertWonLeadToClient(admin, ofsLeadId);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const proposalId = await createAcceptedProposal(ofsLeadId, admin);
    const contract = await createContractFromProposal(admin, converted.client.id, proposalId);
    expect(contract.ok).toBe(true);
    if (!contract.ok) return;
    const ofs = await changeContractStatus(admin, contract.contract.id, "out_for_signature");
    expect(ofs.ok).toBe(true);

    expect(
      await createProjectFromContract(admin, converted.client.id, contract.contract.id, {
        name: "OFS project",
      }),
    ).toMatchObject({ ok: false, error: "invalid_status" });

    // void path
    const voided = await changeContractStatus(admin, contract.contract.id, "void");
    expect(voided.ok).toBe(true);
    expect(
      await createProjectFromContract(admin, converted.client.id, contract.contract.id, {
        name: "Void project",
      }),
    ).toMatchObject({ ok: false, error: "invalid_status" });

    await getPrisma().project.deleteMany({ where: { clientId: converted.client.id } });
    await getPrisma().contract.deleteMany({ where: { clientId: converted.client.id } });
    await getPrisma().client.deleteMany({ where: { leadId: ofsLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: ofsLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: ofsLeadId } });
    await getPrisma().lead.delete({ where: { id: ofsLeadId } });
  });

  it("rejects nonexistent client/contract and invalid CUIDs", async () => {
    expect(
      await createProjectFromContract(admin, "c0000000000000000000000000", contractId, {
        name: "x",
      }),
    ).toMatchObject({ ok: false, error: "not_found" });
    expect(
      await createProjectFromContract(admin, clientId, "c0000000000000000000000000", { name: "x" }),
    ).toMatchObject({ ok: false, error: "not_found" });
    expect(
      await createProjectFromContract(admin, "not-a-cuid", contractId, { name: "x" }),
    ).toMatchObject({ ok: false, error: "not_found" });
    expect(
      await createProjectFromContract(admin, clientId, "not-a-cuid", { name: "x" }),
    ).toMatchObject({ ok: false, error: "not_found" });
  });

  it("rejects empty project name", async () => {
    // Use inactive path first to hit name validation before status when possible.
    // Name is validated after cuid guards but before client load for blank names.
    expect(
      await createProjectFromContract(admin, clientId, contractId, { name: "   " }),
    ).toMatchObject({ ok: false, error: "invalid" });
  });

  it("rejects IDOR: contract not belonging to supplied client", async () => {
    const otherLeadId = await createFixtureLead(
      "Phase12 Other Subject",
      "phase12-other@example.com",
      "203.0.113.123",
    );
    await getPrisma().lead.update({ where: { id: otherLeadId }, data: { status: "won" } });
    const other = await convertWonLeadToClient(admin, otherLeadId);
    expect(other.ok).toBe(true);
    if (!other.ok) return;

    // Mismatched: real contract + different client → not_found
    expect(
      await createProjectFromContract(admin, other.client.id, contractId, {
        name: "IDOR attempt",
      }),
    ).toMatchObject({ ok: false, error: "not_found" });

    await getPrisma().client.deleteMany({ where: { leadId: otherLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: otherLeadId } });
    await getPrisma().lead.delete({ where: { id: otherLeadId } });
  });

  it("rejects client/non-CRM actors and unauthenticated actors", async () => {
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await listProjectsForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    expect(await listProjectsForActor(outsider)).toEqual({ ok: false, error: "unauthorized" });
    expect(await createProjectFromContract(outsider, clientId, contractId, { name: "x" })).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await changeProjectStatus(outsider, projectId, "active")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await changeProjectStatus(null, projectId, "active")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await createProjectFromContract(null, clientId, contractId, { name: "x" })).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("lists projects for CRM actors with navigable relations", async () => {
    const allowed = await listProjectsForActor(staff);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      const row = allowed.projects.find((p) => p.id === projectId);
      expect(row).toBeTruthy();
      expect(row?.clientId).toBe(clientId);
      expect(row?.contractId).toBe(contractId);
      expect(row?.contract.clientId).toBe(clientId);
      expect(row?.client.leadId).toBe(leadId);
      expect(row?.createdBy.id).toBe(staff.id);
    }
    const all = await listProjects();
    expect(all.some((p) => p.id === projectId)).toBe(true);
  });

  it("applies valid status transitions with atomic activity", async () => {
    const toActive = await changeProjectStatus(staff, projectId, "active");
    expect(toActive.ok).toBe(true);
    if (toActive.ok) expect(toActive.project.status).toBe("active");

    const toReview = await changeProjectStatus(admin, projectId, "review");
    expect(toReview.ok).toBe(true);
    if (toReview.ok) expect(toReview.project.status).toBe("review");

    const toCompleted = await changeProjectStatus(admin, projectId, "completed");
    expect(toCompleted.ok).toBe(true);
    if (toCompleted.ok) expect(toCompleted.project.status).toBe("completed");

    const activities = await listLeadActivities(leadId);
    const statusChanges = activities.filter((a) => a.type === "project_status_changed");
    expect(statusChanges.length).toBeGreaterThanOrEqual(3);
    const latest = statusChanges[0];
    expect(latest).toBeTruthy();
    if (!latest) return;
    expect(latest.fromStatus).toBeTruthy();
    expect(latest.toStatus).toBeTruthy();
    const meta = JSON.parse(latest.metadata ?? "{}") as Record<string, unknown>;
    expect(meta.projectId).toBe(projectId);
    expect(meta.fromStatus).toBe(latest.fromStatus);
    expect(meta.toStatus).toBe(latest.toStatus);
  });

  it("rejects invalid status transitions", async () => {
    // completed → active is invalid
    expect(await changeProjectStatus(admin, projectId, "active")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeProjectStatus(admin, projectId, "planning")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeProjectStatus(admin, projectId, "completed")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeProjectStatus(admin, projectId, "bogus")).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await changeProjectStatus(admin, "not-a-cuid", "active")).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await changeProjectStatus(admin, "c0000000000000000000000000", "active")).toMatchObject({
      ok: false,
      error: "not_found",
    });

    // completed → archived is valid and terminal
    const archived = await changeProjectStatus(admin, projectId, "archived");
    expect(archived.ok).toBe(true);
    if (archived.ok) expect(archived.project.status).toBe("archived");
    expect(await changeProjectStatus(admin, projectId, "active")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(await changeProjectStatus(admin, projectId, "archived")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("allows only one project per contract under concurrent creates", async () => {
    const concurrencyLeadId = await createFixtureLead(
      "Phase12 Concurrency",
      "phase12-concurrency@example.com",
      "203.0.113.124",
    );
    const active = await createActiveContract(concurrencyLeadId, admin);
    const attempt = () =>
      createProjectFromContract(admin, active.clientId, active.contractId, {
        name: "Race",
      });
    const results = await Promise.all([attempt(), attempt(), attempt()]);
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);
    for (const f of failures) {
      expect(f).toMatchObject({ ok: false, error: "already_exists" });
    }
    const projects = await getPrisma().project.findMany({
      where: { contractId: active.contractId },
    });
    expect(projects).toHaveLength(1);
    const activities = await listLeadActivities(concurrencyLeadId);
    expect(activities.filter((a) => a.type === "project_created")).toHaveLength(1);

    // Cleanup
    await getPrisma().project.deleteMany({ where: { clientId: active.clientId } });
    await getPrisma().contract.deleteMany({ where: { clientId: active.clientId } });
    await getPrisma().client.deleteMany({ where: { leadId: concurrencyLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: concurrencyLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: concurrencyLeadId } });
    await getPrisma().lead.delete({ where: { id: concurrencyLeadId } });
  });

  it("rolls back project insert when activity write fails (atomicity)", async () => {
    const atomicLeadId = await createFixtureLead(
      "Phase12 Atomic",
      "phase12-atomic@example.com",
      "203.0.113.125",
    );
    const active = await createActiveContract(atomicLeadId, admin);

    await expect(
      createProjectWithActivity({
        clientId: active.clientId,
        contractId: active.contractId,
        createdById: admin.id,
        name: "Atomic",
        status: "planning",
        leadId: active.clientId, // wrong: not a lead id — FK will fail... use failActivity
        activityMetadata: {},
        failActivity: true,
      }),
    ).rejects.toThrow();

    // Project must not remain; no orphan activity.
    expect(await findProjectByContractId(active.contractId)).toBeNull();
    const activities = await listLeadActivities(atomicLeadId);
    expect(activities.filter((a) => a.type === "project_created")).toHaveLength(0);

    await getPrisma().contract.deleteMany({ where: { clientId: active.clientId } });
    await getPrisma().client.deleteMany({ where: { leadId: atomicLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: atomicLeadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId: atomicLeadId } });
    await getPrisma().lead.delete({ where: { id: atomicLeadId } });
  });

  it("maps domain ProjectAlreadyExistsError from unique constraint", async () => {
    // Direct repository double-insert path.
    const existing = await findProjectByContractId(contractId);
    expect(existing).toBeTruthy();
    if (!existing) return;
    await expect(
      createProjectWithActivity({
        clientId,
        contractId,
        createdById: admin.id,
        name: "Second",
        status: "planning",
        leadId,
        activityMetadata: {},
      }),
    ).rejects.toBeInstanceOf(ProjectAlreadyExistsError);
  });

  it("keeps client relationship coherent after creation", async () => {
    const client = await findClientByLeadId(leadId);
    expect(client?.id).toBe(clientId);
    const contract = await getPrisma().contract.findUnique({ where: { id: contractId } });
    expect(contract?.clientId).toBe(clientId);
    expect(contract?.status).toBe("active");
    const project = await findProjectByContractId(contractId);
    expect(project?.clientId).toBe(clientId);
  });

  it("loads project detail for CRM actors with relationship context (Phase 13)", async () => {
    expect(await getProjectForActor(null, projectId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await getProjectForActor(outsider, projectId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await getProjectForActor(admin, "not-a-cuid")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getProjectForActor(admin, "c0000000000000000000000000")).toEqual({
      ok: false,
      error: "not_found",
    });

    const result = await getProjectForActor(staff, projectId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.id).toBe(projectId);
    expect(result.project.client.leadId).toBe(leadId);
    expect(result.project.client.id).toBe(clientId);
    expect(result.project.contract.id).toBe(contractId);
    expect(result.project.contract.clientId).toBe(clientId);
    expect(result.project.createdBy.id).toBe(staff.id);
    expect(result.project.status).toBe("archived");
  });
});
