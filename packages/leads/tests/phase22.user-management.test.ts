import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  changeCrmUserRole,
  createAdminUser,
  createCrmUser,
  getPrisma,
  hashPassword,
  listCrmUsersForActor,
  loginAdmin,
  resetLoginRateLimiter,
  resolveSession,
  setCrmUserActive,
  type CrmUser,
} from "../src/index";

const ADMIN_EMAIL = "phase22-admin@example.com";
const STAFF_EMAIL = "phase22-staff@example.com";
const MEMBER_EMAIL = "phase22-member@example.com";
const PORTAL_EMAIL = "phase22-portal@example.com";
const SECOND_ADMIN_EMAIL = "phase22-second-admin@example.com";

const MEMBER_PASSWORD = "phase22-member-secret-1";
const FIXTURE_PASSWORD = "phase22-correct-horse-battery";

const IP = "203.0.113.200";

/** Never exists — cuid-shaped so it passes the id guard and misses the row. */
const MISSING_ID = `c${"0".repeat(24)}`;

let admin: CrmUser;
let staff: CrmUser;
let memberId: string;

const EMAILS = [ADMIN_EMAIL, STAFF_EMAIL, MEMBER_EMAIL, PORTAL_EMAIL, SECOND_ADMIN_EMAIL];

beforeAll(async () => {
  const adminRow = await createAdminUser({
    email: ADMIN_EMAIL,
    name: "Phase22 Admin",
    passwordHash: hashPassword(FIXTURE_PASSWORD),
    role: "admin",
  });
  admin = { id: adminRow.id, email: adminRow.email, name: adminRow.name, role: "admin" };

  const staffRow = await createAdminUser({
    email: STAFF_EMAIL,
    name: "Phase22 Staff",
    passwordHash: hashPassword(FIXTURE_PASSWORD),
    role: "staff",
  });
  staff = { id: staffRow.id, email: staffRow.email, name: staffRow.name, role: "staff" };
});

afterAll(async () => {
  const prisma = getPrisma();
  await prisma.adminSession.deleteMany({ where: { user: { email: { in: EMAILS } } } });
  await prisma.adminUser.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  resetLoginRateLimiter();
});

describe("gates", () => {
  it("rejects principals without user-management rights", async () => {
    const input = {
      name: "Gate Probe",
      email: "phase22-gate-probe@example.com",
      password: FIXTURE_PASSWORD,
      role: "staff",
    };

    expect(await listCrmUsersForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    expect(await listCrmUsersForActor(staff)).toEqual({ ok: false, error: "unauthorized" });

    expect(await createCrmUser(null, input)).toMatchObject({ ok: false, error: "unauthorized" });
    expect(await createCrmUser(staff, input)).toMatchObject({ ok: false, error: "unauthorized" });

    expect(await changeCrmUserRole(null, MISSING_ID, "staff")).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await changeCrmUserRole(staff, MISSING_ID, "admin")).toMatchObject({
      ok: false,
      error: "unauthorized",
    });

    expect(await setCrmUserActive(null, MISSING_ID, false)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await setCrmUserActive(staff, MISSING_ID, false)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });

    // Nothing slipped through.
    expect(await getPrisma().adminUser.findUnique({ where: { email: input.email } })).toBeNull();
  });

  it("never exposes password hashes in the list", async () => {
    const list = await listCrmUsersForActor(admin);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    for (const row of list.users) {
      expect(row).not.toHaveProperty("passwordHash");
      expect(row.role === "admin" || row.role === "staff").toBe(true);
    }
  });
});

describe("createCrmUser", () => {
  it("validates role and credentials before writing anything", async () => {
    const valid = {
      name: "Phase22 Member",
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      role: "staff",
    };

    expect(await createCrmUser(admin, { ...valid, role: "client" })).toMatchObject({
      ok: false,
      error: "invalid_role",
    });
    expect(await createCrmUser(admin, { ...valid, role: "superuser" })).toMatchObject({
      ok: false,
      error: "invalid_role",
    });
    expect(await createCrmUser(admin, { ...valid, email: "not-an-email" })).toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(await createCrmUser(admin, { ...valid, password: "short" })).toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(await createCrmUser(admin, { ...valid, name: "   " })).toMatchObject({
      ok: false,
      error: "invalid_input",
    });

    // A rejected call must leave no row behind.
    expect(await getPrisma().adminUser.findUnique({ where: { email: MEMBER_EMAIL } })).toBeNull();
  });

  it("creates an active staff login with a hashed password", async () => {
    const result = await createCrmUser(admin, {
      name: "  Phase22    Member ",
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      role: "staff",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    memberId = result.user.id;
    expect(result.user.role).toBe("staff");
    expect(result.user.active).toBe(true);
    expect(result.user).not.toHaveProperty("passwordHash");

    const row = await getPrisma().adminUser.findUniqueOrThrow({ where: { id: memberId } });
    expect(row.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(row.passwordHash).not.toContain(MEMBER_PASSWORD);
    expect(row.name).toBe("Phase22 Member");
    expect(row.email).toBe(MEMBER_EMAIL);

    const list = await listCrmUsersForActor(admin);
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.users.some((u) => u.id === memberId)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    const result = await createCrmUser(admin, {
      name: "Duplicate",
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      role: "staff",
    });
    expect(result).toMatchObject({ ok: false, error: "email_taken" });
  });

  it("mints the new login straight into a working session", async () => {
    expect(await loginAdmin(MEMBER_EMAIL, MEMBER_PASSWORD, IP)).toMatchObject({ ok: true });
  });
});

describe("changeCrmUserRole", () => {
  it("promotes and demotes within the CRM roles", async () => {
    expect(await changeCrmUserRole(admin, memberId, "admin")).toMatchObject({
      ok: true,
      user: { id: memberId, role: "admin" },
    });
    expect(await changeCrmUserRole(admin, memberId, "staff")).toMatchObject({
      ok: true,
      user: { id: memberId, role: "staff" },
    });
    // Saving the current role is an idempotent no-op, not an error.
    expect(await changeCrmUserRole(admin, admin.id, "admin")).toMatchObject({ ok: true });
  });

  it("rejects non-CRM roles", async () => {
    expect(await changeCrmUserRole(admin, memberId, "client")).toMatchObject({
      ok: false,
      error: "invalid_role",
    });
    expect(await changeCrmUserRole(admin, memberId, "owner")).toMatchObject({
      ok: false,
      error: "invalid_role",
    });
    expect(await changeCrmUserRole(admin, memberId, null)).toMatchObject({
      ok: false,
      error: "invalid_role",
    });
  });

  it("treats unknown ids and portal rows as out of scope", async () => {
    expect(await changeCrmUserRole(admin, MISSING_ID, "staff")).toEqual({
      ok: false,
      error: "not_found",
    });

    const portalRow = await createAdminUser({
      email: PORTAL_EMAIL,
      name: "Phase22 Portal",
      passwordHash: hashPassword(FIXTURE_PASSWORD),
      role: "client",
    });
    expect(await changeCrmUserRole(admin, portalRow.id, "staff")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await setCrmUserActive(admin, portalRow.id, false)).toEqual({
      ok: false,
      error: "not_found",
    });
    // The portal login is untouched by the rejected calls.
    const row = await getPrisma().adminUser.findUniqueOrThrow({ where: { id: portalRow.id } });
    expect(row.role).toBe("client");
    expect(row.active).toBe(true);
  });

  it("keeps a second admin when one remains", async () => {
    const second = await createAdminUser({
      email: SECOND_ADMIN_EMAIL,
      name: "Phase22 Second Admin",
      passwordHash: hashPassword(FIXTURE_PASSWORD),
      role: "admin",
    });

    expect(await changeCrmUserRole(admin, second.id, "staff")).toMatchObject({
      ok: true,
      user: { id: second.id, role: "staff" },
    });
    expect(await changeCrmUserRole(admin, second.id, "admin")).toMatchObject({
      ok: true,
      user: { id: second.id, role: "admin" },
    });
  });

  it("refuses to demote the final active admin", async () => {
    const prisma = getPrisma();
    const others = await prisma.adminUser.findMany({
      where: { role: "admin", active: true, id: { not: admin.id } },
      select: { id: true },
    });
    await prisma.adminUser.updateMany({
      where: { id: { in: others.map((o) => o.id) } },
      data: { active: false },
    });
    try {
      expect(await prisma.adminUser.count({ where: { role: "admin", active: true } })).toBe(1);

      expect(await changeCrmUserRole(admin, admin.id, "staff")).toMatchObject({
        ok: false,
        error: "last_admin",
      });

      // The rejected attempt left the row exactly as it was.
      const row = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
      expect(row.role).toBe("admin");
      expect(row.active).toBe(true);
    } finally {
      await prisma.adminUser.updateMany({
        where: { id: { in: others.map((o) => o.id) } },
        data: { active: true },
      });
    }
  });
});

describe("setCrmUserActive", () => {
  it("deactivation cuts access, revokes sessions, reactivation restores it", async () => {
    const first = await loginAdmin(MEMBER_EMAIL, MEMBER_PASSWORD, IP);
    const second = await loginAdmin(MEMBER_EMAIL, MEMBER_PASSWORD, IP);
    if (!first.ok || !second.ok) throw new Error("fixture logins failed");

    const deactivated = await setCrmUserActive(admin, memberId, false);
    expect(deactivated).toMatchObject({ ok: true, user: { id: memberId, active: false } });

    // Live cookies die with the account — both devices are out.
    expect(await resolveSession(first.token)).toBeNull();
    expect(await resolveSession(second.token)).toBeNull();
    expect(await loginAdmin(MEMBER_EMAIL, MEMBER_PASSWORD, IP)).toEqual({
      ok: false,
      error: "invalid_credentials",
    });

    const list = await listCrmUsersForActor(admin);
    expect(list.ok).toBe(true);
    if (list.ok) {
      const member = list.users.find((u) => u.id === memberId);
      expect(member?.active).toBe(false);
    }

    expect(await setCrmUserActive(admin, memberId, true)).toMatchObject({
      ok: true,
      user: { id: memberId, active: true },
    });
    expect(await loginAdmin(MEMBER_EMAIL, MEMBER_PASSWORD, IP)).toMatchObject({ ok: true });
  });

  it("blocks self-deactivation so an admin cannot lock themselves out", async () => {
    expect(await setCrmUserActive(admin, admin.id, false)).toMatchObject({
      ok: false,
      error: "self_target",
    });

    const row = await getPrisma().adminUser.findUniqueOrThrow({ where: { id: admin.id } });
    expect(row.active).toBe(true);
  });

  it("validates the flag shape and idempotent reactivation", async () => {
    expect(await setCrmUserActive(admin, memberId, "yes")).toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(await setCrmUserActive(admin, MISSING_ID, true)).toEqual({
      ok: false,
      error: "not_found",
    });
    // Reactivating an already-active row is a no-op success.
    expect(await setCrmUserActive(admin, admin.id, true)).toMatchObject({ ok: true });
  });
});
