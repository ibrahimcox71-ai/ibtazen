import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/uploads/case-studies/[file]/route";
import { GET as getBlogImage } from "@/app/api/uploads/blog/[file]/route";
import { GET as getBrandImage } from "@/app/api/uploads/brand/[file]/route";
import { FAVICON_ROUTE, brandImageUrl } from "@/lib/brand-image";
import { blogImageUrl } from "@/lib/blog-image";
import { caseStudyImageUrl } from "@/lib/case-study-image";
import {
  BLOG_MAX_IMAGE_BYTES,
  blogUploadDir,
  BRAND_MAX_IMAGE_BYTES,
  brandUploadDir,
  CASE_STUDY_MAX_IMAGE_BYTES,
  caseStudyUploadDir,
  prepareBlogImage,
  prepareBrandImage,
  prepareCaseStudyImage,
  readBlogImage,
  readBrandImage,
  readCaseStudyImage,
  removeBlogImage,
  removeBrandImage,
  removeCaseStudyImage,
  storeBlogImage,
  storeBrandImage,
  storeCaseStudyImage,
} from "@/lib/uploads";
import type { SiteAssetSlot } from "@ibtatech/leads/domain";

/**
 * The brand route reads the settings row through `getSiteSettings`; the row
 * itself is covered by the leads package, so here it is a seam.
 */
const leadsMocks = vi.hoisted(() => ({ getSiteSettings: vi.fn() }));
vi.mock("@ibtatech/leads", () => ({ getSiteSettings: leadsMocks.getSiteSettings }));

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03,
]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const CASE_ID = "cphase24test00000000x";
const VALID_KEY = `${CASE_ID}-deadbeef.png`;

function pngFile(name = "shot.png", bytes: Uint8Array<ArrayBuffer> = PNG_BYTES): File {
  return new File([bytes], name, { type: "image/png" });
}

describe("case study image URLs", () => {
  it("builds serving URLs only for generated filenames", () => {
    expect(caseStudyImageUrl(VALID_KEY)).toBe(`/api/uploads/case-studies/${VALID_KEY}`);
    expect(caseStudyImageUrl(null)).toBeNull();
    expect(caseStudyImageUrl(undefined)).toBeNull();
    expect(caseStudyImageUrl("")).toBeNull();
    expect(caseStudyImageUrl("evil.svg")).toBeNull();
    expect(caseStudyImageUrl("../../etc/passwd")).toBeNull();
    expect(caseStudyImageUrl("shot.png")).toBeNull();
  });
});

describe("case study image validation", () => {
  it("accepts a well-formed PNG and reports its extension", async () => {
    const prepared = await prepareCaseStudyImage(pngFile());
    expect(prepared).toMatchObject({ ok: true, extension: "png" });
  });

  it("rejects empty files", async () => {
    const prepared = await prepareCaseStudyImage(pngFile("empty.png", new Uint8Array(0)));
    expect(prepared).toMatchObject({ ok: false });
  });

  it("rejects unsupported MIME types", async () => {
    const file = new File([PNG_BYTES], "notes.txt", { type: "text/plain" });
    const prepared = await prepareCaseStudyImage(file);
    expect(prepared).toMatchObject({ ok: false });
    expect(prepared.ok === false && prepared.message).toMatch(/PNG, JPEG/);
  });

  it("rejects files over the size limit", async () => {
    const oversized = new Uint8Array(CASE_STUDY_MAX_IMAGE_BYTES + 1);
    oversized.set(PNG_BYTES, 0);
    const prepared = await prepareCaseStudyImage(pngFile("big.png", oversized));
    expect(prepared).toMatchObject({ ok: false });
    expect(prepared.ok === false && prepared.message).toMatch(/5 MB/);
  });

  it("rejects files whose bytes do not match the declared type", async () => {
    const spoofed = new File([JPEG_BYTES], "fake.png", { type: "image/png" });
    const prepared = await prepareCaseStudyImage(spoofed);
    expect(prepared).toMatchObject({ ok: false });
    expect(prepared.ok === false && prepared.message).toMatch(/valid image/);
  });
});

describe("case study image storage and serving", () => {
  let tempDir: string;
  let originalDir: string | undefined;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "ibtatech-uploads-"));
    originalDir = process.env.CASE_STUDY_UPLOAD_DIR;
    process.env.CASE_STUDY_UPLOAD_DIR = tempDir;
  });

  afterAll(async () => {
    if (originalDir === undefined) delete process.env.CASE_STUDY_UPLOAD_DIR;
    else process.env.CASE_STUDY_UPLOAD_DIR = originalDir;
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(caseStudyUploadDir(), { recursive: true, force: true });
  });

  it("stores an image under a generated filename that passes the URL pattern", async () => {
    const prepared = await prepareCaseStudyImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeCaseStudyImage(CASE_ID, prepared);
    if (!stored.ok) throw new Error(`store failed: ${stored.message}`);

    expect(stored.key).toMatch(/^[a-z0-9]+-[a-f0-9]{8}\.png$/i);
    expect(caseStudyImageUrl(stored.key)).toContain(stored.key);
    const onDisk = await readFile(path.join(tempDir, stored.key));
    expect(Array.from(onDisk.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const read = await readCaseStudyImage(stored.key);
    expect(read?.contentType).toBe("image/png");
    expect(read?.bytes.byteLength).toBe(PNG_BYTES.byteLength);
  });

  it("refuses to store under a non-generated case study id", async () => {
    const prepared = await prepareCaseStudyImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    for (const badId of ["../../etc", "not-a-cuid", ""]) {
      const stored = await storeCaseStudyImage(badId, prepared);
      expect(stored).toMatchObject({ ok: false });
    }
  });

  it("removes stored images and ignores unsafe keys", async () => {
    const prepared = await prepareCaseStudyImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeCaseStudyImage(CASE_ID, prepared);
    if (!stored.ok) throw new Error("store failed");

    await removeCaseStudyImage("../../package.json");
    await removeCaseStudyImage(null);
    await removeCaseStudyImage("evil.svg");
    expect(await readCaseStudyImage(stored.key)).not.toBeNull();

    await removeCaseStudyImage(stored.key);
    expect(await readCaseStudyImage(stored.key)).toBeNull();
  });

  it("returns null for missing or unsafe read keys", async () => {
    expect(await readCaseStudyImage("../../package.json")).toBeNull();
    expect(await readCaseStudyImage("evil.svg")).toBeNull();
    expect(await readCaseStudyImage(VALID_KEY)).toBeNull();
  });

  it("serves stored images with caching and 404s unsafe or missing names", async () => {
    const prepared = await prepareCaseStudyImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeCaseStudyImage(CASE_ID, prepared);
    if (!stored.ok) throw new Error("store failed");

    const request = new Request("http://localhost/api/uploads/case-studies/x");
    const hit = await GET(request, { params: Promise.resolve({ file: stored.key }) });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("Content-Type")).toBe("image/png");
    expect(hit.headers.get("Cache-Control")).toContain("immutable");
    expect(hit.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await hit.arrayBuffer())).toEqual(PNG_BYTES);

    const traversal = await GET(request, {
      params: Promise.resolve({ file: "../../package.json" }),
    });
    expect(traversal.status).toBe(404);

    const missing = await GET(request, {
      params: Promise.resolve({ file: `${CASE_ID}-00000000.png` }),
    });
    expect(missing.status).toBe(404);
  });

  it("keeps the default upload directory outside the tracked tree", async () => {
    const saved = process.env.CASE_STUDY_UPLOAD_DIR;
    delete process.env.CASE_STUDY_UPLOAD_DIR;
    expect(caseStudyUploadDir()).toContain(path.join("uploads", "case-studies"));
    if (saved === undefined) delete process.env.CASE_STUDY_UPLOAD_DIR;
    else process.env.CASE_STUDY_UPLOAD_DIR = saved;
  });
});

describe("blog cover image URLs", () => {
  it("builds serving URLs only for generated filenames", () => {
    expect(blogImageUrl(VALID_KEY)).toBe(`/api/uploads/blog/${VALID_KEY}`);
    expect(blogImageUrl(null)).toBeNull();
    expect(blogImageUrl(undefined)).toBeNull();
    expect(blogImageUrl("")).toBeNull();
    expect(blogImageUrl("evil.svg")).toBeNull();
    expect(blogImageUrl("../../etc/passwd")).toBeNull();
    expect(blogImageUrl("shot.png")).toBeNull();
  });

  it("shares the single 5 MB ceiling across every upload surface", () => {
    expect(BLOG_MAX_IMAGE_BYTES).toBe(CASE_STUDY_MAX_IMAGE_BYTES);
    expect(BLOG_MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("blog cover image validation", () => {
  it("accepts a well-formed PNG and rejects empty or spoofed bytes", async () => {
    expect(await prepareBlogImage(pngFile())).toMatchObject({ ok: true, extension: "png" });
    expect(await prepareBlogImage(pngFile("empty.png", new Uint8Array(0)))).toMatchObject({
      ok: false,
    });

    const spoofed = new File([JPEG_BYTES], "fake.png", { type: "image/png" });
    expect(await prepareBlogImage(spoofed)).toMatchObject({ ok: false });

    const oversized = new Uint8Array(BLOG_MAX_IMAGE_BYTES + 1);
    oversized.set(PNG_BYTES, 0);
    expect(await prepareBlogImage(pngFile("big.png", oversized))).toMatchObject({ ok: false });
  });
});

describe("blog cover image storage and serving", () => {
  let tempDir: string;
  let originalDir: string | undefined;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "ibtatech-blog-uploads-"));
    originalDir = process.env.BLOG_UPLOAD_DIR;
    process.env.BLOG_UPLOAD_DIR = tempDir;
  });

  afterAll(async () => {
    if (originalDir === undefined) delete process.env.BLOG_UPLOAD_DIR;
    else process.env.BLOG_UPLOAD_DIR = originalDir;
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(blogUploadDir(), { recursive: true, force: true });
  });

  it("stores a cover under a generated filename that passes the URL pattern", async () => {
    const prepared = await prepareBlogImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeBlogImage(CASE_ID, prepared);
    if (!stored.ok) throw new Error(`store failed: ${stored.message}`);

    expect(stored.key).toMatch(/^[a-z0-9]+-[a-f0-9]{8}\.png$/i);
    expect(blogImageUrl(stored.key)).toContain(stored.key);
    const onDisk = await readFile(path.join(tempDir, stored.key));
    expect(Array.from(onDisk.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const read = await readBlogImage(stored.key);
    expect(read?.contentType).toBe("image/png");
    expect(read?.bytes.byteLength).toBe(PNG_BYTES.byteLength);
  });

  it("refuses to store under a non-generated post id", async () => {
    const prepared = await prepareBlogImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    for (const badId of ["../../etc", "not-a-cuid", ""]) {
      expect(await storeBlogImage(badId, prepared)).toMatchObject({ ok: false });
    }
  });

  it("removes stored covers and ignores unsafe keys", async () => {
    const prepared = await prepareBlogImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeBlogImage(CASE_ID, prepared);
    if (!stored.ok) throw new Error("store failed");

    await removeBlogImage("../../package.json");
    await removeBlogImage(null);
    await removeBlogImage("evil.svg");
    expect(await readBlogImage(stored.key)).not.toBeNull();

    await removeBlogImage(stored.key);
    expect(await readBlogImage(stored.key)).toBeNull();
    expect(await readBlogImage("../../package.json")).toBeNull();
  });

  it("serves stored covers with caching and 404s unsafe or missing names", async () => {
    const prepared = await prepareBlogImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeBlogImage(CASE_ID, prepared);
    if (!stored.ok) throw new Error("store failed");

    const request = new Request("http://localhost/api/uploads/blog/x");
    const hit = await getBlogImage(request, { params: Promise.resolve({ file: stored.key }) });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("Content-Type")).toBe("image/png");
    expect(hit.headers.get("Cache-Control")).toContain("immutable");
    expect(hit.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await hit.arrayBuffer())).toEqual(PNG_BYTES);

    const traversal = await getBlogImage(request, {
      params: Promise.resolve({ file: "../../package.json" }),
    });
    expect(traversal.status).toBe(404);

    const missing = await getBlogImage(request, {
      params: Promise.resolve({ file: `${CASE_ID}-00000000.png` }),
    });
    expect(missing.status).toBe(404);
  });

  it("keeps the default upload directory outside the tracked tree", async () => {
    const saved = process.env.BLOG_UPLOAD_DIR;
    delete process.env.BLOG_UPLOAD_DIR;
    expect(blogUploadDir()).toContain(path.join("uploads", "blog"));
    if (saved === undefined) delete process.env.BLOG_UPLOAD_DIR;
    else process.env.BLOG_UPLOAD_DIR = saved;
  });
});

const LOGO_KEY = "logo-deadbeef.png";
const FAVICON_KEY = "favicon-cafebeef.png";

describe("brand asset URLs", () => {
  it("builds serving URLs only for generated filenames", () => {
    expect(brandImageUrl(LOGO_KEY)).toBe(`/api/uploads/brand/${LOGO_KEY}`);
    expect(brandImageUrl(FAVICON_KEY)).toBe(`/api/uploads/brand/${FAVICON_KEY}`);
    expect(brandImageUrl(null)).toBeNull();
    expect(brandImageUrl(undefined)).toBeNull();
    expect(brandImageUrl("")).toBeNull();
    expect(brandImageUrl("evil.svg")).toBeNull();
    expect(brandImageUrl("../../etc/passwd")).toBeNull();
    expect(brandImageUrl("logo.png")).toBeNull();
    // The favicon lives behind a stable alias — root metadata cannot know a key.
    expect(FAVICON_ROUTE).toBe("/api/uploads/brand/favicon");
    expect(brandImageUrl(LOGO_KEY)).not.toBe(FAVICON_ROUTE);
  });

  it("shares the single 5 MB ceiling across every upload surface", () => {
    expect(BRAND_MAX_IMAGE_BYTES).toBe(BLOG_MAX_IMAGE_BYTES);
    expect(BRAND_MAX_IMAGE_BYTES).toBe(CASE_STUDY_MAX_IMAGE_BYTES);
    expect(BRAND_MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("brand asset validation", () => {
  it("accepts a well-formed PNG and rejects empty, spoofed or oversized files", async () => {
    expect(await prepareBrandImage(pngFile())).toMatchObject({ ok: true, extension: "png" });
    expect(await prepareBrandImage(pngFile("empty.png", new Uint8Array(0)))).toMatchObject({
      ok: false,
    });

    const spoofed = new File([JPEG_BYTES], "fake.png", { type: "image/png" });
    expect(await prepareBrandImage(spoofed)).toMatchObject({ ok: false });

    const oversized = new Uint8Array(BRAND_MAX_IMAGE_BYTES + 1);
    oversized.set(PNG_BYTES, 0);
    expect(await prepareBrandImage(pngFile("big.png", oversized))).toMatchObject({ ok: false });
  });
});

describe("brand asset storage and serving", () => {
  let tempDir: string;
  let originalDir: string | undefined;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "ibtatech-brand-uploads-"));
    originalDir = process.env.BRAND_UPLOAD_DIR;
    process.env.BRAND_UPLOAD_DIR = tempDir;
    leadsMocks.getSiteSettings.mockResolvedValue({ logoPath: null, faviconPath: null });
  });

  afterAll(async () => {
    if (originalDir === undefined) delete process.env.BRAND_UPLOAD_DIR;
    else process.env.BRAND_UPLOAD_DIR = originalDir;
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    leadsMocks.getSiteSettings.mockResolvedValue({ logoPath: null, faviconPath: null });
    await rm(brandUploadDir(), { recursive: true, force: true });
  });

  it("stores each slot under its own generated filename", async () => {
    const prepared = await prepareBrandImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");

    const logo = await storeBrandImage("logo", prepared);
    if (!logo.ok) throw new Error(`store failed: ${logo.message}`);
    expect(logo.key).toMatch(/^logo-[a-f0-9]{8}\.png$/i);
    expect(brandImageUrl(logo.key)).toContain(logo.key);
    const onDisk = await readFile(path.join(tempDir, logo.key));
    expect(Array.from(onDisk.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const favicon = await storeBrandImage("favicon", prepared);
    if (!favicon.ok) throw new Error(`store failed: ${favicon.message}`);
    expect(favicon.key).toMatch(/^favicon-[a-f0-9]{8}\.png$/i);

    const read = await readBrandImage(logo.key);
    expect(read?.contentType).toBe("image/png");
    expect(read?.bytes.byteLength).toBe(PNG_BYTES.byteLength);
  });

  it("refuses a slot outside the known two", async () => {
    const prepared = await prepareBrandImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    expect(await storeBrandImage("banner" as SiteAssetSlot, prepared)).toMatchObject({
      ok: false,
    });
  });

  it("removes stored brand files and ignores unsafe keys", async () => {
    const prepared = await prepareBrandImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeBrandImage("logo", prepared);
    if (!stored.ok) throw new Error("store failed");

    await removeBrandImage("../../package.json");
    await removeBrandImage(null);
    await removeBrandImage("evil.svg");
    await removeBrandImage(LOGO_KEY);
    expect(await readBrandImage(stored.key)).not.toBeNull();

    await removeBrandImage(stored.key);
    expect(await readBrandImage(stored.key)).toBeNull();
    expect(await readBrandImage("../../package.json")).toBeNull();
  });

  it("serves stored assets with immutable caching and 404s unsafe or missing names", async () => {
    const prepared = await prepareBrandImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeBrandImage("logo", prepared);
    if (!stored.ok) throw new Error("store failed");

    const request = new Request("http://localhost/api/uploads/brand/x");
    const hit = await getBrandImage(request, { params: Promise.resolve({ file: stored.key }) });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("Content-Type")).toBe("image/png");
    expect(hit.headers.get("Cache-Control")).toContain("immutable");
    expect(hit.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await hit.arrayBuffer())).toEqual(PNG_BYTES);

    const traversal = await getBrandImage(request, {
      params: Promise.resolve({ file: "../../package.json" }),
    });
    expect(traversal.status).toBe(404);

    const missing = await getBrandImage(request, {
      params: Promise.resolve({ file: `${LOGO_KEY.slice(0, -4)}00000000.png` }),
    });
    expect(missing.status).toBe(404);
  });

  it("serves the uploaded favicon behind the stable alias", async () => {
    const prepared = await prepareBrandImage(pngFile());
    if (!prepared.ok) throw new Error("prepare failed");
    const stored = await storeBrandImage("favicon", prepared);
    if (!stored.ok) throw new Error("store failed");
    leadsMocks.getSiteSettings.mockResolvedValue({ logoPath: null, faviconPath: stored.key });

    const hit = await getBrandImage(new Request("http://localhost"), {
      params: Promise.resolve({ file: "favicon" }),
    });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("Content-Type")).toBe("image/png");
    // The alias changes identity on upload — never cached for long.
    expect(hit.headers.get("Cache-Control")).toContain("must-revalidate");
    expect(hit.headers.get("Cache-Control")).not.toContain("immutable");
    expect(new Uint8Array(await hit.arrayBuffer())).toEqual(PNG_BYTES);
    expect(leadsMocks.getSiteSettings).toHaveBeenCalled();
  });

  it("falls back to the bundled favicon when nothing has been uploaded", async () => {
    leadsMocks.getSiteSettings.mockResolvedValue({ logoPath: null, faviconPath: null });

    const hit = await getBrandImage(new Request("http://localhost"), {
      params: Promise.resolve({ file: "favicon" }),
    });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(new Uint8Array(await hit.arrayBuffer()).byteLength).toBeGreaterThan(0);

    // A row pointing at a key that fails the pattern never reaches disk.
    leadsMocks.getSiteSettings.mockResolvedValue({ logoPath: null, faviconPath: "../secrets" });
    const unsafe = await getBrandImage(new Request("http://localhost"), {
      params: Promise.resolve({ file: "favicon" }),
    });
    expect(unsafe.status).toBe(200);
    expect(unsafe.headers.get("Content-Type")).toBe("image/svg+xml");
  });

  it("keeps the default upload directory outside the tracked tree", async () => {
    const saved = process.env.BRAND_UPLOAD_DIR;
    delete process.env.BRAND_UPLOAD_DIR;
    expect(brandUploadDir()).toContain(path.join("uploads", "brand"));
    if (saved === undefined) delete process.env.BRAND_UPLOAD_DIR;
    else process.env.BRAND_UPLOAD_DIR = saved;
  });
});
