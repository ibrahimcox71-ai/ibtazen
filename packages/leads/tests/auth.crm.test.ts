import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addCrmNote,
  changeLeadStatus,
  ensureBootstrapAdmin,
  hashPassword,
  listLeadCrmNotes,
  listLeadsPage,
  loginAdmin,
  logoutSession,
  resolveSession,
  resetLoginRateLimiter,
  submitLead,
  canAccessCrm,
  canManageUsers,
  isCrmRole,
  verifyPassword,
  createAdminUser,
  findAdminByEmail,
  getLeadStats,
  getPrisma,
} from "../src/index";

const IP = "198.51.100.50";

async function createTestAdmin(email: string, role: "admin" | "staff", active = true) {
  const user = await createAdminUser({
    email,
    name: role === "admin" ? "Test Admin" : "Test Staff",
    passwordHash: hashPassword("correct-horse-battery-staple"),
    role,
  });
  if (!active) {
    await getPrisma().adminUser.update({ where: { id: user.id }, data: { active: false } });
  }
  return getPrisma().adminUser.findUniqueOrThrow({ where: { id: user.id } });
}

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", () => {
    const hash = hashPassword("correct-horse-battery-staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
    expect(verifyPassword("wrong-password-attempt", hash)).toBe(false);
  });

  it("refuses short passwords at hash time", () => {
    expect(() => hashPassword("short")).toThrow();
  });

  it("does not embed the plaintext", () => {
    const hash = hashPassword("super-secret-passphrase-1");
    expect(hash).not.toContain("super-secret-passphrase-1");
  });
});

describe("role checks", () => {
  it("recognises CRM roles only", () => {
    expect(isCrmRole("admin")).toBe(true);
    expect(isCrmRole("staff")).toBe(true);
    expect(isCrmRole("client")).toBe(false);
    expect(isCrmRole("superuser")).toBe(false);
  });

  it("gates CRM access and user management", () => {
    expect(canAccessCrm("admin")).toBe(true);
    expect(canAccessCrm("staff")).toBe(true);
    expect(canAccessCrm("client")).toBe(false);
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("staff")).toBe(false);
  });
});

describe("login + sessions (integration)", () => {
  beforeAll(async () => {
    await createTestAdmin("admin-crm@example.com", "admin");
    await createTestAdmin("staff-crm@example.com", "staff");
    await createTestAdmin("disabled-crm@example.com", "staff", false);
  });

  beforeEach(() => {
    resetLoginRateLimiter();
  });

  afterAll(async () => {
    await getPrisma().adminSession.deleteMany();
    await getPrisma().leadNote.deleteMany();
    await getPrisma().adminUser.deleteMany({
      where: {
        email: {
          in: ["admin-crm@example.com", "staff-crm@example.com", "disabled-crm@example.com"],
        },
      },
    });
  });

  it("logs in a valid admin and resolves the session", async () => {
    const result = await loginAdmin("admin-crm@example.com", "correct-horse-battery-staple", IP);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.role).toBe("admin");
    expect(result.user).not.toHaveProperty("passwordHash");

    const session = await resolveSession(result.token);
    expect(session).not.toBeNull();
    expect(session?.id).toBe(result.user.id);
    expect(session?.role).toBe("admin");
  });

  it("returns a generic error for wrong password", async () => {
    const result = await loginAdmin("admin-crm@example.com", "wrong-password-attempt", IP);
    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("returns a generic error for unknown email (no enumeration)", async () => {
    const result = await loginAdmin("nobody@example.com", "correct-horse-battery-staple", IP);
    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("rejects a disabled account with the same generic error", async () => {
    const result = await loginAdmin("disabled-crm@example.com", "correct-horse-battery-staple", IP);
    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("rejects invalid input shapes", async () => {
    expect(await loginAdmin("not-an-email", "correct-horse-battery-staple", IP)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(await loginAdmin("admin-crm@example.com", "", IP)).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it("rate-limits repeated failures", async () => {
    resetLoginRateLimiter();
    let last: Awaited<ReturnType<typeof loginAdmin>> | null = null;
    for (let i = 0; i < 9; i++) {
      last = await loginAdmin("staff-crm@example.com", `wrong-attempt-${i}`, IP);
    }
    expect(last?.ok).toBe(false);
    if (last && !last.ok) expect(last.error).toBe("rate_limited");
  });

  it("logout revokes the session", async () => {
    resetLoginRateLimiter();
    const login = await loginAdmin("admin-crm@example.com", "correct-horse-battery-staple", IP);
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect(await resolveSession(login.token)).not.toBeNull();
    await logoutSession(login.token);
    expect(await resolveSession(login.token)).toBeNull();
  });

  it("rejects a garbage token", async () => {
    expect(await resolveSession("not-a-real-token")).toBeNull();
    expect(await resolveSession(undefined)).toBeNull();
  });
});

describe("bootstrap admin", () => {
  const prev = {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    name: process.env.ADMIN_BOOTSTRAP_NAME,
  };

  afterAll(() => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = prev.email;
    process.env.ADMIN_BOOTSTRAP_PASSWORD = prev.password;
    process.env.ADMIN_BOOTSTRAP_NAME = prev.name;
  });

  it("creates the first admin from env and is idempotent", async () => {
    // Ensure a clean slate relative to count — other tests may have users.
    const before = await getPrisma().adminUser.count();
    process.env.ADMIN_BOOTSTRAP_EMAIL = "bootstrap-probe@example.com";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-strong-password-1";
    process.env.ADMIN_BOOTSTRAP_NAME = "Bootstrap Probe";

    if (before === 0) {
      const first = await ensureBootstrapAdmin();
      expect(first.created).toBe(true);
      const second = await ensureBootstrapAdmin();
      expect(second.created).toBe(false);
      await getPrisma().adminUser.delete({ where: { email: "bootstrap-probe@example.com" } });
    } else {
      // Users already exist — bootstrap must never add another admin.
      const result = await ensureBootstrapAdmin();
      expect(result.created).toBe(false);
      expect(await findAdminByEmail("bootstrap-probe@example.com")).toBeNull();
    }
  });

  it("skips when credentials are missing or too short", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "";
    expect((await ensureBootstrapAdmin()).created).toBe(false);

    process.env.ADMIN_BOOTSTRAP_EMAIL = "bootstrap-short@example.com";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "short";
    expect((await ensureBootstrapAdmin()).created).toBe(false);
    expect(await findAdminByEmail("bootstrap-short@example.com")).toBeNull();
  });
});

describe("CRM status + notes (integration)", () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let staff: Awaited<ReturnType<typeof createTestAdmin>>;
  let leadId: string;

  beforeAll(async () => {
    admin = await createTestAdmin("crm-status-admin@example.com", "admin");
    staff = await createTestAdmin("crm-status-staff@example.com", "staff");
    const lead = await submitLead(
      {
        name: "Status Subject",
        email: "status-subject@example.com",
        message: "Please follow up regarding our platform rebuild timeline.",
        consent: true,
      },
      "203.0.113.40",
    );
    if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
    leadId = lead.leadId;
  });

  it("staff can move new → contacted", async () => {
    const actor = { id: staff.id, email: staff.email, name: staff.name, role: "staff" as const };
    const result = await changeLeadStatus(actor, leadId, "contacted");
    expect(result).toEqual({ ok: true, status: "contacted" });
  });

  it("rejects an invalid lifecycle jump", async () => {
    const actor = { id: staff.id, email: staff.email, name: staff.name, role: "staff" as const };
    const result = await changeLeadStatus(actor, leadId, "won");
    expect(result).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("rejects unknown status strings (not a pipeline value)", async () => {
    const actor = { id: admin.id, email: admin.email, name: admin.name, role: "admin" as const };
    expect(await changeLeadStatus(actor, leadId, "archived")).toEqual({
      ok: false,
      error: "invalid_status",
    });
    expect(await changeLeadStatus(actor, leadId, "__proto__")).toEqual({
      ok: false,
      error: "invalid_status",
    });
  });

  it("rejects unauthenticated mutations", async () => {
    expect(await changeLeadStatus(null, leadId, "qualified")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await addCrmNote(null, leadId, "sneaky note")).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("rejects unknown lead ids", async () => {
    const actor = { id: admin.id, email: admin.email, name: admin.name, role: "admin" as const };
    expect(await changeLeadStatus(actor, "does-not-exist", "contacted")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await addCrmNote(actor, "does-not-exist", "note body")).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("rejects empty and oversized notes", async () => {
    const actor = { id: staff.id, email: staff.email, name: staff.name, role: "staff" as const };
    expect(await addCrmNote(actor, leadId, "   ")).toMatchObject({ ok: false, error: "invalid" });
    expect(await addCrmNote(actor, leadId, "x".repeat(2001))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("creates a note with author attribution and lists it", async () => {
    const actor = { id: staff.id, email: staff.email, name: staff.name, role: "staff" as const };
    const result = await addCrmNote(actor, leadId, "Left voicemail — call back tomorrow.");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.note.body).toBe("Left voicemail — call back tomorrow.");
    expect(result.note.authorId).toBe(staff.id);
    expect(result.note.author.name).toBe(staff.name);

    const notes = await listLeadCrmNotes(leadId);
    expect(notes.some((n) => n.id === result.note.id)).toBe(true);
  });

  it("stores markup-looking note bodies as plain text (React escapes on render)", async () => {
    const actor = { id: staff.id, email: staff.email, name: staff.name, role: "staff" as const };
    const payload = `<script>alert("xss")</script> see pricing`;
    const result = await addCrmNote(actor, leadId, payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Stored verbatim as text — never interpreted as HTML by the data layer.
    expect(result.note.body).toContain("<script>");
    const notes = await listLeadCrmNotes(leadId);
    expect(notes.find((n) => n.id === result.note.id)?.body).toContain("<script>");
  });

  it("prevents IDOR-style mutations from unauthenticated actors", async () => {
    // Attacker-supplied lead id without a session must never mutate.
    expect(await changeLeadStatus(null, leadId, "contacted")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await addCrmNote(null, leadId, "forged note")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    // Non-CRM role cannot mutate even if a caller forges the role field.
    const outsider = {
      id: "outsider",
      email: "x@example.com",
      name: "X",
      role: "client",
    } as unknown as Parameters<typeof changeLeadStatus>[0];
    expect(await changeLeadStatus(outsider, leadId, "contacted")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await addCrmNote(outsider, leadId, "forged note")).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("notes never leak into the public lead payload shape", async () => {
    const lead = await getPrisma().lead.findUnique({ where: { id: leadId } });
    expect(lead).not.toBeNull();
    // Public Lead row has only the legacy free-text `notes` column — CRM notes
    // live in LeadNote and are not part of Lead.
    expect(lead).not.toHaveProperty("leadNotes");
    const crmNotes = await getPrisma().leadNote.findMany({ where: { leadId } });
    expect(crmNotes.length).toBeGreaterThan(0);
  });
});

describe("lead list + stats (integration)", () => {
  beforeAll(async () => {
    await submitLead(
      {
        name: "List Filter Target",
        email: "list-filter@example.com",
        company: "Filter Co",
        message: "A message long enough to pass validation gates.",
        consent: true,
        budgetBand: "15k-50k",
        timeline: "asap",
      },
      "203.0.113.41",
      "seo-audit",
    );
  });

  it("paginates and filters server-side", async () => {
    const page1 = await listLeadsPage({ page: 1, pageSize: 5 });
    expect(page1.items.length).toBeLessThanOrEqual(5);
    expect(page1.pageSize).toBe(5);
    expect(page1.pageCount).toBeGreaterThanOrEqual(1);
    expect(page1.total).toBeGreaterThanOrEqual(page1.items.length);

    const search = await listLeadsPage({ search: "list-filter@example.com" });
    expect(search.total).toBe(1);
    expect(search.items[0]?.email).toBe("list-filter@example.com");

    const bySource = await listLeadsPage({ source: "seo-audit" });
    expect(bySource.items.every((l) => l.source === "seo-audit")).toBe(true);

    const byBudget = await listLeadsPage({ budgetBand: "15k-50k" });
    expect(byBudget.items.every((l) => l.budgetBand === "15k-50k")).toBe(true);

    const oldest = await listLeadsPage({ sort: "oldest", pageSize: 1 });
    const newest = await listLeadsPage({ sort: "newest", pageSize: 1 });
    if (oldest.total > 1) {
      expect(oldest.items[0]?.createdAt.getTime()).toBeLessThanOrEqual(
        newest.items[0]!.createdAt.getTime(),
      );
    }
  });

  it("computes real status/source aggregates", async () => {
    const stats = await getLeadStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byStatus.new).toBeGreaterThanOrEqual(1);
    expect(Object.keys(stats.bySource).length).toBeGreaterThan(0);
    const sum = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.total);
  });
});

afterAll(async () => {
  await getPrisma().$disconnect();
});
