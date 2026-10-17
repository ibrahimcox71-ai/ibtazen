import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CASE_STUDY_MAX_METRICS,
  CASE_STUDY_SLOTS,
  CASE_STUDY_STATUSES,
  createAdminUser,
  createCaseStudy,
  deleteCaseStudy,
  ensureBootstrapAdmin,
  getCaseStudyForActor,
  getPrisma,
  getPublishedCaseStudyForSlot,
  hashPassword,
  isCaseStudySlot,
  isCaseStudyStatus,
  listCaseStudies,
  listCaseStudiesForActor,
  parseCaseStudyMetrics,
  updateCaseStudy,
  type CaseStudyInput,
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

function input(overrides: Partial<CaseStudyInput> = {}): CaseStudyInput {
  return {
    title: "Phase16 Checkout rebuild",
    clientName: "Northwind Retail",
    slotNumber: 1,
    description: "Rebuilt the checkout journey and measured the outcome over six weeks.",
    status: "IN_PRODUCTION",
    metrics: [
      { label: "Conversion rate", value: "+38%" },
      { label: "Timeline", value: "6 weeks" },
    ],
    ...overrides,
  };
}

const NOT_A_CUID = "not-a-cuid";
const MISSING_CUID = "c0000000000000000000000000";

describe("case study domain", () => {
  it("exposes the canonical status and slot vocabulary", () => {
    expect(CASE_STUDY_STATUSES).toEqual(["IN_PRODUCTION", "PUBLISHED"]);
    expect(isCaseStudyStatus("IN_PRODUCTION")).toBe(true);
    expect(isCaseStudyStatus("PUBLISHED")).toBe(true);
    expect(isCaseStudyStatus("draft")).toBe(false);
    expect(isCaseStudyStatus("published")).toBe(false);
    expect(CASE_STUDY_SLOTS).toEqual([1, 2, 3, 4]);
    expect(isCaseStudySlot(1)).toBe(true);
    expect(isCaseStudySlot(4)).toBe(true);
    expect(isCaseStudySlot(0)).toBe(false);
    expect(isCaseStudySlot(5)).toBe(false);
  });

  it("parses metrics JSON defensively", () => {
    expect(parseCaseStudyMetrics(JSON.stringify([{ label: "Uptime", value: "99.99%" }]))).toEqual([
      { label: "Uptime", value: "99.99%" },
    ]);
    expect(parseCaseStudyMetrics(null)).toEqual([]);
    expect(parseCaseStudyMetrics(undefined)).toEqual([]);
    expect(parseCaseStudyMetrics("")).toEqual([]);
    expect(parseCaseStudyMetrics("{not json")).toEqual([]);
    expect(parseCaseStudyMetrics('{"label":"Uptime"}')).toEqual([]);
    expect(parseCaseStudyMetrics("[1,2,3]")).toEqual([]);
    expect(parseCaseStudyMetrics('[{"label":"Uptime","value":99}]')).toEqual([]);
    expect(parseCaseStudyMetrics('[{"label":"Uptime","value":"99.99%"},{"nope":1}]')).toEqual([
      { label: "Uptime", value: "99.99%" },
    ]);
  });
});

describe("case study service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let slotOneId: string;
  let slotTwoId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase16-admin@example.com", "Phase16 Admin", "admin");
    staff = await createOperator("phase16-staff@example.com", "Phase16 Staff", "staff");
    await getPrisma().caseStudy.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  afterAll(async () => {
    await getPrisma().caseStudy.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  it("rejects unauthenticated and non-CRM actors", async () => {
    expect(await createCaseStudy(null, input())).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await createCaseStudy(outsider, input())).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await listCaseStudiesForActor(null)).toMatchObject({ ok: false, error: "unauthorized" });
    expect(await listCaseStudiesForActor(outsider)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await getCaseStudyForActor(null, MISSING_CUID)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await updateCaseStudy(outsider, MISSING_CUID, input())).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("validates raw form fields before touching the database", async () => {
    const rejected = await createCaseStudy(admin, input({ title: "   " }));
    expect(rejected).toMatchObject({ ok: false, error: "invalid" });
    expect(rejected.ok === false && rejected.message).toMatch(/Title is required/);

    expect(await createCaseStudy(admin, input({ clientName: "" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ description: "" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ slotNumber: 5 }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ slotNumber: "two" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ status: "LIVE" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ metrics: "[]" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(
      await createCaseStudy(
        admin,
        input({
          metrics: Array.from({ length: CASE_STUDY_MAX_METRICS + 1 }, (_, i) => ({
            label: `Metric ${i}`,
            value: `${i}`,
          })),
        }),
      ),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(
      await createCaseStudy(admin, input({ metrics: [{ label: "Uptime", value: "  " }] })),
    ).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await getCaseStudyForActor(admin, NOT_A_CUID)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await getCaseStudyForActor(admin, MISSING_CUID)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await updateCaseStudy(admin, NOT_A_CUID, input())).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await updateCaseStudy(admin, MISSING_CUID, input())).toMatchObject({
      ok: false,
      error: "not_found",
    });
  });

  it("creates a case study with server-side actor, defaults, and trimmed metrics", async () => {
    const created = await createCaseStudy(
      staff,
      input({
        status: "",
        metrics: [
          { label: "  Conversion rate  ", value: " +38% " },
          // Fully empty rows are dropped — they are "add metric" placeholders.
          { label: "", value: "" },
        ],
      }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    slotOneId = created.caseStudy.id;

    expect(created.caseStudy.slotNumber).toBe(1);
    expect(created.caseStudy.status).toBe("IN_PRODUCTION");
    expect(created.caseStudy.createdById).toBe(staff.id);
    expect(created.caseStudy.createdBy.name).toBe("Phase16 Staff");
    expect(parseCaseStudyMetrics(created.caseStudy.metrics)).toEqual([
      { label: "Conversion rate", value: "+38%" },
    ]);
  });

  it("enforces one case study per landing slot", async () => {
    const duplicate = await createCaseStudy(admin, input({ title: "Phase16 Duplicate" }));
    expect(duplicate).toMatchObject({ ok: false, error: "slot_taken" });
  });

  it("lists case studies in landing-slot order for CRM actors only", async () => {
    const second = await createCaseStudy(
      admin,
      input({
        title: "Phase16 Second story",
        slotNumber: 2,
        status: "PUBLISHED",
        metrics: [{ label: "Load time", value: "-64%" }],
      }),
    );
    if (!second.ok) throw new Error(`create failed: ${second.error}`);
    slotTwoId = second.caseStudy.id;

    const listed = await listCaseStudiesForActor(admin);
    if (!listed.ok) throw new Error("list failed");
    expect(listed.caseStudies.map((s) => s.slotNumber)).toEqual([1, 2]);
    expect(listed.caseStudies[0]?.id).toBe(slotOneId);
    expect(await listCaseStudies()).toHaveLength(2);
  });

  it("serves only published slot occupant to the public site", async () => {
    expect(await getPublishedCaseStudyForSlot(1)).toBeNull();

    const published = await updateCaseStudy(staff, slotOneId, input({ status: "PUBLISHED" }));
    if (!published.ok) throw new Error(`update failed: ${published.error}`);

    const featured = await getPublishedCaseStudyForSlot(1);
    expect(featured?.id).toBe(slotOneId);
    expect(featured?.title).toBe("Phase16 Checkout rebuild");
    expect(featured?.status).toBe("PUBLISHED");

    expect(await getPublishedCaseStudyForSlot(2)).toMatchObject({ id: slotTwoId });
    expect(await getPublishedCaseStudyForSlot(3)).toBeNull();
    expect(await getPublishedCaseStudyForSlot(5)).toBeNull();
    expect(await getPublishedCaseStudyForSlot(Number.NaN)).toBeNull();
  });

  it("updates editable fields and refuses a slot another study occupies", async () => {
    const moved = await updateCaseStudy(admin, slotOneId, input({ slotNumber: 2 }));
    expect(moved).toMatchObject({ ok: false, error: "slot_taken" });

    const invalid = await updateCaseStudy(admin, slotOneId, input({ title: " " }));
    expect(invalid).toMatchObject({ ok: false, error: "invalid" });

    const updated = await updateCaseStudy(admin, slotOneId, {
      title: "Phase16 Checkout rebuild, revisited",
      clientName: "Northwind Retail Ltd",
      slotNumber: 1,
      description: "Rebuilt checkout, then measured the outcome over six weeks.",
      status: "PUBLISHED",
      metrics: [{ label: "Revenue per session", value: "+21%" }],
    });
    if (!updated.ok) throw new Error(`update failed: ${updated.error}`);

    expect(updated.caseStudy.id).toBe(slotOneId);
    expect(updated.caseStudy.title).toBe("Phase16 Checkout rebuild, revisited");
    expect(updated.caseStudy.clientName).toBe("Northwind Retail Ltd");
    expect(updated.caseStudy.slotNumber).toBe(1);
    expect(updated.caseStudy.status).toBe("PUBLISHED");
    expect(parseCaseStudyMetrics(updated.caseStudy.metrics)).toEqual([
      { label: "Revenue per session", value: "+21%" },
    ]);

    const fetched = await getCaseStudyForActor(admin, slotOneId);
    expect(fetched.ok && fetched.caseStudy.title).toBe("Phase16 Checkout rebuild, revisited");
  });

  it("deletes for CRM writers only, then the row and its slot are gone", async () => {
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;

    expect(await deleteCaseStudy(null, slotOneId)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await deleteCaseStudy(outsider, slotOneId)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await deleteCaseStudy(admin, NOT_A_CUID)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await deleteCaseStudy(admin, MISSING_CUID)).toMatchObject({
      ok: false,
      error: "not_found",
    });

    const removed = await deleteCaseStudy(staff, slotOneId);
    expect(removed).toMatchObject({
      ok: true,
      slug: "phase16-checkout-rebuild",
      imagePath: null,
    });

    expect(await getCaseStudyForActor(admin, slotOneId)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    const listed = await listCaseStudiesForActor(admin);
    expect(listed.ok && listed.caseStudies.map((study) => study.id)).toEqual([slotTwoId]);
    expect(await getPublishedCaseStudyForSlot(1)).toBeNull();

    const recycled = await createCaseStudy(admin, input({ title: "Phase16 Recycled slot" }));
    if (!recycled.ok) throw new Error(`create failed: ${recycled.error}`);
    expect(recycled.caseStudy.slotNumber).toBe(1);
  });
});
