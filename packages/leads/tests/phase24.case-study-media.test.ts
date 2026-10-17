import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CASE_STUDY_IMAGE_FILENAME_PATTERN,
  CASE_STUDY_MAX_IMAGE_ALT,
  CASE_STUDY_MAX_SORT_ORDER,
  createAdminUser,
  createCaseStudy,
  ensureBootstrapAdmin,
  getCaseStudyForActor,
  getPrisma,
  hashPassword,
  listCaseStudies,
  listCaseStudiesForActor,
  listPublishedCaseStudies,
  setCaseStudyImage,
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
    title: "Phase24 Checkout rebuild",
    clientName: "Northwind Retail",
    slotNumber: 1,
    description: "Rebuilt the checkout journey and measured the outcome over six weeks.",
    status: "IN_PRODUCTION",
    metrics: [{ label: "Conversion rate", value: "+38%" }],
    ...overrides,
  };
}

const NOT_A_CUID = "not-a-cuid";
const MISSING_CUID = "c0000000000000000000000000";
const VALID_KEY = `${MISSING_CUID.slice(0, 20)}-deadbeef.png`;

describe("case study image and ordering vocabulary", () => {
  it("only accepts generated filenames for image keys", () => {
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(VALID_KEY)).toBe(true);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-deadbeef.jpeg`)).toBe(true);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-deadbeef.webp`)).toBe(true);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-deadbeef.avif`)).toBe(true);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-deadbeef.gif`)).toBe(true);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-deadbeef.svg`)).toBe(false);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}.png`)).toBe(false);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test("../../etc/passwd")).toBe(false);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test("evil.png")).toBe(false);
    expect(CASE_STUDY_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-zzzzzzzz.png`)).toBe(false);
    expect(CASE_STUDY_MAX_IMAGE_ALT).toBe(120);
    expect(CASE_STUDY_MAX_SORT_ORDER).toBe(9999);
  });
});

describe("case study media and ordering (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let firstId: string;
  let secondId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase24-admin@example.com", "Phase24 Admin", "admin");
    staff = await createOperator("phase24-staff@example.com", "Phase24 Staff", "staff");
    await getPrisma().caseStudy.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  afterAll(async () => {
    await getPrisma().caseStudy.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  it("rejects unauthenticated and non-CRM image writes", async () => {
    expect(await setCaseStudyImage(null, MISSING_CUID, VALID_KEY)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await setCaseStudyImage(outsider, MISSING_CUID, VALID_KEY)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("validates image alt text and sort order before touching the database", async () => {
    const longAlt = "a".repeat(CASE_STUDY_MAX_IMAGE_ALT + 1);
    expect(await createCaseStudy(admin, input({ imageAlt: longAlt }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ sortOrder: "three" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createCaseStudy(admin, input({ sortOrder: -1 }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(
      await createCaseStudy(admin, input({ sortOrder: CASE_STUDY_MAX_SORT_ORDER + 1 })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(await createCaseStudy(admin, input({ imageAlt: 42 }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("persists trimmed alt text and integer sort order", async () => {
    const created = await createCaseStudy(
      admin,
      input({ imageAlt: "  Checkout dashboard  ", sortOrder: "5" }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    firstId = created.caseStudy.id;
    expect(created.caseStudy.imageAlt).toBe("Checkout dashboard");
    expect(created.caseStudy.sortOrder).toBe(5);
    expect(created.caseStudy.imagePath).toBeNull();

    const blank = await createCaseStudy(
      staff,
      input({ title: "Phase24 Second story", slotNumber: 2, imageAlt: "", sortOrder: "" }),
    );
    if (!blank.ok) throw new Error(`create failed: ${blank.error}`);
    secondId = blank.caseStudy.id;
    expect(blank.caseStudy.imageAlt).toBeNull();
    expect(blank.caseStudy.sortOrder).toBe(0);
  });

  it("stores, replaces, and clears the image key with filename re-validation", async () => {
    const missing = await setCaseStudyImage(admin, MISSING_CUID, VALID_KEY);
    expect(missing).toMatchObject({ ok: false, error: "not_found" });
    expect(await setCaseStudyImage(admin, NOT_A_CUID, VALID_KEY)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await setCaseStudyImage(admin, firstId, "../../etc/passwd")).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await setCaseStudyImage(admin, firstId, "evil.svg")).toMatchObject({
      ok: false,
      error: "invalid",
    });

    const stored = await setCaseStudyImage(admin, firstId, VALID_KEY);
    expect(stored).toMatchObject({ ok: true });
    expect(stored.ok && stored.caseStudy.imagePath).toBe(VALID_KEY);
    expect((await getCaseStudyForActor(admin, firstId)).ok).toBe(true);

    const swapped = await setCaseStudyImage(staff, firstId, `${MISSING_CUID}-cafebeef.webp`);
    expect(swapped.ok && swapped.caseStudy.imagePath).toBe(`${MISSING_CUID}-cafebeef.webp`);

    const cleared = await setCaseStudyImage(admin, firstId, null);
    expect(cleared.ok && cleared.caseStudy.imagePath).toBeNull();
  });

  it("orders lists by sort order independently of the landing slot", async () => {
    const sorted = await updateCaseStudy(
      admin,
      firstId,
      input({ sortOrder: 9, status: "PUBLISHED" }),
    );
    if (!sorted.ok) throw new Error(`update failed: ${sorted.error}`);
    expect(sorted.caseStudy.sortOrder).toBe(9);

    const publishedSecond = await updateCaseStudy(
      admin,
      secondId,
      input({ title: "Phase24 Second story", slotNumber: 2, status: "PUBLISHED", sortOrder: 1 }),
    );
    if (!publishedSecond.ok) throw new Error(`update failed: ${publishedSecond.error}`);

    const listed = await listCaseStudiesForActor(admin);
    if (!listed.ok) throw new Error("list failed");
    const ids = listed.caseStudies.map((study) => study.id);
    expect(ids.indexOf(secondId)).toBeLessThan(ids.indexOf(firstId));

    const published = await listPublishedCaseStudies();
    const publishedIds = published.map((study) => study.id);
    expect(publishedIds.indexOf(secondId)).toBeLessThan(publishedIds.indexOf(firstId));

    const all = await listCaseStudies();
    const allIds = all.map((study) => study.id);
    expect(allIds.indexOf(secondId)).toBeLessThan(allIds.indexOf(firstId));
  });
});
