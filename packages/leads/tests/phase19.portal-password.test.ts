import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  changePortalPassword,
  convertWonLeadToClient,
  createAdminUser,
  getPrisma,
  hashPassword,
  loginPortal,
  provisionPortalAccess,
  resetLoginRateLimiter,
  resolvePortalSession,
  submitLead,
  type CrmUser,
  type PortalUser,
} from "../src/index";

const ADMIN_EMAIL = "phase19-admin@example.com";
const MAIN_EMAIL = "phase19-main-portal@example.com";
const ALT_EMAIL = "phase19-alt-portal@example.com";

const CURRENT_PASSWORD = "phase19-current-secret";
const NEW_PASSWORD = "phase19-rotated-secret";
const ALT_NEW_PASSWORD = "phase19-alt-rotated-secret";

const LOGIN_IP = "203.0.113.190";
const ALT_LOGIN_IP = "203.0.113.191";
const LIMIT_IP = "203.0.113.192";

let admin: CrmUser;

async function createFixtureLead(name: string, email: string, ip: string): Promise<string> {
  const lead = await submitLead(
    { name, email, message: "Lead used for Phase 19 portal password coverage.", consent: true },
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

describe("portal self-service password change", () => {
  let mainLeadId: string;
  let mainClientId: string;
  let altLeadId: string;
  let altClientId: string;
  let actor: PortalUser;

  beforeAll(async () => {
    const created = await createAdminUser({
      email: ADMIN_EMAIL,
      name: "Phase19 Admin",
      passwordHash: hashPassword("correct-horse-battery-staple"),
      role: "admin",
    });
    admin = { id: created.id, email: created.email, name: created.name, role: "admin" };

    mainLeadId = await createFixtureLead(
      "Phase19 Main",
      "phase19-lead-main@example.com",
      "203.0.113.190",
    );
    mainClientId = await toClient(mainLeadId);
    altLeadId = await createFixtureLead(
      "Phase19 Alt",
      "phase19-lead-alt@example.com",
      "203.0.113.191",
    );
    altClientId = await toClient(altLeadId);

    for (const [clientId, email] of [
      [mainClientId, MAIN_EMAIL],
      [altClientId, ALT_EMAIL],
    ] as const) {
      const provisioned = await provisionPortalAccess(admin, clientId, {
        email,
        password: CURRENT_PASSWORD,
      });
      if (!provisioned.ok) throw new Error(`provisioning failed: ${provisioned.error}`);
    }

    const login = await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, LOGIN_IP);
    if (!login.ok) throw new Error("fixture portal login failed");
    actor = login.user;
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
    resetLoginRateLimiter();
  });

  it("rejects anonymous and non-portal principals", async () => {
    const input = { currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD };

    expect(await changePortalPassword(null, input, { ip: LIMIT_IP })).toEqual({
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
    expect(await changePortalPassword(crmActor, input, { ip: LIMIT_IP })).toEqual({
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
    expect(await changePortalPassword(unlinked, input, { ip: LIMIT_IP })).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("validates the input before touching the record", async () => {
    const ip = LOGIN_IP;

    expect(
      await changePortalPassword(actor, { currentPassword: "", newPassword: NEW_PASSWORD }, { ip }),
    ).toMatchObject({ ok: false, error: "invalid_input" });

    expect(
      await changePortalPassword(
        actor,
        { currentPassword: CURRENT_PASSWORD, newPassword: "short" },
        { ip },
      ),
    ).toMatchObject({ ok: false, error: "invalid_input" });

    expect(
      await changePortalPassword(
        actor,
        { currentPassword: CURRENT_PASSWORD, newPassword: CURRENT_PASSWORD },
        { ip },
      ),
    ).toMatchObject({ ok: false, error: "invalid_input" });

    expect(await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, ip)).toMatchObject({ ok: true });
  });

  it("verifies the current password before rotating it", async () => {
    const result = await changePortalPassword(
      actor,
      { currentPassword: "definitely-not-my-password", newPassword: NEW_PASSWORD },
      { ip: LOGIN_IP },
    );

    expect(result).toMatchObject({ ok: false, error: "invalid_password" });
    // The old password still works — a failure must never mutate anything.
    expect(await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, LOGIN_IP)).toMatchObject({ ok: true });
  });

  it("throttles repeated attempts through the login rate limiter", async () => {
    const results = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      results.push(
        await changePortalPassword(
          actor,
          { currentPassword: `wrong-attempt-${attempt}`, newPassword: NEW_PASSWORD },
          { ip: LIMIT_IP },
        ),
      );
    }

    expect(results.some((r) => !r.ok && r.error === "invalid_password")).toBe(true);
    expect(results.some((r) => !r.ok && r.error === "rate_limited")).toBe(true);
    expect(results.every((r) => !r.ok)).toBe(true);

    expect(await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, LOGIN_IP)).toMatchObject({ ok: true });
  });

  it("rotates the password, keeps the current session and signs out other devices", async () => {
    const first = await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, LOGIN_IP);
    const second = await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, LOGIN_IP);
    if (!first.ok || !second.ok) throw new Error("fixture logins failed");

    const result = await changePortalPassword(
      actor,
      { currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD },
      { ip: LOGIN_IP, currentSessionToken: first.token },
    );

    expect(result).toEqual({ ok: true });
    // The session making the change survives; every other device is out.
    expect(await resolvePortalSession(first.token)).not.toBeNull();
    expect(await resolvePortalSession(second.token)).toBeNull();

    expect(await loginPortal(MAIN_EMAIL, CURRENT_PASSWORD, LOGIN_IP)).toMatchObject({
      ok: false,
      error: "invalid_credentials",
    });
    expect(await loginPortal(MAIN_EMAIL, NEW_PASSWORD, LOGIN_IP)).toMatchObject({ ok: true });

    // Only the hash changes — never a readable password on the row.
    const row = await getPrisma().adminUser.findUnique({ where: { id: actor.id } });
    expect(row?.passwordHash).not.toContain(NEW_PASSWORD);
    expect(row?.email).toBe(MAIN_EMAIL);
  });

  it("revokes every session when the change carries no current token", async () => {
    const alt = await loginPortal(ALT_EMAIL, CURRENT_PASSWORD, ALT_LOGIN_IP);
    const other = await loginPortal(ALT_EMAIL, CURRENT_PASSWORD, ALT_LOGIN_IP);
    if (!alt.ok || !other.ok) throw new Error("fixture logins failed");

    const result = await changePortalPassword(
      alt.user,
      { currentPassword: CURRENT_PASSWORD, newPassword: ALT_NEW_PASSWORD },
      { ip: ALT_LOGIN_IP },
    );

    expect(result).toEqual({ ok: true });
    expect(await resolvePortalSession(alt.token)).toBeNull();
    expect(await resolvePortalSession(other.token)).toBeNull();
    expect(await loginPortal(ALT_EMAIL, ALT_NEW_PASSWORD, ALT_LOGIN_IP)).toMatchObject({
      ok: true,
    });
    expect(await loginPortal(ALT_EMAIL, CURRENT_PASSWORD, ALT_LOGIN_IP)).toMatchObject({
      ok: false,
      error: "invalid_credentials",
    });
  });
});
