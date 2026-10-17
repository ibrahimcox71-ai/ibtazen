import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BLOG_MAX_VIDEO_EMBED_URL,
  blogVideoEmbedSrc,
  createAdminUser,
  createCaseStudy,
  ensureBootstrapAdmin,
  getPrisma,
  getPublishedCaseStudyBySlug,
  hashPassword,
  listPublishedCaseStudies,
  updateCaseStudy,
  type CaseStudyInput,
  type CrmUser,
} from "../src/index";

const YOUTUBE = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const YOUTUBE_EMBED = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const VIMEO = "https://vimeo.com/123456789?h=abcdef";
const VIMEO_EMBED = "https://player.vimeo.com/video/123456789?h=abcdef";

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
    title: "Phase27 Payment story",
    clientName: "Northwind Retail",
    slotNumber: 1,
    description: "A payment flow rebuilt end to end, with a walkthrough video.",
    status: "IN_PRODUCTION",
    metrics: [{ label: "Conversion rate", value: "+38%" }],
    ...overrides,
  };
}

describe("case study video embed (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase27-admin@example.com", "Phase27 Admin", "admin");
    staff = await createOperator("phase27-staff@example.com", "Phase27 Staff", "staff");
    await getPrisma().caseStudy.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  afterAll(async () => {
    await getPrisma().caseStudy.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  it("refuses video links that are not https YouTube or Vimeo", async () => {
    expect(await createCaseStudy(admin, input({ videoEmbedUrl: 42 }))).toMatchObject({
      ok: false,
      error: "invalid",
      message: "Video link must be text.",
    });
    expect(await createCaseStudy(admin, input({ videoEmbedUrl: "not a url" }))).toMatchObject({
      ok: false,
      error: "invalid",
      message: "Video link must be a full YouTube or Vimeo URL.",
    });
    expect(
      await createCaseStudy(admin, input({ videoEmbedUrl: "http://www.youtube.com/watch" })),
    ).toMatchObject({ ok: false, error: "invalid", message: "Video link must use https." });
    expect(
      await createCaseStudy(admin, input({ videoEmbedUrl: "https://evil.example/embed/x" })),
    ).toMatchObject({
      ok: false,
      error: "invalid",
      message: "Video link must point at YouTube or Vimeo.",
    });
    expect(
      await createCaseStudy(admin, input({ videoEmbedUrl: `https://youtu.be/${"a".repeat(400)}` })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(BLOG_MAX_VIDEO_EMBED_URL).toBe(300);
  });

  it("stores a normalised embed URL on create and update", async () => {
    const created = await createCaseStudy(admin, input({ videoEmbedUrl: `  ${YOUTUBE}  ` }));
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    expect(created.caseStudy.videoEmbedUrl).toBe(YOUTUBE_EMBED);

    const shorts = await updateCaseStudy(
      admin,
      created.caseStudy.id,
      input({ videoEmbedUrl: "https://www.youtube.com/shorts/dQw4w9WgXcQ" }),
    );
    expect(shorts.ok && shorts.caseStudy.videoEmbedUrl).toBe(YOUTUBE_EMBED);

    const vimeo = await updateCaseStudy(
      admin,
      created.caseStudy.id,
      input({ videoEmbedUrl: VIMEO }),
    );
    expect(vimeo.ok && vimeo.caseStudy.videoEmbedUrl).toBe(VIMEO_EMBED);

    const blank = await updateCaseStudy(staff, created.caseStudy.id, input({ videoEmbedUrl: "" }));
    expect(blank.ok && blank.caseStudy.videoEmbedUrl).toBeNull();
  });

  it("carries the video onto the public wire only for published stories", async () => {
    const created = await createCaseStudy(
      admin,
      input({ slug: "phase27-public", slotNumber: 2, status: "PUBLISHED", videoEmbedUrl: YOUTUBE }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);

    const draft = await createCaseStudy(
      admin,
      input({
        title: "Phase27 Draft story",
        slug: "phase27-draft",
        slotNumber: 3,
        videoEmbedUrl: VIMEO,
      }),
    );
    if (!draft.ok) throw new Error(`create failed: ${draft.error}`);

    const published = await getPublishedCaseStudyBySlug("phase27-public");
    expect(published?.videoEmbedUrl).toBe(YOUTUBE_EMBED);
    expect(blogVideoEmbedSrc(published?.videoEmbedUrl ?? null)).toBe(YOUTUBE_EMBED);

    expect(await getPublishedCaseStudyBySlug("phase27-draft")).toBeNull();
    const ids = (await listPublishedCaseStudies()).map((study) => study.id);
    expect(ids).toContain(created.caseStudy.id);
    expect(ids).not.toContain(draft.caseStudy.id);

    const cleared = await updateCaseStudy(
      admin,
      created.caseStudy.id,
      input({ slotNumber: 2, status: "PUBLISHED", videoEmbedUrl: "" }),
    );
    expect(cleared.ok && cleared.caseStudy.videoEmbedUrl).toBeNull();
    expect((await getPublishedCaseStudyBySlug("phase27-public"))?.videoEmbedUrl).toBeNull();
  });
});
