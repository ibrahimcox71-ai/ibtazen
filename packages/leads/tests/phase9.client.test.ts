import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ClientAlreadyExistsError,
  convertWonLeadToClient,
  createAdminUser,
  createClientWithActivity,
  ensureBootstrapAdmin,
  findClientByLeadId,
  getLead,
  getPrisma,
  hashPassword,
  isLeadActivityType,
  LEAD_ACTIVITY_TYPES,
  listClients,
  listClientsForActor,
  listLeadActivities,
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
      message: "Lead used for Phase 9 client conversion coverage.",
      consent: true,
    },
    ip,
  );
  if (!lead.ok || !lead.leadId) throw new Error("fixture lead failed");
  return lead.leadId;
}

describe("client conversion domain", () => {
  it("excludes converted_to_client from the wrong types and includes it in the vocabulary", () => {
    expect(LEAD_ACTIVITY_TYPES).toContain("converted_to_client");
    expect(isLeadActivityType("converted_to_client")).toBe(true);
    expect(isLeadActivityType("converted")).toBe(false);
    expect(isLeadActivityType("client_converted")).toBe(false);
  });
});

describe("client conversion service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let wonLeadId: string;
  let newLeadId: string;
  let convertedClientId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase9-admin@example.com", "Phase9 Admin", "admin");
    staff = await createOperator("phase9-staff@example.com", "Phase9 Staff", "staff");

    wonLeadId = await createFixtureLead(
      "Phase9 Won Subject",
      "phase9-won@example.com",
      "203.0.113.90",
    );
    await getPrisma().lead.update({
      where: { id: wonLeadId },
      data: {
        status: "won",
        phone: "+44 7700 900123",
        company: "Phase9 Won Co Ltd",
      },
    });

    newLeadId = await createFixtureLead(
      "Phase9 New Subject",
      "phase9-new@example.com",
      "203.0.113.91",
    );
  });

  afterAll(async () => {
    await getPrisma().client.deleteMany({
      where: { leadId: { in: [wonLeadId, newLeadId].filter(Boolean) } },
    });
    await getPrisma().leadActivity.deleteMany({
      where: { leadId: { in: [wonLeadId, newLeadId].filter(Boolean) } },
    });
    await getPrisma().proposal.deleteMany({
      where: { leadId: { in: [wonLeadId, newLeadId].filter(Boolean) } },
    });
    await getPrisma().lead.deleteMany({
      where: { id: { in: [wonLeadId, newLeadId].filter(Boolean) } },
    });
    await getPrisma().adminUser.deleteMany({
      where: {
        email: {
          in: [
            "phase9-admin@example.com",
            "phase9-staff@example.com",
            "phase9-cascade@example.com",
          ],
        },
      },
    });
  });

  it("converts a won lead successfully and keeps the lead won", async () => {
    const result = await convertWonLeadToClient(staff, wonLeadId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    convertedClientId = result.client.id;
    expect(result.client.sourceStatus).toBe("won");
    expect(result.client.createdById).toBe(staff.id);
    expect(result.client.leadId).toBe(wonLeadId);

    const lead = await getLead(wonLeadId);
    expect(lead?.status).toBe("won");
  });

  it("copies client profile fields from the lead server-side", async () => {
    const lead = await getLead(wonLeadId);
    expect(lead).toBeTruthy();
    const client = await findClientByLeadId(wonLeadId);
    expect(client).toBeTruthy();
    if (!client || !lead) return;
    expect(client.name).toBe(lead.name);
    expect(client.email).toBe(lead.email);
    expect(client.phone).toBe(lead.phone);
    expect(client.organizationName).toBe(lead.company);
    expect(client.sourceStatus).toBe("won");
  });

  it("records a converted_to_client activity with clientId and leadName metadata", async () => {
    const activities = await listLeadActivities(wonLeadId);
    const conversion = activities.find((a) => a.type === "converted_to_client");
    expect(conversion).toBeTruthy();
    expect(conversion?.actorId).toBe(staff.id);
    expect(conversion?.metadata).toBeTruthy();
    const meta = JSON.parse(conversion?.metadata ?? "{}") as Record<string, unknown>;
    expect(meta.clientId).toBe(convertedClientId);
    expect(meta.leadName).toBe("Phase9 Won Subject");
    // No unnecessary sensitive data in metadata.
    expect(meta.email).toBeUndefined();
    expect(meta.message).toBeUndefined();
  });

  it("rejects a second conversion and leaves a single client and activity", async () => {
    const again = await convertWonLeadToClient(admin, wonLeadId);
    expect(again).toMatchObject({ ok: false, error: "already_converted" });

    const count = await getPrisma().client.count({ where: { leadId: wonLeadId } });
    expect(count).toBe(1);
    const activities = await listLeadActivities(wonLeadId);
    expect(activities.filter((a) => a.type === "converted_to_client")).toHaveLength(1);
  });

  it("relies on the unique leadId constraint (not only the pre-check) and rolls back duplicates", async () => {
    const raceLeadId = await createFixtureLead(
      "Phase9 Race Subject",
      "phase9-race@example.com",
      "203.0.113.92",
    );
    await getPrisma().lead.update({ where: { id: raceLeadId }, data: { status: "won" } });

    const converted = await convertWonLeadToClient(admin, raceLeadId);
    expect(converted.ok).toBe(true);

    // Bypass the service pre-check — the database must reject the insert
    // and the transaction must roll back the paired activity row too.
    await expect(
      createClientWithActivity({
        leadId: raceLeadId,
        createdById: staff.id,
        name: "Duplicate",
        email: "duplicate@example.com",
        sourceStatus: "won",
        activityMetadata: { leadName: "Duplicate" },
      }),
    ).rejects.toThrow(ClientAlreadyExistsError);

    // Concurrent service calls after the fact are both safe.
    const [first, second] = await Promise.all([
      convertWonLeadToClient(admin, raceLeadId),
      convertWonLeadToClient(staff, raceLeadId),
    ]);
    expect(first).toMatchObject({ ok: false, error: "already_converted" });
    expect(second).toMatchObject({ ok: false, error: "already_converted" });

    const count = await getPrisma().client.count({ where: { leadId: raceLeadId } });
    expect(count).toBe(1);
    const activities = await listLeadActivities(raceLeadId);
    expect(activities.filter((a) => a.type === "converted_to_client")).toHaveLength(1);

    await getPrisma().client.deleteMany({ where: { leadId: raceLeadId } });
    await getPrisma().leadActivity.deleteMany({ where: { leadId: raceLeadId } });
    await getPrisma().lead.delete({ where: { id: raceLeadId } });
  });

  it("rejects conversion of a non-won lead", async () => {
    const result = await convertWonLeadToClient(admin, newLeadId);
    expect(result).toMatchObject({ ok: false, error: "invalid_status" });
    expect(await findClientByLeadId(newLeadId)).toBeNull();
    const lead = await getLead(newLeadId);
    expect(lead?.status).toBe("new");
  });

  it("rejects unauthenticated and non-CRM conversion attempts", async () => {
    expect(await convertWonLeadToClient(null, wonLeadId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await convertWonLeadToClient(null, newLeadId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });

  it("rejects forged role payloads even with a valid lead id", async () => {
    const outsider = {
      id: "outsider",
      email: "x@example.com",
      name: "X",
      role: "client",
    } as unknown as CrmUser;
    expect(await convertWonLeadToClient(outsider, wonLeadId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await listClientsForActor(outsider)).toEqual({ ok: false, error: "unauthorized" });

    const superadmin = {
      id: "superadmin",
      email: "s@example.com",
      name: "S",
      role: "superadmin",
    } as unknown as CrmUser;
    expect(await convertWonLeadToClient(superadmin, wonLeadId)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await listClientsForActor(superadmin)).toEqual({ ok: false, error: "unauthorized" });

    // An actor id that does not exist in AdminUser cannot create a client
    // (FK), and the transaction must leave no client or activity behind.
    const forgedAdmin = {
      id: "cmuforgedactorid00000000",
      email: "forged@example.com",
      name: "Forged",
      role: "admin",
    } as unknown as CrmUser;
    const forgedLeadId = await createFixtureLead(
      "Phase9 Forged Subject",
      "phase9-forged@example.com",
      "203.0.113.94",
    );
    await getPrisma().lead.update({ where: { id: forgedLeadId }, data: { status: "won" } });

    const result = await convertWonLeadToClient(forgedAdmin, forgedLeadId);
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(await findClientByLeadId(forgedLeadId)).toBeNull();
    const forgedActivities = await listLeadActivities(forgedLeadId);
    expect(forgedActivities.filter((a) => a.type === "converted_to_client")).toHaveLength(0);

    await getPrisma().lead.delete({ where: { id: forgedLeadId } });
  });

  it("rejects invalid cuids and nonexistent leads without leaking data", async () => {
    expect(await convertWonLeadToClient(admin, "not-a-cuid")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await convertWonLeadToClient(admin, "")).toEqual({ ok: false, error: "not_found" });
    expect(await convertWonLeadToClient(admin, "cmufakeidnotreal0000000")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await convertWonLeadToClient(admin, "DROP TABLE Client;--")).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("requires CRM access to list the clients registry", async () => {
    expect(await listClientsForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await listClientsForActor(outsider)).toEqual({ ok: false, error: "unauthorized" });

    const allowed = await listClientsForActor(staff);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      expect(allowed.clients.some((c) => c.id === convertedClientId)).toBe(true);
    }
    const direct = await listClients();
    expect(direct.some((c) => c.id === convertedClientId)).toBe(true);
  });

  it("keeps the client-to-lead relationship correct and navigable", async () => {
    const client = await findClientByLeadId(wonLeadId);
    expect(client).toBeTruthy();
    if (!client) return;
    expect(client.leadId).toBe(wonLeadId);

    const listed = await listClients();
    const item = listed.find((c) => c.id === client.id);
    expect(item).toBeTruthy();
    expect(item?.leadId).toBe(wonLeadId);
    expect(item?.leadName).toBe("Phase9 Won Subject");
    expect(item?.leadStatus).toBe("won");
    expect(item?.organizationName).toBe("Phase9 Won Co Ltd");
  });

  it("cascades client deletion when the source lead is deleted", async () => {
    const cascadeAdmin = await createOperator(
      "phase9-cascade@example.com",
      "Phase9 Cascade",
      "staff",
    );
    const cascadeLeadId = await createFixtureLead(
      "Phase9 Cascade Subject",
      "phase9-cascade-lead@example.com",
      "203.0.113.93",
    );
    await getPrisma().lead.update({ where: { id: cascadeLeadId }, data: { status: "won" } });

    const converted = await convertWonLeadToClient(cascadeAdmin, cascadeLeadId);
    expect(converted.ok).toBe(true);
    expect(await findClientByLeadId(cascadeLeadId)).toBeTruthy();

    await getPrisma().lead.delete({ where: { id: cascadeLeadId } });
    expect(await findClientByLeadId(cascadeLeadId)).toBeNull();

    await getPrisma().adminUser.delete({ where: { id: cascadeAdmin.id } });
  });
});
