import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE } from "@ibtatech/config";
import type { EmailMessage } from "../src/email";
import { setEmailTransport } from "../src/email";
import {
  changeProposalStatus,
  convertWonLeadToClient,
  createAdminUser,
  createLeadProposal,
  getPrisma,
  getPortalProposal,
  hashPassword,
  listLeadActivities,
  loginPortal,
  provisionPortalAccess,
  respondToPortalProposal,
  submitLead,
  type CrmUser,
  type PortalUser,
} from "../src/index";

const ADMIN_EMAIL = "phase21-admin@example.com";
const MAIN_EMAIL = "phase21-main-portal@example.com";
const ALT_EMAIL = "phase21-alt-portal@example.com";
const PORTAL_PASSWORD = "phase21-portal-secret";

const lines = [{ description: "Discovery workshop", quantity: "1", unitPrice: "1500" }];

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

async function createFixtureLead(name: string, email: string, ip: string): Promise<string> {
  const lead = await submitLead(
    { name, email, message: "Lead used for Phase 21 portal proposal coverage.", consent: true },
    ip,
  );
  if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
  return lead.leadId;
}

async function toClient(leadId: string): Promise<string> {
  await getPrisma().lead.update({ where: { id: leadId }, data: { status: "won" } });
  const converted = await convertWonLeadToClient(admin, leadId);
  if (!converted.ok) throw new Error(`client conversion failed: ${converted.error}`);
  return converted.client.id;
}

/** Fresh proposal, immediately sent — the state a portal client answers. */
async function sentProposal(leadId: string, title: string): Promise<string> {
  const created = await createLeadProposal(admin, leadId, {
    title,
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Phase 21 fixture.",
    lines,
  });
  if (!created.ok) throw new Error(`proposal create failed: ${created.error}`);
  const sent = await changeProposalStatus(admin, created.proposal.id, "sent");
  if (!sent.ok) throw new Error(`proposal send failed: ${sent.error}`);
  return created.proposal.id;
}

let admin: CrmUser;

describe("portal proposal response", () => {
  let mainLeadId: string;
  let mainClientId: string;
  let altLeadId: string;
  let altClientId: string;
  let actor: PortalUser;
  let altActor: PortalUser;
  let acceptId: string;
  let declineId: string;
  let draftId: string;
  let foreignId: string;

  beforeAll(async () => {
    clearEmailEnv();

    const created = await createAdminUser({
      email: ADMIN_EMAIL,
      name: "Phase21 Admin",
      passwordHash: hashPassword("correct-horse-battery-staple"),
      role: "admin",
    });
    admin = { id: created.id, email: created.email, name: created.name, role: "admin" };

    mainLeadId = await createFixtureLead(
      "Phase21 Main",
      "phase21-lead-main@example.com",
      "203.0.113.201",
    );
    mainClientId = await toClient(mainLeadId);
    altLeadId = await createFixtureLead(
      "Phase21 Alt",
      "phase21-lead-alt@example.com",
      "203.0.113.202",
    );
    altClientId = await toClient(altLeadId);

    for (const [clientId, email] of [
      [mainClientId, MAIN_EMAIL],
      [altClientId, ALT_EMAIL],
    ] as const) {
      const provisioned = await provisionPortalAccess(admin, clientId, {
        email,
        password: PORTAL_PASSWORD,
      });
      if (!provisioned.ok) throw new Error(`provisioning failed: ${provisioned.error}`);
    }

    const login = await loginPortal(MAIN_EMAIL, PORTAL_PASSWORD, "203.0.113.203");
    const altLogin = await loginPortal(ALT_EMAIL, PORTAL_PASSWORD, "203.0.113.204");
    if (!login.ok || !altLogin.ok) throw new Error("fixture portal logins failed");
    actor = login.user;
    altActor = altLogin.user;

    acceptId = await sentProposal(mainLeadId, "Phase21 Accept");
    declineId = await sentProposal(mainLeadId, "Phase21 Decline");
    foreignId = await sentProposal(altLeadId, "Phase21 Foreign");

    const draft = await createLeadProposal(admin, mainLeadId, {
      title: "Phase21 Draft",
      currency: "GBP",
      validUntil: "2026-12-31",
      lines,
    });
    if (!draft.ok) throw new Error("draft proposal failed");
    draftId = draft.proposal.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    for (const [clientId, leadId] of [
      [mainClientId, mainLeadId],
      [altClientId, altLeadId],
    ] as const) {
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
    }
    await prisma.adminSession.deleteMany({});
    await prisma.adminUser.deleteMany({
      where: { email: { in: [ADMIN_EMAIL, MAIN_EMAIL, ALT_EMAIL] } },
    });
  });

  beforeEach(() => {
    setEmailTransport(async () => ({ delivered: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setEmailTransport(async () => ({ delivered: true }));
  });

  it("rejects anonymous and non-portal principals", async () => {
    expect(await respondToPortalProposal(null, acceptId, "accept")).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const crmActor = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "staff",
      clientId: mainClientId,
    } as unknown as PortalUser;
    expect(await respondToPortalProposal(crmActor, acceptId, "accept")).toEqual({
      ok: false,
      error: "unauthorized",
    });

    const unlinked = {
      id: admin.id,
      email: ALT_EMAIL,
      name: "Unlinked",
      role: "client",
      clientId: null,
    } as unknown as PortalUser;
    expect(await respondToPortalProposal(unlinked, acceptId, "accept")).toEqual({
      ok: false,
      error: "unauthorized",
    });

    // Nothing above touched the proposal.
    expect((await getPortalProposal(actor, acceptId)).ok).toBe(true);
    const row = await getPrisma().proposal.findUnique({ where: { id: acceptId } });
    expect(row?.status).toBe("sent");
  });

  it("validates the decision and the id before touching the record", async () => {
    for (const decision of ["maybe", "", "ACCEPT", null, undefined]) {
      expect(await respondToPortalProposal(actor, acceptId, decision)).toMatchObject({
        ok: false,
        error: "invalid_input",
      });
    }
    expect(await respondToPortalProposal(actor, "not-a-cuid", "accept")).toEqual({
      ok: false,
      error: "not_found",
    });

    const row = await getPrisma().proposal.findUnique({ where: { id: acceptId } });
    expect(row?.status).toBe("sent");
    expect(row?.acceptedAt).toBeNull();
  });

  it("refuses a proposal belonging to another client's lead", async () => {
    expect(await respondToPortalProposal(altActor, acceptId, "accept")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await respondToPortalProposal(actor, foreignId, "decline")).toEqual({
      ok: false,
      error: "not_found",
    });

    const [mainRow, foreignRow] = await Promise.all([
      getPrisma().proposal.findUnique({ where: { id: acceptId } }),
      getPrisma().proposal.findUnique({ where: { id: foreignId } }),
    ]);
    expect(mainRow?.status).toBe("sent");
    expect(foreignRow?.status).toBe("sent");
  });

  it("never answers a draft — drafts stay invisible to the portal", async () => {
    expect(await getPortalProposal(actor, draftId)).toEqual({ ok: false, error: "not_found" });
    expect(await respondToPortalProposal(actor, draftId, "accept")).toEqual({
      ok: false,
      error: "not_found",
    });

    const row = await getPrisma().proposal.findUnique({ where: { id: draftId } });
    expect(row?.status).toBe("draft");
  });

  it("accepts a sent proposal and records the response under the portal user", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    const result = await respondToPortalProposal(actor, acceptId, "accept");
    expect(result).toMatchObject({ ok: true, proposal: { id: acceptId, status: "accepted" } });
    if (!result.ok) return;
    expect(result.proposal.acceptedAt).toBeInstanceOf(Date);
    expect(result.proposal.declinedAt).toBeNull();

    // Still readable in the portal — an answered proposal is not hidden.
    expect(await getPortalProposal(actor, acceptId)).toMatchObject({
      ok: true,
      proposal: { status: "accepted" },
    });

    const row = await getPrisma().proposal.findUnique({ where: { id: acceptId } });
    expect(row?.status).toBe("accepted");
    expect(row?.acceptedAt).toBeInstanceOf(Date);

    const activities = await listLeadActivities(mainLeadId);
    const activity = activities.find((entry) => entry.type === "proposal_accepted");
    expect(activity).toBeDefined();
    expect(activity?.actorId).toBe(actor.id);
    expect(activity?.actor.id).toBe(actor.id);
    expect(JSON.parse(activity?.metadata ?? "{}")).toMatchObject({
      proposalId: acceptId,
      from: "sent",
      to: "accepted",
      source: "portal",
    });

    // The CRM inbox learns about it — the client is never emailed a credential.
    expect(seen).toHaveLength(1);
    expect(seen[0]?.to).toBe(SITE.email);
    expect(seen[0]?.subject).toContain("Phase21 Accept");
    expect(seen[0]?.tags).toContainEqual({ name: "type", value: "proposal-accepted" });

    // Accepted is terminal — not even a CRM actor can reopen or flip it.
    expect(await changeProposalStatus(admin, acceptId, "declined")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("declines a sent proposal without sending an email", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    const result = await respondToPortalProposal(actor, declineId, "decline");
    expect(result).toMatchObject({ ok: true, proposal: { id: declineId, status: "declined" } });
    if (!result.ok) return;
    expect(result.proposal.declinedAt).toBeInstanceOf(Date);
    expect(result.proposal.acceptedAt).toBeNull();

    const row = await getPrisma().proposal.findUnique({ where: { id: declineId } });
    expect(row?.status).toBe("declined");
    expect(row?.declinedAt).toBeInstanceOf(Date);

    const activities = await listLeadActivities(mainLeadId);
    const activity = activities.find((entry) => entry.type === "proposal_declined");
    expect(activity?.actorId).toBe(actor.id);

    // Decline is a state marker only — no template, no send.
    expect(seen).toHaveLength(0);
  });

  it("rejects a second response on an answered proposal", async () => {
    const before = await getPrisma().proposal.findUnique({ where: { id: acceptId } });

    const result = await respondToPortalProposal(actor, acceptId, "decline");
    expect(result).toMatchObject({ ok: false, error: "invalid_transition" });
    if (!result.ok) expect(result.message).toContain("already been answered");

    const after = await getPrisma().proposal.findUnique({ where: { id: acceptId } });
    expect(after?.status).toBe("accepted");
    expect(after?.declinedAt).toBeNull();
    expect(after?.updatedAt).toEqual(before?.updatedAt);
  });
});
