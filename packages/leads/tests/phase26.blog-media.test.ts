import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BLOG_IMAGE_FILENAME_PATTERN,
  BLOG_MAX_IMAGE_ALT,
  BLOG_MAX_VIDEO_EMBED_URL,
  BLOG_VIDEO_EMBED_HOSTS,
  blogVideoEmbedSrc,
  createAdminUser,
  createBlogPost,
  ensureBootstrapAdmin,
  getPrisma,
  getPublishedBlogPostBySlug,
  hashPassword,
  isAllowedBlogVideoEmbedHost,
  setBlogPostImage,
  updateBlogPost,
  type BlogInput,
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

function input(overrides: Partial<BlogInput> = {}): BlogInput {
  return {
    title: "Phase26 Cover story",
    excerpt: "How a cover image and a video embed reach the public article.",
    content: "Body copy for the phase 26 blog media tests.",
    tags: ["media"],
    status: "DRAFT",
    ...overrides,
  };
}

const NOT_A_CUID = "not-a-cuid";
const MISSING_CUID = "c0000000000000000000000000";
const VALID_KEY = `${MISSING_CUID.slice(0, 20)}-deadbeef.png`;

const YOUTUBE = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const YOUTUBE_EMBED = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const VIMEO = "https://vimeo.com/123456789";
const VIMEO_EMBED = "https://player.vimeo.com/video/123456789";

describe("blog media vocabulary", () => {
  it("only accepts generated filenames for cover keys", () => {
    expect(BLOG_IMAGE_FILENAME_PATTERN.test(VALID_KEY)).toBe(true);
    expect(BLOG_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-cafebeef.jpeg`)).toBe(true);
    expect(BLOG_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-deadbeef.svg`)).toBe(false);
    expect(BLOG_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}.png`)).toBe(false);
    expect(BLOG_IMAGE_FILENAME_PATTERN.test("../../etc/passwd")).toBe(false);
    expect(BLOG_IMAGE_FILENAME_PATTERN.test("evil.png")).toBe(false);
    expect(BLOG_IMAGE_FILENAME_PATTERN.test(`${MISSING_CUID}-zzzzzzzz.png`)).toBe(false);
    expect(BLOG_MAX_IMAGE_ALT).toBe(120);
    expect(BLOG_MAX_VIDEO_EMBED_URL).toBe(300);
    expect([...BLOG_VIDEO_EMBED_HOSTS]).toEqual(
      expect.arrayContaining(["youtube.com", "youtu.be", "vimeo.com", "player.vimeo.com"]),
    );
  });

  it("only treats https YouTube/Vimeo URLs as embeddable", () => {
    expect(isAllowedBlogVideoEmbedHost(new URL(YOUTUBE))).toBe(true);
    expect(isAllowedBlogVideoEmbedHost(new URL(VIMEO))).toBe(true);
    expect(isAllowedBlogVideoEmbedHost(new URL("https://evil.example/video"))).toBe(false);
    expect(isAllowedBlogVideoEmbedHost(new URL("https://youtube.com.evil.example/v"))).toBe(false);
  });

  it("re-checks the embed URL at render time and drops anything else", () => {
    expect(blogVideoEmbedSrc(YOUTUBE)).toBe(YOUTUBE_EMBED);
    expect(blogVideoEmbedSrc(VIMEO)).toBe(VIMEO_EMBED);
    expect(blogVideoEmbedSrc(null)).toBeNull();
    expect(blogVideoEmbedSrc("")).toBeNull();
    expect(blogVideoEmbedSrc("not a url")).toBeNull();
    expect(blogVideoEmbedSrc("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(blogVideoEmbedSrc("javascript:alert(1)")).toBeNull();
    expect(blogVideoEmbedSrc("https://evil.example/embed")).toBeNull();
  });

  it("rewrites share links to the URL a player will actually frame", () => {
    expect(blogVideoEmbedSrc("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(YOUTUBE_EMBED);
    expect(blogVideoEmbedSrc("https://youtube.com/live/dQw4w9WgXcQ?si=abc")).toBe(YOUTUBE_EMBED);
    expect(blogVideoEmbedSrc("https://youtu.be/dQw4w9WgXcQ?t=30")).toBe(
      `${YOUTUBE_EMBED}?start=30`,
    );
    expect(blogVideoEmbedSrc("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(YOUTUBE_EMBED);
    expect(blogVideoEmbedSrc(`${YOUTUBE}&t=1m30s&si=track&list=PL123`)).toBe(
      `${YOUTUBE_EMBED}?list=PL123&start=90`,
    );
    expect(blogVideoEmbedSrc("https://vimeo.com/123456789?h=abcdef")).toBe(
      `${VIMEO_EMBED}?h=abcdef`,
    );
    expect(blogVideoEmbedSrc(`${VIMEO_EMBED}?h=abcdef`)).toBe(`${VIMEO_EMBED}?h=abcdef`);
    expect(blogVideoEmbedSrc("https://www.youtube.com/@channelname")).toBe(
      "https://www.youtube.com/@channelname",
    );
    expect(blogVideoEmbedSrc("https://www.youtube.com/watch")).toBe(
      "https://www.youtube.com/watch",
    );
  });
});

describe("blog cover image and video embed (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;
  let postId: string;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase26-admin@example.com", "Phase26 Admin", "admin");
    staff = await createOperator("phase26-staff@example.com", "Phase26 Staff", "staff");
    await getPrisma().blogPost.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  afterAll(async () => {
    await getPrisma().blogPost.deleteMany({
      where: { createdById: { in: [admin.id, staff.id] } },
    });
  });

  it("rejects unauthenticated and non-CRM image writes", async () => {
    expect(await setBlogPostImage(null, MISSING_CUID, VALID_KEY)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    const outsider = {
      id: "outsider",
      email: "c@example.com",
      name: "C",
      role: "client",
    } as unknown as CrmUser;
    expect(await setBlogPostImage(outsider, MISSING_CUID, VALID_KEY)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("refuses video links that are not https YouTube or Vimeo", async () => {
    for (const bad of [
      "https://evil.example/watch?v=1",
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)",
      "www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.example/watch?v=1",
    ]) {
      expect(await createBlogPost(admin, input({ videoEmbedUrl: bad }))).toMatchObject({
        ok: false,
        error: "invalid",
      });
    }
    expect(
      await createBlogPost(admin, input({ videoEmbedUrl: `https://youtu.be/${"a".repeat(400)}` })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(await createBlogPost(admin, input({ videoEmbedUrl: 42 }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("stores alt text and a normalised embed URL on create and update", async () => {
    const created = await createBlogPost(
      admin,
      input({ videoEmbedUrl: `  ${YOUTUBE}  `, imageAlt: "  Rebuilt checkout on mobile  " }),
    );
    if (!created.ok) throw new Error(`create failed: ${created.error}`);
    postId = created.post.id;
    expect(created.post.videoEmbedUrl).toBe(YOUTUBE_EMBED);
    expect(created.post.imageAlt).toBe("Rebuilt checkout on mobile");
    expect(created.post.imagePath).toBeNull();

    const shorts = await createBlogPost(
      staff,
      input({
        title: "Phase26 Shorts",
        videoEmbedUrl: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      }),
    );
    if (!shorts.ok) throw new Error(`create failed: ${shorts.error}`);
    expect(shorts.post.videoEmbedUrl).toBe(YOUTUBE_EMBED);
    await getPrisma().blogPost.delete({ where: { id: shorts.post.id } });

    const blank = await createBlogPost(
      staff,
      input({ title: "Phase26 No media", videoEmbedUrl: "", imageAlt: "" }),
    );
    if (!blank.ok) throw new Error(`create failed: ${blank.error}`);
    expect(blank.post.videoEmbedUrl).toBeNull();
    expect(blank.post.imageAlt).toBeNull();

    const published = await updateBlogPost(admin, postId, input({ videoEmbedUrl: VIMEO }));
    if (!published.ok) throw new Error(`update failed: ${published.error}`);
    expect(published.post.videoEmbedUrl).toBe(VIMEO_EMBED);

    const cleared = await updateBlogPost(admin, postId, input({ videoEmbedUrl: "" }));
    if (!cleared.ok) throw new Error(`update failed: ${cleared.error}`);
    expect(cleared.post.videoEmbedUrl).toBeNull();
  });

  it("validates alt text length before touching the database", async () => {
    expect(
      await createBlogPost(admin, input({ imageAlt: "a".repeat(BLOG_MAX_IMAGE_ALT + 1) })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(await createBlogPost(admin, input({ imageAlt: 42 }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("stores, replaces and clears the cover key with filename re-validation", async () => {
    const missing = await setBlogPostImage(admin, MISSING_CUID, VALID_KEY);
    expect(missing).toMatchObject({ ok: false, error: "not_found" });
    expect(await setBlogPostImage(admin, NOT_A_CUID, VALID_KEY)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await setBlogPostImage(admin, postId, "../../etc/passwd")).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await setBlogPostImage(admin, postId, "evil.svg")).toMatchObject({
      ok: false,
      error: "invalid",
    });

    const stored = await setBlogPostImage(admin, postId, VALID_KEY);
    expect(stored).toMatchObject({ ok: true });
    expect(stored.ok && stored.post.imagePath).toBe(VALID_KEY);

    const swapped = await setBlogPostImage(staff, postId, `${MISSING_CUID}-cafebeef.webp`);
    expect(swapped.ok && swapped.post.imagePath).toBe(`${MISSING_CUID}-cafebeef.webp`);

    const cleared = await setBlogPostImage(admin, postId, null);
    expect(cleared.ok && cleared.post.imagePath).toBeNull();
  });

  it("carries the media onto the public wire only for published posts", async () => {
    const withMedia = await updateBlogPost(
      admin,
      postId,
      input({
        title: "Phase26 Published cover",
        status: "PUBLISHED",
        videoEmbedUrl: YOUTUBE,
        imageAlt: "Cover alt",
      }),
    );
    if (!withMedia.ok) throw new Error(`update failed: ${withMedia.error}`);
    await setBlogPostImage(admin, postId, VALID_KEY);

    const publicPost = await getPublishedBlogPostBySlug(withMedia.post.slug);
    expect(publicPost).toMatchObject({
      imagePath: VALID_KEY,
      imageAlt: "Cover alt",
      videoEmbedUrl: YOUTUBE_EMBED,
    });
    expect(blogVideoEmbedSrc(publicPost?.videoEmbedUrl ?? null)).toBe(YOUTUBE_EMBED);
  });
});
