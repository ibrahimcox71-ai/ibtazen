import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assignLead,
  completeLeadFollowUp,
  createLeadFollowUp,
  createAdminUser,
  editLeadFollowUp,
  ensureBootstrapAdmin,
  followUpState,
  getLead,
  getLeadStats,
  getPrisma,
  hashPassword,
  isLeadActivityType,
  LEAD_ACTIVITY_TYPES,
  listActivities,
  listCrmAssignees,
  listLeadActivities,
  listLeadFollowUps,
  listFollowUps,
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
  return { id: user.id, email: user.email, name: user.name, role: user.role as "admin" | "staff" };
}

describe("activity domain", () => {
  it("exposes the Phase 6+ activity vocabulary", () => {
    expect(LEAD_ACTIVITY_TYPES).toEqual([
      "status_change",
      "assigned",
      "unassigned",
      "follow_up_created",
      "follow_up_updated",
      "follow_up_completed",
      "proposal_created",
      "proposal_updated",
      "proposal_sent",
      "proposal_accepted",
      "proposal_declined",
      "proposal_won",
      "converted_to_client",
      "contract_created",
      "contract_status_changed",
      "project_created",
      "project_status_changed",
      "invoice_created",
      "invoice_status_changed",
    ]);
  });

  it("guards activity type membership", () => {
    expect(isLeadActivityType("assigned")).toBe(true);
    expect(isLeadActivityType("follow_up_completed")).toBe(true);
    expect(isLeadActivityType("dropped")).toBe(false);
  });

  it("derives follow-up state from due date and completion", () => {
    const now = new Date("2026-09-24T12:00:00");
    expect(followUpState("2026-09-24", null, now)).toBe("open");
    expect(followUpState("2026-09-23", null, now)).toBe("overdue");
    expect(followUpState("2026-09-23", new Date("2026-09-24T10:00:00"), now)).toBe("completed");
  });
});

describe("assignment + follow-ups + activity (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let leadId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase6-admin@example.com", "Phase6 Admin", "admin");
    staff = await createOperator("phase6-staff@example.com", "Phase6 Staff", "staff");
    const lead = await submitLead(
      {
        name: "Phase6 Subject",
        email: "phase6-subject@example.com",
        message: "Lead used for assignment and follow-up integration coverage.",
        consent: true,
      },
      "203.0.113.60",
    );
    if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
    leadId = lead.leadId;
  });

  afterAll(async () => {
    await getPrisma().leadActivity.deleteMany({ where: { leadId } });
    await getPrisma().followUp.deleteMany({ where: { leadId } });
    await getPrisma().adminUser.deleteMany({
      where: {
        email: {
          in: ["phase6-admin@example.com", "phase6-staff@example.com", "phase6-client@example.com"],
        },
      },
    });
  });

  it("rejects assignment from unauthenticated and non-CRM actors", async () => {
    expect(await assignLead(null, leadId, admin.id)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "x@example.com",
      name: "X",
      role: "client",
    } as unknown as CrmUser;
    expect(await assignLead(outsider, leadId, admin.id)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await createLeadFollowUp(null, leadId, { title: "x", dueDate: "2026-10-01" })).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("rejects unknown lead ids and non-assignee ids", async () => {
    expect(await assignLead(admin, "does-not-exist", admin.id)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await assignLead(admin, leadId, "not-a-cuid")).toMatchObject({
      ok: false,
      error: "invalid_assignee",
    });
    expect(await assignLead(admin, leadId, "cmufakeidnotreal0000000")).toMatchObject({
      ok: false,
      error: "invalid_assignee",
    });
  });

  it("assigns a lead and records an assigned activity atomically", async () => {
    const result = await assignLead(staff, leadId, admin.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assignedToId).toBe(admin.id);
    expect(result.assignedToName).toBe(admin.name);

    const lead = await getLead(leadId);
    expect(lead?.assignedToId).toBe(admin.id);
    expect(lead?.assignedTo?.name).toBe(admin.name);

    const activities = await listLeadActivities(leadId);
    const assigned = activities.find((a) => a.type === "assigned");
    expect(assigned).toBeTruthy();
    expect(assigned?.actorId).toBe(staff.id);
  });

  it("clears assignment and records unassigned activity", async () => {
    const result = await assignLead(admin, leadId, "");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assignedToId).toBeNull();

    const activities = await listLeadActivities(leadId);
    expect(activities.some((a) => a.type === "unassigned")).toBe(true);

    const stats = await getLeadStats();
    expect(stats.unassigned).toBeGreaterThanOrEqual(1);
  });

  it("re-assigns then lists active CRM assignees", async () => {
    await assignLead(admin, leadId, staff.id);
    const assignees = await listCrmAssignees();
    expect(assignees.some((u) => u.id === staff.id)).toBe(true);
    expect(assignees.every((u) => u.role === "admin" || u.role === "staff")).toBe(true);
  });

  it("creates a follow-up with validation and activity", async () => {
    const badDate = await createLeadFollowUp(staff, leadId, {
      title: "Call",
      dueDate: "10/01/2026",
    });
    expect(badDate).toMatchObject({ ok: false, error: "invalid_due_date" });

    const emptyTitle = await createLeadFollowUp(staff, leadId, {
      title: "   ",
      dueDate: "2026-10-01",
    });
    expect(emptyTitle).toMatchObject({ ok: false, error: "invalid" });

    const result = await createLeadFollowUp(staff, leadId, {
      title: "Send proposal deck",
      body: "Include pricing options",
      dueDate: "2026-10-01",
      assigneeId: admin.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.followUp.title).toBe("Send proposal deck");
    expect(result.followUp.assigneeId).toBe(admin.id);
    expect(result.followUp.creatorId).toBe(staff.id);

    const activities = await listLeadActivities(leadId);
    expect(activities.some((a) => a.type === "follow_up_created")).toBe(true);

    const listed = await listLeadFollowUps(leadId);
    expect(listed.some((f) => f.id === result.followUp.id)).toBe(true);
  });

  it("defaults empty follow-up assignee to the lead owner", async () => {
    const lead = await getLead(leadId);
    expect(lead?.assignedToId).toBe(staff.id);
    const result = await createLeadFollowUp(admin, leadId, {
      title: "Default owner check",
      dueDate: "2026-10-02",
      assigneeId: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.followUp.assigneeId).toBe(staff.id);
  });

  it("edits and completes follow-ups with activity records", async () => {
    const created = await createLeadFollowUp(staff, leadId, {
      title: "Temp follow-up",
      dueDate: "2026-10-03",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.followUp.id;

    const edited = await editLeadFollowUp(admin, id, { title: "Renamed follow-up" });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.followUp.title).toBe("Renamed follow-up");

    const done = await completeLeadFollowUp(admin, id, true);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.followUp.completedAt).not.toBeNull();

    const reopened = await completeLeadFollowUp(admin, id, false);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.followUp.completedAt).toBeNull();

    const activities = await listLeadActivities(leadId);
    expect(activities.some((a) => a.type === "follow_up_updated")).toBe(true);
    expect(activities.some((a) => a.type === "follow_up_completed")).toBe(true);
  });

  it("lists activities and follow-ups with RBAC", async () => {
    const activities = await listActivities(staff, leadId);
    expect(activities.ok).toBe(true);
    if (activities.ok) expect(activities.activities.length).toBeGreaterThan(0);

    const followUps = await listFollowUps(admin, leadId);
    expect(followUps.ok).toBe(true);
    if (followUps.ok) expect(followUps.followUps.length).toBeGreaterThan(0);

    const client = {
      id: "client",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await listActivities(client, leadId)).toEqual({ ok: false, error: "unauthorized" });
    expect(await listFollowUps(client, leadId)).toEqual({ ok: false, error: "unauthorized" });
    expect(await listActivities(staff, "missing")).toEqual({ ok: false, error: "not_found" });
  });

  it("does not allow inactive users as assignees", async () => {
    const inactive = await createAdminUser({
      email: "phase6-inactive@example.com",
      name: "Inactive",
      passwordHash: hashPassword("correct-horse-battery-staple"),
      role: "staff",
    });
    await getPrisma().adminUser.update({
      where: { id: inactive.id },
      data: { active: false },
    });
    const result = await assignLead(admin, leadId, inactive.id);
    expect(result).toMatchObject({ ok: false, error: "invalid_assignee" });
    await getPrisma().adminUser.delete({ where: { id: inactive.id } });
  });
});
