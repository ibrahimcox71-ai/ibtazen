import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  CASE_STUDY_SLUG_MAX,
  createAdminUser,
  createCaseStudy,
  getPrisma,
  getPublishedCaseStudyBySlug,
  hashPassword,
  listPublishedCaseStudies,
  slugifyCaseStudyTitle,
  updateCaseStudy,
  type CaseStudyInput,
  type CrmUser,
} from "../src/index";

const ADMIN_EMAIL = "phase20-admin@example.com";

function input(overrides: Partial<CaseStudyInput> = {}): CaseStudyInput {
  return {
    title: "Phase20 Checkout rebuild",
    clientName: "Northwind Retail",
    slotNumber: 1,
    description: "Rebuilt the checkout journey and measured the outcome over six weeks.",
    status: "IN_PRODUCTION",
    metrics: [{ label: "Conversion rate", value: "+38%" }],
    ...overrides,
  };
}

describe("case study slugs (Phase 20)", () => {
  let admin: CrmUser;

  beforeAll(async () => {
    const created = await createAdminUser({
      email: ADMIN_EMAIL,
      name: "Phase20 Admin",
      passwordHash: hashPassword("correct-horse-battery-staple"),
      role: "admin",
    });
    admin = { id: created.id, email: created.email, name: created.name, role: "admin" };
    await getPrisma().caseStudy.deleteMany({ where: { createdById: admin.id } });
  });

  afterAll(async () => {
    await getPrisma().caseStudy.deleteMany({ where: { createdById: admin.id } });
    await getPrisma().adminUser.deleteMany({ where: { email: ADMIN_EMAIL } });
  });

  // Each test owns the four landing slots — clear them between tests.
  beforeEach(async () => {
    await getPrisma().caseStudy.deleteMany({ where: { createdById: admin.id } });
  });

  it("slugifies titles into safe URL segments", () => {
    expect(slugifyCaseStudyTitle("Phase20 Checkout Rebuild & UX")).toBe(
      "phase20-checkout-rebuild-ux",
    );
    expect(slugifyCaseStudyTitle("Café Retail — Phase 20")).toBe("cafe-retail-phase-20");
    expect(slugifyCaseStudyTitle("   ")).toBe("");
    expect(slugifyCaseStudyTitle("A".repeat(300))).toHaveLength(CASE_STUDY_SLUG_MAX);
  });

  it("derives the slug from the title when none is given", async () => {
    const created = await createCaseStudy(admin, input({ title: "Phase20 Checkout Rebuild & UX" }));

    expect(created).toMatchObject({
      ok: true,
      caseStudy: { slug: "phase20-checkout-rebuild-ux" },
    });
  });

  it("rejects malformed explicit slugs", async () => {
    const bad = [
      "-leading-hyphen",
      "double--hyphen",
      "has spaces",
      "UPPER!case",
      "x".repeat(CASE_STUDY_SLUG_MAX + 1),
      123,
    ];

    for (const slug of bad) {
      const result = await createCaseStudy(admin, input({ slug }));
      expect(result).toMatchObject({ ok: false, error: "invalid" });
      if (!result.ok && result.error === "invalid") {
        expect(result.message).toBeTruthy();
      }
    }
    // Nothing was written, so the slot is still free.
    expect(await getPrisma().caseStudy.count({ where: { createdById: admin.id } })).toBe(0);
  });

  it("stores an explicit slug and refuses one another study owns", async () => {
    const first = await createCaseStudy(
      admin,
      input({ title: "Phase20 First", slug: "phase20-custom-segment" }),
    );
    expect(first).toMatchObject({
      ok: true,
      caseStudy: { slug: "phase20-custom-segment" },
    });

    const second = await createCaseStudy(
      admin,
      input({ title: "Phase20 Second", slotNumber: 2, slug: "phase20-custom-segment" }),
    );
    expect(second).toMatchObject({ ok: false, error: "slug_taken" });
  });

  it("suffixes an auto-derived slug that is already taken", async () => {
    const first = await createCaseStudy(admin, input({ title: "Phase20 Same Title" }));
    const second = await createCaseStudy(
      admin,
      input({ title: "Phase20 Same Title", slotNumber: 2 }),
    );

    expect(first.ok && first.caseStudy.slug).toBe("phase20-same-title");
    expect(second.ok && second.caseStudy.slug).toBe("phase20-same-title-2");
  });

  it("keeps the slug stable when only the title changes", async () => {
    const created = await createCaseStudy(
      admin,
      input({ title: "Phase20 Original title", slug: "phase20-stable-slug" }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);

    const renamed = await updateCaseStudy(admin, created.caseStudy.id, input({ title: "" }));
    expect(renamed).toMatchObject({ ok: false, error: "invalid" });

    const updated = await updateCaseStudy(
      admin,
      created.caseStudy.id,
      input({ title: "Phase20 Renamed entirely", slug: "" }),
    );

    expect(updated).toMatchObject({ ok: true, caseStudy: { slug: "phase20-stable-slug" } });
    expect(updated.ok && updated.caseStudy.title).toBe("Phase20 Renamed entirely");
  });

  it("moves the slug only when a new one is provided, and never onto a taken one", async () => {
    const created = await createCaseStudy(admin, input({ slug: "phase20-move-from" }));
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    const other = await createCaseStudy(
      admin,
      input({ title: "Phase20 Other", slotNumber: 2, slug: "phase20-move-to" }),
    );
    if (!other.ok) throw new Error(`create failed: ${other.error}`);

    const collide = await updateCaseStudy(
      admin,
      created.caseStudy.id,
      input({ slug: "phase20-move-to" }),
    );
    expect(collide).toMatchObject({ ok: false, error: "slug_taken" });

    const moved = await updateCaseStudy(
      admin,
      created.caseStudy.id,
      input({ slug: "phase20-moved-here" }),
    );
    expect(moved).toMatchObject({ ok: true, caseStudy: { slug: "phase20-moved-here" } });
  });

  it("serves published rows only to the public list and detail reads", async () => {
    await createCaseStudy(
      admin,
      input({
        title: "Phase20 Public story",
        slug: "phase20-public",
        status: "PUBLISHED",
        metrics: [{ label: "Uptime", value: "99.99%" }],
      }),
    );
    await createCaseStudy(
      admin,
      input({ title: "Phase20 Draft story", slotNumber: 2, slug: "phase20-draft" }),
    );

    const slugs = (await listPublishedCaseStudies()).map((study) => study.slug);
    expect(slugs).toContain("phase20-public");
    expect(slugs).not.toContain("phase20-draft");

    const detail = await getPublishedCaseStudyBySlug("phase20-public");
    expect(detail).toMatchObject({
      slug: "phase20-public",
      title: "Phase20 Public story",
      status: "PUBLISHED",
      metrics: [{ label: "Uptime", value: "99.99%" }],
    });

    expect(await getPublishedCaseStudyBySlug("phase20-draft")).toBeNull();
    expect(await getPublishedCaseStudyBySlug("phase20-does-not-exist")).toBeNull();
    // Malformed segments never reach a query.
    expect(await getPublishedCaseStudyBySlug("Phase20 Public")).toBeNull();
    expect(await getPublishedCaseStudyBySlug("../phase20-public")).toBeNull();
    expect(await getPublishedCaseStudyBySlug("")).toBeNull();
    expect(await getPublishedCaseStudyBySlug(undefined)).toBeNull();
    expect(await getPublishedCaseStudyBySlug(42)).toBeNull();
  });

  it("projects no CRM identity onto the public DTO", async () => {
    await createCaseStudy(
      admin,
      input({ title: "Phase20 Wire shape", slug: "phase20-wire", status: "PUBLISHED" }),
    );

    const [study] = await listPublishedCaseStudies();
    expect(study).toBeDefined();
    expect(Object.keys(study!).sort()).toEqual(
      [
        "clientName",
        "description",
        "id",
        "imageAlt",
        "imagePath",
        "metrics",
        "slotNumber",
        "slug",
        "status",
        "title",
        "updatedAt",
        "videoEmbedUrl",
      ].sort(),
    );
    expect(JSON.stringify(study)).not.toContain(ADMIN_EMAIL);
    expect(JSON.stringify(study)).not.toContain("createdBy");
  });
});
