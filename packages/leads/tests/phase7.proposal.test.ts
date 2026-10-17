import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  canProposalTransition,
  canTransition,
  changeProposalStatus,
  computeProposalTotals,
  createAdminUser,
  createLeadProposal as createProposal,
  editLeadProposal,
  ensureBootstrapAdmin,
  formatMinorToMajor,
  getLead,
  getPrisma,
  hashPassword,
  isLeadActivityType,
  isProposalStatus,
  LEAD_ACTIVITY_TYPES,
  listLeadActivities,
  listLeadProposals,
  listLeadProposalsForActor,
  parseMoneyToMinor,
  PROPOSAL_STATUSES,
  submitLead,
  winLeadFromAcceptedProposal,
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

const sampleLines = [
  { description: "Discovery workshop", quantity: "1", unitPrice: "1500" },
  { description: "Design hours", quantity: "10", unitPrice: "95.50" },
];

describe("proposal domain", () => {
  it("exposes the Phase 7 proposal lifecycle", () => {
    expect(PROPOSAL_STATUSES).toEqual(["draft", "sent", "accepted", "declined"]);
    expect(isProposalStatus("draft")).toBe(true);
    expect(isProposalStatus("expired")).toBe(false);
  });

  it("allows only valid proposal transitions", () => {
    expect(canProposalTransition("draft", "sent")).toBe(true);
    expect(canProposalTransition("draft", "declined")).toBe(true);
    expect(canProposalTransition("draft", "accepted")).toBe(false);
    expect(canProposalTransition("sent", "accepted")).toBe(true);
    expect(canProposalTransition("sent", "draft")).toBe(false);
    expect(canProposalTransition("accepted", "sent")).toBe(false);
    expect(canProposalTransition("declined", "accepted")).toBe(false);
  });

  it("includes proposal activity types in the audit vocabulary", () => {
    for (const type of [
      "proposal_created",
      "proposal_updated",
      "proposal_sent",
      "proposal_accepted",
      "proposal_declined",
      "proposal_won",
    ]) {
      expect(LEAD_ACTIVITY_TYPES).toContain(type);
      expect(isLeadActivityType(type)).toBe(true);
    }
  });

  it("parses money to minor units with integer arithmetic", () => {
    expect(parseMoneyToMinor("12")).toBe(1200);
    expect(parseMoneyToMinor("12.3")).toBe(1230);
    expect(parseMoneyToMinor("12.34")).toBe(1234);
    expect(parseMoneyToMinor("0.01")).toBe(1);
    expect(parseMoneyToMinor("0")).toBe(0);
    expect(parseMoneyToMinor("-1")).toBeNull();
    expect(parseMoneyToMinor("1.234")).toBeNull();
    expect(parseMoneyToMinor("abc")).toBeNull();
    expect(parseMoneyToMinor("")).toBeNull();
    expect(parseMoneyToMinor("1e2")).toBeNull();
  });

  it("formats minor units for display", () => {
    expect(formatMinorToMajor(1234)).toBe("12.34");
    expect(formatMinorToMajor(5)).toBe("0.05");
    expect(formatMinorToMajor(0)).toBe("0.00");
    expect(formatMinorToMajor(150000)).toBe("1500.00");
  });

  it("computes totals server-side and rejects invalid lines", () => {
    const ok = computeProposalTotals([
      { description: "A", quantity: 2, unitPriceMinor: 1000 },
      { description: "B", quantity: 1, unitPriceMinor: 250 },
    ]);
    expect(ok).toEqual({ ok: true, subtotalMinor: 2250, totalMinor: 2250 });

    expect(computeProposalTotals([])).toMatchObject({ ok: false });
    expect(
      computeProposalTotals([{ description: "A", quantity: 0, unitPriceMinor: 100 }]),
    ).toMatchObject({ ok: false });
    expect(
      computeProposalTotals([{ description: "A", quantity: 1, unitPriceMinor: -1 }]),
    ).toMatchObject({ ok: false });
    expect(
      computeProposalTotals([{ description: "A", quantity: 1.5, unitPriceMinor: 100 }]),
    ).toMatchObject({ ok: false });
    expect(
      computeProposalTotals([
        { description: "A", quantity: 1_000_000, unitPriceMinor: 2_000_000_000 },
      ]),
    ).toMatchObject({ ok: false });
  });

  it("rejects lead won transitions that are illegal", () => {
    expect(canTransition("qualified", "won")).toBe(true);
    expect(canTransition("proposal", "won")).toBe(true);
    expect(canTransition("contacted", "won")).toBe(false);
    expect(canTransition("new", "won")).toBe(false);
  });
});

describe("proposal service/security (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let leadId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase7-admin@example.com", "Phase7 Admin", "admin");
    staff = await createOperator("phase7-staff@example.com", "Phase7 Staff", "staff");
    const lead = await submitLead(
      {
        name: "Phase7 Subject",
        email: "phase7-subject@example.com",
        message: "Lead used for proposal vertical integration coverage.",
        consent: true,
      },
      "203.0.113.70",
    );
    if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
    leadId = lead.leadId;
  });

  afterAll(async () => {
    await getPrisma().leadActivity.deleteMany({ where: { leadId } });
    await getPrisma().proposal.deleteMany({ where: { leadId } });
    await getPrisma().adminUser.deleteMany({
      where: {
        email: {
          in: ["phase7-admin@example.com", "phase7-staff@example.com", "phase7-client@example.com"],
        },
      },
    });
  });

  it("rejects unauthenticated and non-CRM proposal mutations", async () => {
    expect(
      await createProposal(null, leadId, {
        title: "x",
        validUntil: "2026-12-01",
        lines: sampleLines,
      }),
    ).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const client = {
      id: "client",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(
      await createProposal(client, leadId, {
        title: "x",
        validUntil: "2026-12-01",
        lines: sampleLines,
      }),
    ).toEqual({ ok: false, error: "unauthorized" });
    expect(await listLeadProposalsForActor(client, leadId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("rejects invalid lead and proposal ids", async () => {
    expect(
      await createProposal(admin, "not-a-cuid", {
        title: "x",
        validUntil: "2026-12-01",
        lines: sampleLines,
      }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(
      await createProposal(admin, "cmufakeidnotreal0000000", {
        title: "x",
        validUntil: "2026-12-01",
        lines: sampleLines,
      }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(await changeProposalStatus(admin, "not-a-cuid", "sent")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await changeProposalStatus(admin, "cmufakeidnotreal0000000", "sent")).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("creates a draft with server-computed totals and activity", async () => {
    const bad = await createProposal(admin, leadId, {
      title: "Bad money",
      currency: "GBP",
      validUntil: "2026-12-01",
      lines: [{ description: "X", quantity: "1", unitPrice: "not-a-price" }],
    });
    expect(bad).toMatchObject({ ok: false, error: "invalid" });

    const result = await createProposal(staff, leadId, {
      title: "Phase7 Proposal",
      currency: "GBP",
      validUntil: "2026-12-01",
      notes: "Initial draft",
      lines: sampleLines,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.status).toBe("draft");
    expect(result.proposal.version).toBe(1);
    // 1*150000 + 10*9550 = 150000 + 95500 = 245500
    expect(result.proposal.subtotalMinor).toBe(245500);
    expect(result.proposal.totalMinor).toBe(245500);
    expect(result.proposal.createdById).toBe(staff.id);

    const activities = await listLeadActivities(leadId);
    expect(activities.some((a) => a.type === "proposal_created")).toBe(true);
  });

  it("assigns sequential unique versions", async () => {
    const second = await createProposal(admin, leadId, {
      title: "Second version",
      currency: "GBP",
      validUntil: "2026-12-15",
      lines: sampleLines,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.proposal.version).toBe(2);
  });

  it("edits only drafts and ignores forged totals by recomputing", async () => {
    const created = await createProposal(staff, leadId, {
      title: "Editable",
      currency: "USD",
      validUntil: "2026-11-01",
      lines: [{ description: "Work", quantity: "3", unitPrice: "100" }],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.proposal.id;

    const edited = await editLeadProposal(admin, id, {
      title: "Editable vFinal",
      currency: "USD",
      validUntil: "2026-11-05",
      lines: [{ description: "Work", quantity: "4", unitPrice: "100" }],
      totalMinor: 1,
      subtotalMinor: 1,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.proposal.totalMinor).toBe(40000);
    expect(edited.proposal.title).toBe("Editable vFinal");

    const sent = await changeProposalStatus(staff, id, "sent");
    expect(sent.ok).toBe(true);

    const afterSend = await editLeadProposal(admin, id, {
      title: "Hacked",
      currency: "USD",
      validUntil: "2026-11-05",
      lines: [{ description: "Work", quantity: "1", unitPrice: "1" }],
    });
    expect(afterSend).toMatchObject({ ok: false, error: "immutable" });
  });

  it("enforces proposal status transitions and duplicate actions", async () => {
    const created = await createProposal(staff, leadId, {
      title: "Lifecycle",
      currency: "GBP",
      validUntil: "2026-12-20",
      lines: sampleLines,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.proposal.id;

    // draft → accepted illegal
    expect(await changeProposalStatus(admin, id, "accepted")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    // arbitrary status rejected
    expect(await changeProposalStatus(admin, id, "won")).toMatchObject({
      ok: false,
      error: "invalid",
    });

    expect(await changeProposalStatus(staff, id, "sent")).toMatchObject({ ok: true });
    // duplicate send
    expect(await changeProposalStatus(staff, id, "sent")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    // sent → draft illegal
    expect(await changeProposalStatus(admin, id, "draft")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });

    expect(await changeProposalStatus(admin, id, "accepted")).toMatchObject({ ok: true });
    // duplicate accept
    expect(await changeProposalStatus(admin, id, "accepted")).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });

    const activities = await listLeadActivities(leadId);
    expect(activities.some((a) => a.type === "proposal_sent")).toBe(true);
    expect(activities.some((a) => a.type === "proposal_accepted")).toBe(true);
  });

  it("requires accepted proposal and legal lead transition for Accept & Win", async () => {
    // IDOR / forged relationship
    const other = await createProposal(admin, leadId, {
      title: "Other",
      currency: "GBP",
      validUntil: "2026-12-01",
      lines: sampleLines,
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;

    // draft cannot win
    const notAccepted = await winLeadFromAcceptedProposal(admin, leadId, other.proposal.id);
    expect(notAccepted).toMatchObject({ ok: false, error: "invalid_transition" });

    await changeProposalStatus(admin, other.proposal.id, "sent");
    await changeProposalStatus(admin, other.proposal.id, "accepted");

    // Lead still "new" → cannot jump to won
    const premature = await winLeadFromAcceptedProposal(admin, leadId, other.proposal.id);
    expect(premature).toMatchObject({ ok: false, error: "invalid_transition" });

    // Qualify then win
    const statusResult = await getPrisma().lead.update({
      where: { id: leadId },
      data: { status: "qualified" },
    });
    expect(statusResult.status).toBe("qualified");

    const won = await winLeadFromAcceptedProposal(admin, leadId, other.proposal.id);
    expect(won.ok).toBe(true);
    if (!won.ok) return;
    expect(won.status).toBe("won");

    const lead = await getLead(leadId);
    expect(lead?.status).toBe("won");

    const activities = await listLeadActivities(leadId);
    expect(activities.some((a) => a.type === "proposal_won")).toBe(true);
    expect(activities.some((a) => a.type === "status_change" && a.toStatus === "won")).toBe(true);

    // duplicate win rejected
    expect(await winLeadFromAcceptedProposal(admin, leadId, other.proposal.id)).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("lists proposals for CRM actors only", async () => {
    const list = await listLeadProposalsForActor(staff, leadId);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.proposals.length).toBeGreaterThanOrEqual(3);
    }
    expect(await listLeadProposalsForActor(null, leadId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const direct = await listLeadProposals(leadId);
    expect(direct.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects Accept & Win with mismatched proposal/lead (IDOR)", async () => {
    const lead2 = await submitLead(
      {
        name: "Phase7 Other",
        email: "phase7-other@example.com",
        message: "Second lead for IDOR proposal checks.",
        consent: true,
      },
      "203.0.113.71",
    );
    if (!lead2.ok || !lead2.leadId) throw new Error("second fixture failed");
    const p = await createProposal(admin, lead2.leadId, {
      title: "Other lead proposal",
      currency: "GBP",
      validUntil: "2026-12-01",
      lines: sampleLines,
    });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    await changeProposalStatus(admin, p.proposal.id, "sent");
    await changeProposalStatus(admin, p.proposal.id, "accepted");

    // proposal from lead2 cannot win lead1
    const result = await winLeadFromAcceptedProposal(admin, leadId, p.proposal.id);
    expect(result).toMatchObject({ ok: false, error: "not_found" });

    await getPrisma().proposal.deleteMany({ where: { leadId: lead2.leadId } });
    await getPrisma().lead.delete({ where: { id: lead2.leadId } });
  });
});
