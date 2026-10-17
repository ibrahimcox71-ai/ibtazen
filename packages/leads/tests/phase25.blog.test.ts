import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BLOG_MAX_EXCERPT,
  BLOG_MAX_TAG,
  BLOG_MAX_TAGS,
  blogReadingMinutes,
  createAdminUser,
  createBlogPost,
  deleteBlogPost,
  ensureBootstrapAdmin,
  getBlogPostForActor,
  getPrisma,
  getPublishedBlogPostBySlug,
  hashPassword,
  isBlogStatus,
  listBlogPosts,
  listBlogPostsForActor,
  listPublishedBlogPosts,
  parseBlogTags,
  slugifyBlogTitle,
  updateBlogPost,
  type BlogInput,
  type CrmUser,
} from "../src/index";

async function createOperator(email: string, role: "admin" | "staff"): Promise<CrmUser> {
  const user = await createAdminUser({
    email,
    name: `Phase25 ${role}`,
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

function input(overrides: Partial<BlogInput> = {}): BlogInput {
  return {
    title: "Shipping a faster checkout",
    excerpt: "What we measured when the checkout journey was rebuilt.",
    content: "A rebuilt checkout changes more than the buttons. Here is what we measured.",
    tags: ["CRO", "checkout"],
    status: "DRAFT",
    ...overrides,
  };
}

const NOT_A_CUID = "not-a-cuid";
const MISSING_CUID = "c0000000000000000000000000";

describe("blog vocabulary", () => {
  it("slugifies titles into URL segments", () => {
    expect(slugifyBlogTitle("Shipping a faster checkout")).toBe("shipping-a-faster-checkout");
    expect(slugifyBlogTitle("  SEO & AEO, explained!  ")).toBe("seo-aeo-explained");
    expect(slugifyBlogTitle("Caf\u00e9 metrics")).toBe("cafe-metrics");
    expect(slugifyBlogTitle("!!!")).toBe("");
  });

  it("recognises only the two lifecycle states", () => {
    expect(isBlogStatus("DRAFT")).toBe(true);
    expect(isBlogStatus("PUBLISHED")).toBe(true);
    expect(isBlogStatus("archived")).toBe(false);
  });

  it("parses stored tags and degrades malformed data", () => {
    expect(parseBlogTags('["seo","cro"]')).toEqual(["seo", "cro"]);
    expect(parseBlogTags("not json")).toEqual([]);
    expect(parseBlogTags('{"a":1}')).toEqual([]);
    expect(parseBlogTags(null)).toEqual([]);
    expect(parseBlogTags('["ok","", 42]')).toEqual(["ok"]);
  });

  it("estimates reading time in whole minutes", () => {
    expect(blogReadingMinutes("")).toBe(1);
    expect(blogReadingMinutes("two words")).toBe(1);
    expect(blogReadingMinutes(Array.from({ length: 600 }, () => "word").join(" "))).toBe(3);
  });
});

describe("blog service (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let draftId: string;
  let publishedId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase25-admin@example.com", "admin");
    staff = await createOperator("phase25-staff@example.com", "staff");
    await getPrisma().blogPost.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  afterAll(async () => {
    await getPrisma().blogPost.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  it("rejects unauthenticated and non-CRM writes and reads", async () => {
    expect(await createBlogPost(null, input())).toMatchObject({ ok: false, error: "unauthorized" });
    expect(await listBlogPostsForActor(null)).toEqual({ ok: false, error: "unauthorized" });
    expect(await getBlogPostForActor(null, MISSING_CUID)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await createBlogPost(outsider, input())).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await listBlogPostsForActor(outsider)).toEqual({ ok: false, error: "unauthorized" });
  });

  it("validates every field before touching the database", async () => {
    expect(await createBlogPost(admin, input({ title: "" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(
      await createBlogPost(admin, input({ excerpt: "x".repeat(BLOG_MAX_EXCERPT + 1) })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(await createBlogPost(admin, input({ content: "   " }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createBlogPost(admin, input({ status: "live" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createBlogPost(admin, input({ slug: "Not a slug!" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createBlogPost(admin, input({ tags: "seo" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(
      await createBlogPost(admin, input({ tags: ["a".repeat(BLOG_MAX_TAG + 1)] })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(
      await createBlogPost(
        admin,
        input({ tags: Array.from({ length: BLOG_MAX_TAGS + 1 }, (_, i) => `tag-${i}`) }),
      ),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(await createBlogPost(admin, input({ tags: [42] }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("creates a draft with a derived slug and normalised tags", async () => {
    const created = await createBlogPost(
      admin,
      input({ tags: ["  CRO ", "cro", "SEO"], status: "DRAFT" }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    draftId = created.post.id;

    expect(created.post.slug).toBe("shipping-a-faster-checkout");
    expect(created.post.status).toBe("DRAFT");
    expect(created.post.publishedAt).toBeNull();
    expect(JSON.parse(created.post.tags)).toEqual(["cro", "seo"]);
    expect(created.post.createdBy.email).toBe(admin.email);
  });

  it("stamps publishedAt on the first publish and keeps it stable", async () => {
    const created = await createBlogPost(
      staff,
      input({ title: "Published already", status: "PUBLISHED" }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    publishedId = created.post.id;
    const firstStamp = created.post.publishedAt;
    expect(firstStamp).not.toBeNull();

    // Editing while published must not move the reported publish date.
    const edited = await updateBlogPost(
      admin,
      publishedId,
      input({ title: "Published edited", status: "PUBLISHED" }),
    );
    if (!edited.ok) throw new Error(`update failed: ${edited.error}`);
    expect(edited.post.publishedAt?.getTime()).toBe(firstStamp?.getTime());
    expect(edited.post.slug).toBe("published-already");

    // Unpublishing clears it; republishing stamps a fresh date.
    const unpublished = await updateBlogPost(
      admin,
      publishedId,
      input({ title: "Published edited", status: "DRAFT" }),
    );
    if (!unpublished.ok) throw new Error(`update failed: ${unpublished.error}`);
    expect(unpublished.post.publishedAt).toBeNull();

    const republished = await updateBlogPost(
      admin,
      publishedId,
      input({ title: "Published edited", status: "PUBLISHED" }),
    );
    if (!republished.ok) throw new Error(`update failed: ${republished.error}`);
    expect(republished.post.publishedAt).not.toBeNull();
  });

  it("guards slug collisions on create and update", async () => {
    expect(
      await createBlogPost(admin, input({ slug: "shipping-a-faster-checkout" })),
    ).toMatchObject({ ok: false, error: "slug_taken" });
    // A duplicate title falls back to a numbered slug.
    const derived = await createBlogPost(admin, input({}));
    if (!derived.ok) throw new Error(`create failed: ${derived.error}`);
    expect(derived.post.slug).toBe("shipping-a-faster-checkout-2");

    expect(
      await updateBlogPost(admin, derived.post.id, input({ slug: "published-already" })),
    ).toMatchObject({ ok: false, error: "slug_taken" });
    expect(await updateBlogPost(admin, NOT_A_CUID, input())).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await updateBlogPost(admin, MISSING_CUID, input())).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await getBlogPostForActor(admin, MISSING_CUID)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await getBlogPostForActor(admin, NOT_A_CUID)).toEqual({ ok: false, error: "not_found" });

    await getPrisma().blogPost.delete({ where: { id: derived.post.id } });
  });

  it("exposes drafts to CRM actors but never to the public surface", async () => {
    const listed = await listBlogPostsForActor(admin);
    if (!listed.ok) throw new Error("list failed");
    const ids = listed.posts.map((post) => post.id);
    expect(ids).toContain(draftId);
    expect(ids).toContain(publishedId);
    expect(await listBlogPosts()).toHaveLength(ids.length);

    expect(await getPublishedBlogPostBySlug("shipping-a-faster-checkout")).toBeNull();
    const publicPosts = await listPublishedBlogPosts();
    expect(publicPosts.map((post) => post.id)).not.toContain(draftId);
    expect(publicPosts.map((post) => post.id)).toContain(publishedId);
  });

  it("serves published posts with wire-safe fields only", async () => {
    const post = await getPublishedBlogPostBySlug("published-edited");
    expect(post).toBeNull(); // the slug never changed on update

    const found = await getPublishedBlogPostBySlug("published-already");
    if (!found) throw new Error("published post not readable by slug");
    expect(found.title).toBe("Published edited");
    expect(found.tags).toEqual(["cro", "checkout"]);
    expect(found.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(Object.keys(found).sort()).toEqual([
      "content",
      "excerpt",
      "id",
      "imageAlt",
      "imagePath",
      "publishedAt",
      "readingMinutes",
      "slug",
      "tags",
      "title",
      "updatedAt",
      "videoEmbedUrl",
    ]);
    expect(await getPublishedBlogPostBySlug("Not a slug")).toBeNull();
    expect(await getPublishedBlogPostBySlug(42)).toBeNull();
    expect(await getPublishedBlogPostBySlug("never-published")).toBeNull();
  });

  it("deletes a post for CRM writers and leaves no trace behind", async () => {
    const created = await createBlogPost(
      admin,
      input({ title: "Temporary announcement", status: "PUBLISHED" }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    const { id, slug } = created.post;

    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await deleteBlogPost(null, id)).toMatchObject({ ok: false, error: "unauthorized" });
    expect(await deleteBlogPost(outsider, id)).toMatchObject({ ok: false, error: "unauthorized" });
    expect(await deleteBlogPost(staff, NOT_A_CUID)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await deleteBlogPost(staff, MISSING_CUID)).toMatchObject({
      ok: false,
      error: "not_found",
    });

    const removed = await deleteBlogPost(staff, id);
    expect(removed).toEqual({ ok: true, slug, imagePath: null });

    expect(await getBlogPostForActor(admin, id)).toEqual({ ok: false, error: "not_found" });
    expect(await getPublishedBlogPostBySlug(slug)).toBeNull();
    const ids = (await listBlogPosts()).map((post) => post.id);
    expect(ids).not.toContain(id);
    expect(await deleteBlogPost(admin, id)).toMatchObject({ ok: false, error: "not_found" });
  });
});
