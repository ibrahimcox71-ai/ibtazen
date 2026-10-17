import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  changeContractStatus,
  changeInvoiceStatus,
  changeProposalStatus,
  convertWonLeadToClient,
  createAdminUser,
  createContractFromProposal,
  createInvoiceFromContract,
  createLeadProposal,
  createProjectFromContract,
  getPortalAccessForActor,
  getPortalInvoice,
  getPortalOverview,
  getPortalProject,
  getPortalProposal,
  getPrisma,
  hashPassword,
  listPortalInvoices,
  listPortalProjects,
  listPortalProposals,
  loginAdmin,
  loginPortal,
  provisionPortalAccess,
  resetLoginRateLimiter,
  resolvePortalSession,
  resolveSession,
  submitLead,
  type CrmUser,
  type PortalUser,
} from "../src/index";

const PORTAL_A_EMAIL = "portal-a@example.com";
const PORTAL_A_PASSWORD = "portal-login-secret-a";
const PORTAL_B_EMAIL = "portal-b@example.com";
const PORTAL_B_PASSWORD = "portal-login-secret-b";

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

// Every fixture needs its own lead IP: the lead limiter is 5 per IP / 10 min.
let ipOctet = 0;
async function createFixtureLead(name: string, email: string): Promise<string> {
  ipOctet += 1;
  const lead = await submitLead(
    {
      name,
      email,
      message: "Lead used for Client Portal coverage.",
      consent: true,
    },
    `198.51.100.${200 + ipOctet}`,
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
    notes: "Portal-visible proposal.",
    lines: [{ description: "Discovery workshop", quantity: "1", unitPrice: "1500" }],
  });
  if (!created.ok) throw new Error(`proposal create failed: ${created.error}`);
  const sent = await changeProposalStatus(actor, created.proposal.id, "sent");
  if (!sent.ok) throw new Error("send failed");
  const accepted = await changeProposalStatus(actor, created.proposal.id, "accepted");
  if (!accepted.ok) throw new Error("accept failed");
  return created.proposal.id;
}

async function draftProposal(leadId: string, actor: CrmUser, title: string): Promise<string> {
  const created = await createLeadProposal(actor, leadId, {
    title,
    currency: "GBP",
    validUntil: "2026-12-31",
    notes: "Internal draft — must never reach the portal.",
    lines: [{ description: "Internal sketch", quantity: "1", unitPrice: "100" }],
  });
  if (!created.ok) throw new Error(`draft proposal failed: ${created.error}`);
  return created.proposal.id;
}

async function activeContract(
  clientId: string,
  proposalId: string,
  actor: CrmUser,
): Promise<string> {
  const contract = await createContractFromProposal(actor, clientId, proposalId);
  if (!contract.ok) throw new Error(`contract create failed: ${contract.error}`);
  const ofs = await changeContractStatus(actor, contract.contract.id, "out_for_signature");
  if (!ofs.ok) throw new Error("out_for_signature failed");
  const active = await changeContractStatus(actor, contract.contract.id, "active");
  if (!active.ok) throw new Error("activate failed");
  return contract.contract.id;
}

async function cleanupLead(leadId: string): Promise<void> {
  const prisma = getPrisma();
  const client = await prisma.client.findUnique({ where: { leadId } });
  if (client) {
    // Cascades the linked portal AdminUser (AdminUser.clientId → Client).
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

describe("client portal (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let unlinked: CrmUser;

  let leadA: string;
  let clientA: string;
  let acceptedA: string;
  let acceptedA2: string;
  let draftA: string;
  let contractA: string;
  let contractA2: string;
  let projectA: string;
  let sentInvoiceA: string;
  let draftInvoiceA: string;

  let leadB: string;
  let clientB: string;
  let acceptedB: string;
  let contractB: string;
  let projectB: string;
  let sentInvoiceB: string;

  beforeAll(async () => {
    admin = await createOperator("portal-admin@example.com", "Portal Admin", "admin");
    staff = await createOperator("portal-staff@example.com", "Portal Staff", "staff");
    unlinked = await createOperator("portal-unlinked@example.com", "Portal Unlinked", "client");

    // Client A: two accepted proposals (one contract each), one draft
    // proposal, one sent invoice, one draft invoice, one project.
    leadA = await createFixtureLead("Portal Client A", "portal-lead-a@example.com");
    clientA = await toClient(leadA, staff);
    const a1 = await acceptedProposal(leadA, staff, "Portal A Engagement");
    acceptedA = a1;
    draftA = await draftProposal(leadA, staff, "Portal A Internal Draft");
    contractA = await activeContract(clientA, a1, staff);
    const a2 = await acceptedProposal(leadA, staff, "Portal A Phase Two");
    acceptedA2 = a2;
    contractA2 = await activeContract(clientA, a2, staff);

    const projectResult = await createProjectFromContract(staff, clientA, contractA, {
      name: "Portal A Build",
      description: "Visible to client A only.",
    });
    if (!projectResult.ok) throw new Error("project A failed");
    projectA = projectResult.project.id;

    const invoiceA = await createInvoiceFromContract(staff, contractA);
    if (!invoiceA.ok) throw new Error("invoice A failed");
    const sentA = await changeInvoiceStatus(staff, invoiceA.invoice.id, "sent");
    if (!sentA.ok) throw new Error("invoice A send failed");
    sentInvoiceA = sentA.invoice.id;

    const invoiceA2 = await createInvoiceFromContract(staff, contractA2);
    if (!invoiceA2.ok) throw new Error("invoice A2 failed");
    draftInvoiceA = invoiceA2.invoice.id; // stays draft — must be hidden

    // Client B: the isolation counterpart.
    leadB = await createFixtureLead("Portal Client B", "portal-lead-b@example.com");
    clientB = await toClient(leadB, admin);
    acceptedB = await acceptedProposal(leadB, admin, "Portal B Engagement");
    contractB = await activeContract(clientB, acceptedB, admin);
    const projectResultB = await createProjectFromContract(admin, clientB, contractB, {
      name: "Portal B Build",
    });
    if (!projectResultB.ok) throw new Error("project B failed");
    projectB = projectResultB.project.id;
    const invoiceB = await createInvoiceFromContract(admin, contractB);
    if (!invoiceB.ok) throw new Error("invoice B failed");
    const sentB = await changeInvoiceStatus(admin, invoiceB.invoice.id, "sent");
    if (!sentB.ok) throw new Error("invoice B send failed");
    sentInvoiceB = sentB.invoice.id;
  });

  afterAll(async () => {
    for (const leadId of [leadA, leadB]) await cleanupLead(leadId);
    const prisma = getPrisma();
    await prisma.adminSession.deleteMany({});
    await prisma.adminUser.deleteMany({
      where: {
        email: {
          in: [
            "portal-admin@example.com",
            "portal-staff@example.com",
            "portal-unlinked@example.com",
            PORTAL_A_EMAIL,
            PORTAL_B_EMAIL,
          ],
        },
      },
    });
  });

  beforeEach(() => {
    resetLoginRateLimiter();
  });

  // ── Provisioning ────────────────────────────────────────────────────

  it("provisions portal access with admin-only authorization", async () => {
    expect(await provisionPortalAccess(null, clientA, {})).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(
      await provisionPortalAccess(staff, clientA, {
        email: PORTAL_A_EMAIL,
        password: PORTAL_A_PASSWORD,
      }),
    ).toEqual({ ok: false, error: "unauthorized" });
    expect(await getPortalAccessForActor(staff, clientA)).toEqual({
      ok: false,
      error: "unauthorized",
    });

    expect(
      await provisionPortalAccess(admin, "c0000000000000000000000000", {
        email: "nobody@example.com",
        password: PORTAL_A_PASSWORD,
      }),
    ).toEqual({ ok: false, error: "not_found" });

    expect(
      await provisionPortalAccess(admin, clientA, { email: "not-an-email", password: "short" }),
    ).toMatchObject({ ok: false, error: "invalid_input" });

    const created = await provisionPortalAccess(admin, clientA, {
      email: PORTAL_A_EMAIL,
      password: PORTAL_A_PASSWORD,
    });
    expect(created).toMatchObject({ ok: true, access: { provisioned: true, active: true } });

    const state = await getPortalAccessForActor(admin, clientA);
    expect(state).toMatchObject({ ok: true, access: { provisioned: true, email: PORTAL_A_EMAIL } });
  });

  it("keeps one login per client and rejects colliding emails", async () => {
    const duplicate = await provisionPortalAccess(admin, clientB, {
      email: PORTAL_A_EMAIL,
      password: PORTAL_B_PASSWORD,
    });
    expect(duplicate).toEqual({
      ok: false,
      error: "email_taken",
      message: "That email is already in use by another account.",
    });

    const second = await provisionPortalAccess(admin, clientB, {
      email: PORTAL_B_EMAIL,
      password: PORTAL_B_PASSWORD,
    });
    expect(second).toMatchObject({ ok: true, access: { provisioned: true } });

    // Re-provisioning the same client resets — never duplicates.
    const reset = await provisionPortalAccess(admin, clientA, {
      email: PORTAL_A_EMAIL,
      password: "rotated-portal-secret",
    });
    expect(reset).toMatchObject({ ok: true });
    const linked = await getPrisma().adminUser.count({ where: { clientId: clientA } });
    expect(linked).toBe(1);

    // Password rotation: old credential dies, new one works.
    expect(await loginPortal(PORTAL_A_EMAIL, PORTAL_A_PASSWORD, "203.0.113.9")).toMatchObject({
      ok: false,
      error: "invalid_credentials",
    });
    expect(await loginPortal(PORTAL_A_EMAIL, "rotated-portal-secret", "203.0.113.9")).toMatchObject(
      {
        ok: true,
      },
    );
    // Restore the shared fixture password for the read tests.
    await provisionPortalAccess(admin, clientA, {
      email: PORTAL_A_EMAIL,
      password: PORTAL_A_PASSWORD,
    });
  });

  // ── Auth flow ───────────────────────────────────────────────────────

  it("opens portal sessions only for linked portal-role users", async () => {
    const result = await loginPortal(PORTAL_A_EMAIL, PORTAL_A_PASSWORD, "203.0.113.10");
    if (!result.ok) throw new Error(`portal login failed: ${result.error}`);
    expect(result.user).toMatchObject({
      role: "client",
      clientId: clientA,
      email: PORTAL_A_EMAIL,
    });

    // The same token must never resolve as a CRM session.
    expect(await resolveSession(result.token)).toBeNull();
    const portal = await resolvePortalSession(result.token);
    expect(portal).toMatchObject({ role: "client", clientId: clientA });

    // CRM operators cannot open a portal session…
    expect(
      await loginPortal("portal-admin@example.com", "correct-horse-battery-staple", "203.0.113.10"),
    ).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
    // …and portal credentials never open a CRM session.
    expect(await loginAdmin(PORTAL_A_EMAIL, PORTAL_A_PASSWORD, "203.0.113.10")).toEqual({
      ok: false,
      error: "invalid_credentials",
    });

    expect(await loginPortal(PORTAL_A_EMAIL, "wrong-password-x", "203.0.113.10")).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
    expect(await loginPortal("not-an-email", "whatever-password", "203.0.113.10")).toEqual({
      ok: false,
      error: "invalid_input",
    });

    // A client-role user with no Client link is not a portal principal.
    const unlinkedToken = await loginPortal(
      "portal-unlinked@example.com",
      "correct-horse-battery-staple",
      "203.0.113.11",
    );
    expect(unlinkedToken).toEqual({ ok: false, error: "invalid_credentials" });
    expect(await resolvePortalSession("forged-token-value")).toBeNull();
  });

  // ── Scoped reads ────────────────────────────────────────────────────

  it("scopes every read to the session's client", async () => {
    const login = await loginPortal(PORTAL_A_EMAIL, PORTAL_A_PASSWORD, "203.0.113.12");
    if (!login.ok) throw new Error("portal A login failed");
    const actorA = login.user;
    const loginB = await loginPortal(PORTAL_B_EMAIL, PORTAL_B_PASSWORD, "203.0.113.13");
    if (!loginB.ok) throw new Error("portal B login failed");
    const actorB = loginB.user;

    const proposals = await listPortalProposals(actorA);
    if (!proposals.ok) throw new Error("proposals failed");
    expect(proposals.proposals.map((p) => p.id).sort()).toEqual([acceptedA, acceptedA2].sort());
    expect(proposals.proposals.some((p) => p.id === draftA)).toBe(false);
    expect(proposals.proposals[0]?.lines).toEqual([
      { description: "Discovery workshop", quantity: 1, unitPriceMinor: 150000 },
    ]);
    // Internal fields are never projected to the portal wire.
    expect(proposals.proposals[0]).not.toHaveProperty("createdById");
    expect(proposals.proposals[0]).not.toHaveProperty("leadId");

    const projects = await listPortalProjects(actorA);
    if (!projects.ok) throw new Error("projects failed");
    expect(projects.projects.map((p) => p.id)).toEqual([projectA]);

    const invoices = await listPortalInvoices(actorA);
    if (!invoices.ok) throw new Error("invoices failed");
    expect(invoices.invoices.map((i) => i.id)).toEqual([sentInvoiceA]);
    expect(invoices.invoices.some((i) => i.id === draftInvoiceA)).toBe(false);

    const overview = await getPortalOverview(actorA);
    if (!overview.ok) throw new Error("overview failed");
    expect(overview.overview.counts).toEqual({ proposals: 2, projects: 1, invoices: 1 });
    expect(overview.overview.client).toMatchObject({ id: clientA, name: "Portal Client A" });
    expect(overview.overview.outstanding).toEqual([{ currency: "GBP", minor: 150000 }]);

    // Client B sees exactly its own data — nothing from A.
    const proposalsB = await listPortalProposals(actorB);
    if (!proposalsB.ok) throw new Error("proposals B failed");
    expect(proposalsB.proposals.map((p) => p.id)).toEqual([acceptedB]);
    const invoicesB = await listPortalInvoices(actorB);
    if (!invoicesB.ok) throw new Error("invoices B failed");
    expect(invoicesB.invoices.map((i) => i.id)).toEqual([sentInvoiceB]);
  });

  it("refuses cross-client detail fetches (IDOR)", async () => {
    const login = await loginPortal(PORTAL_A_EMAIL, PORTAL_A_PASSWORD, "203.0.113.14");
    if (!login.ok) throw new Error("portal A login failed");
    const actorA = login.user;

    expect(await getPortalProposal(actorA, acceptedB)).toEqual({ ok: false, error: "not_found" });
    expect(await getPortalProject(actorA, projectB)).toEqual({ ok: false, error: "not_found" });
    expect(await getPortalInvoice(actorA, sentInvoiceB)).toEqual({ ok: false, error: "not_found" });
    // Drafts are internal even for their own client.
    expect(await getPortalProposal(actorA, draftA)).toEqual({ ok: false, error: "not_found" });
    expect(await getPortalInvoice(actorA, draftInvoiceA)).toEqual({
      ok: false,
      error: "not_found",
    });
    // Malformed ids never reveal existence.
    expect(await getPortalProposal(actorA, "not-a-cuid")).toEqual({
      ok: false,
      error: "not_found",
    });

    const ownProposal = await getPortalProposal(actorA, acceptedA);
    expect(ownProposal).toMatchObject({ ok: true, proposal: { status: "accepted" } });
    const ownProject = await getPortalProject(actorA, projectA);
    expect(ownProject).toMatchObject({ ok: true, project: { name: "Portal A Build" } });
    const ownInvoice = await getPortalInvoice(actorA, sentInvoiceA);
    expect(ownInvoice).toMatchObject({ ok: true, invoice: { status: "sent" } });
  });

  it("rejects CRM actors and anonymous callers on every portal read", async () => {
    // CRM principals are structurally incompatible with PortalUser — the
    // cast mirrors a forged/mistyped caller reaching the portal services.
    const crmActors = [admin, staff, null] as unknown as Array<PortalUser | null>;
    for (const crmActor of crmActors) {
      expect(await getPortalOverview(crmActor)).toEqual({ ok: false, error: "unauthorized" });
      expect(await listPortalProposals(crmActor)).toEqual({ ok: false, error: "unauthorized" });
      expect(await listPortalProjects(crmActor)).toEqual({ ok: false, error: "unauthorized" });
      expect(await listPortalInvoices(crmActor)).toEqual({ ok: false, error: "unauthorized" });
      expect(await getPortalProposal(crmActor, acceptedA)).toEqual({
        ok: false,
        error: "unauthorized",
      });
      expect(await getPortalProject(crmActor, projectA)).toEqual({
        ok: false,
        error: "unauthorized",
      });
      expect(await getPortalInvoice(crmActor, sentInvoiceA)).toEqual({
        ok: false,
        error: "unauthorized",
      });
    }
    expect(unlinked.role).toBe("client");
  });
});
