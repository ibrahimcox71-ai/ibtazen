import type { BlogPost, BlogPostWithCreator } from "./repository";
import {
  BlogSlugTakenError,
  createBlogPostRow,
  deleteBlogPostRow,
  findBlogPostBySlug,
  getBlogPost,
  listBlogPosts,
  listPublishedBlogPostRows,
  setBlogPostImageRow,
  updateBlogPostRow,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";
import {
  BLOG_IMAGE_FILENAME_PATTERN,
  BLOG_MAX_CONTENT,
  BLOG_MAX_EXCERPT,
  BLOG_MAX_IMAGE_ALT,
  BLOG_MAX_TAG,
  BLOG_MAX_TAGS,
  BLOG_MAX_TITLE,
  BLOG_SLUG_MAX,
  blogReadingMinutes,
  isBlogStatus,
  parseBlogTags,
  parseVideoEmbedUrl,
  type BlogStatus,
} from "./domain";

/**
 * Blog service — the content engine behind `/blog` and `/blog/[slug]`
 * (Phase 25). One row per article with its own URL segment (`slug` unique,
 * stable across title edits); only `PUBLISHED` rows are ever readable
 * without an actor. Title, excerpt, body, tags, slug and status are
 * validated here — the browser never writes a row directly.
 *
 * `publishedAt` is stamped on the first publish and then kept stable, so the
 * sitemap, RSS feed and Article JSON-LD never report a date that silently
 * moves; unpublishing clears it (and the post leaves every public surface).
 *
 * Phase 26 adds media: a cover image (bytes stored by apps/web, the key
 * linked here) and a YouTube/Vimeo embed URL (validated against an
 * https + host allow-list before it can reach an `<iframe src>`).
 */

const cuidLike = /^[c][a-z0-9]{20,}$/i;

/** Shape of a URL segment a blog post may claim. */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BlogErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid"
  | "slug_taken"
  /** The row committed, but a follow-up step (the cover) did not — the caller must not report it as unsaved. */
  | "partial";

export type BlogResult =
  { ok: true; post: BlogPostWithCreator } | { ok: false; error: BlogErrorCode; message?: string };

export type BlogListResult =
  { ok: true; posts: BlogPostWithCreator[] } | { ok: false; error: "unauthorized" };

export type BlogDetailResult =
  { ok: true; post: BlogPostWithCreator } | { ok: false; error: "unauthorized" | "not_found" };

/**
 * Delete reports the slug and cover key the row gave up, so the caller can
 * drop the stored bytes and retire the public URL the post used to own.
 */
export type BlogDeleteResult =
  | { ok: true; slug: string; imagePath: string | null }
  | { ok: false; error: BlogErrorCode; message?: string };

export type BlogInput = {
  title: unknown;
  /** URL segment — blank means "derive from the title" / "keep the current one". */
  slug?: unknown;
  excerpt: unknown;
  content: unknown;
  tags: unknown;
  status: unknown;
  /** Alt text for the cover image (the file itself is stored by apps/web). */
  imageAlt?: unknown;
  /** YouTube/Vimeo watch URL — blank means "no video". */
  videoEmbedUrl?: unknown;
};

interface NormalisedBlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string;
  status: BlogStatus;
  imageAlt: string | null;
  videoEmbedUrl: string | null;
}

function text(value: unknown, field: string, max: number, errors: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${field} is required.`);
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors.push(`${field} must be ${max} characters or fewer.`);
    return trimmed.slice(0, max);
  }
  return trimmed;
}

/** URL segment for a title — ASCII, lowercase, hyphen-separated. */
export function slugifyBlogTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BLOG_SLUG_MAX)
    .replace(/^-+|-+$/g, "");
}

/** Blank means "derive from the title" / "keep the current one". */
function slug(value: unknown, errors: string[]): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    errors.push("Slug must be text.");
    return "";
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length > BLOG_SLUG_MAX || !slugPattern.test(trimmed)) {
    errors.push("Slug may use lowercase letters, numbers and hyphens (max 80 characters).");
    return "";
  }
  return trimmed;
}

function status(value: unknown, errors: string[]): BlogStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "DRAFT";
  if (!isBlogStatus(raw)) {
    errors.push("Status must be Draft or Published.");
    return "DRAFT";
  }
  return raw;
}

/** Tags → normalised, deduplicated lowercase JSON array string. */
function tags(value: unknown, errors: string[]): string {
  if (value === undefined || value === null || value === "") return "[]";
  if (!Array.isArray(value)) {
    errors.push("Tags must be a list of labels.");
    return "[]";
  }
  const clean: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      errors.push("Each tag must be text.");
      continue;
    }
    const trimmed = entry.trim().toLowerCase();
    if (!trimmed) continue;
    if (trimmed.length > BLOG_MAX_TAG) {
      errors.push(`Tags must be ${BLOG_MAX_TAG} characters or fewer.`);
      continue;
    }
    if (!clean.includes(trimmed)) clean.push(trimmed);
  }
  if (clean.length > BLOG_MAX_TAGS) {
    errors.push(`A post can have at most ${BLOG_MAX_TAGS} tags.`);
    return JSON.stringify(clean.slice(0, BLOG_MAX_TAGS));
  }
  return JSON.stringify(clean);
}

/** Blank or missing means "no value" — the row keeps/loses its cover alt text. */
function optionalText(value: unknown, field: string, max: number, errors: string[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${field} must be text.`);
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    errors.push(`${field} must be ${max} characters or fewer.`);
    return trimmed.slice(0, max);
  }
  return trimmed;
}

/** Validate raw form fields into a row payload — first error wins the message. */
function normalise(
  input: BlogInput,
): { ok: true; value: NormalisedBlogPost } | { ok: false; message: string } {
  const errors: string[] = [];
  const value: NormalisedBlogPost = {
    title: text(input.title, "Title", BLOG_MAX_TITLE, errors),
    slug: slug(input.slug, errors),
    excerpt: text(input.excerpt, "Excerpt", BLOG_MAX_EXCERPT, errors),
    content: text(input.content, "Content", BLOG_MAX_CONTENT, errors),
    tags: tags(input.tags, errors),
    status: status(input.status, errors),
    imageAlt: optionalText(input.imageAlt, "Image alt text", BLOG_MAX_IMAGE_ALT, errors),
    videoEmbedUrl: parseVideoEmbedUrl(input.videoEmbedUrl, errors),
  };
  if (errors.length > 0) return { ok: false, message: errors[0] ?? "Invalid post." };
  return { ok: true, value };
}

function toResult(error: unknown, fallback: string): BlogResult {
  if (error instanceof BlogSlugTakenError) {
    return {
      ok: false,
      error: "slug_taken",
      message: "Another post already uses that URL slug.",
    };
  }
  console.error("[blog] write failed", error);
  return { ok: false, error: "invalid", message: fallback };
}

type SlugResolution =
  { ok: true; slug: string } | { ok: false; error: "slug_taken" | "invalid"; message: string };

/**
 * Resolve the slug for a new post: an explicit one is checked for
 * collisions, a blank one is derived from the title and given a numeric
 * suffix when the title is already taken. The unique constraint is still the
 * final guard.
 */
async function resolveNewSlug(provided: string, title: string): Promise<SlugResolution> {
  if (provided) {
    if (await findBlogPostBySlug(provided)) {
      return {
        ok: false,
        error: "slug_taken",
        message: "Another post already uses that URL slug.",
      };
    }
    return { ok: true, slug: provided };
  }

  const base = slugifyBlogTitle(title);
  if (!base) {
    return { ok: false, error: "invalid", message: "Add a title that can form a URL slug." };
  }
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const candidate = `${base.slice(0, BLOG_SLUG_MAX - suffix.length)}${suffix}`;
    if (!(await findBlogPostBySlug(candidate))) return { ok: true, slug: candidate };
  }
  return {
    ok: false,
    error: "invalid",
    message: "No free URL slug is available for that title — set one manually.",
  };
}

/** Blank means "keep the slug the row already owns" — URLs stay stable. */
async function resolveExistingSlug(
  provided: string,
  current: { id: string; slug: string },
): Promise<SlugResolution> {
  if (!provided || provided === current.slug) return { ok: true, slug: current.slug };
  const taken = await findBlogPostBySlug(provided);
  if (taken && taken.id !== current.id) {
    return {
      ok: false,
      error: "slug_taken",
      message: "Another post already uses that URL slug.",
    };
  }
  return { ok: true, slug: provided };
}

/** Publishing date: stamped on the first publish, stable afterwards. */
function publishedAt(status: BlogStatus, current: Date | null): Date | null {
  if (status !== "PUBLISHED") return null;
  return current ?? new Date();
}

/** Registry listing — CRM actors only (`canAccessCrm`). */
export async function listBlogPostsForActor(actor: CrmUser | null): Promise<BlogListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, posts: await listBlogPosts() };
}

/**
 * Load one post for the edit surface — CRM actors only.
 * Malformed and missing ids both return `not_found`.
 */
export async function getBlogPostForActor(
  actor: CrmUser | null,
  postId: string,
): Promise<BlogDetailResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof postId !== "string" || !cuidLike.test(postId)) {
    return { ok: false, error: "not_found" };
  }
  const post = await getBlogPost(postId);
  if (!post) return { ok: false, error: "not_found" };
  return { ok: true, post };
}

/** Create a post — `canMutateLeads` actors only. */
export async function createBlogPost(actor: CrmUser | null, input: BlogInput): Promise<BlogResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const parsed = normalise(input);
  if (!parsed.ok) return { ok: false, error: "invalid", message: parsed.message };

  const resolved = await resolveNewSlug(parsed.value.slug, parsed.value.title);
  if (!resolved.ok) return { ok: false, error: resolved.error, message: resolved.message };

  try {
    const { slug: _slug, ...fields } = parsed.value;
    const post = await createBlogPostRow({
      ...fields,
      slug: resolved.slug,
      publishedAt: publishedAt(fields.status, null),
      createdById: actor.id,
    });
    return { ok: true, post };
  } catch (error) {
    return toResult(error, "The post could not be created.");
  }
}

/** Update an existing post — `canMutateLeads` actors only. */
export async function updateBlogPost(
  actor: CrmUser | null,
  postId: string,
  input: BlogInput,
): Promise<BlogResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof postId !== "string" || !cuidLike.test(postId)) {
    return { ok: false, error: "not_found" };
  }
  const existing = await getBlogPost(postId);
  if (!existing) return { ok: false, error: "not_found" };

  const parsed = normalise(input);
  if (!parsed.ok) return { ok: false, error: "invalid", message: parsed.message };

  const resolved = await resolveExistingSlug(parsed.value.slug, existing);
  if (!resolved.ok) return { ok: false, error: resolved.error, message: resolved.message };

  try {
    const { slug: _slug, ...fields } = parsed.value;
    const post = await updateBlogPostRow(postId, {
      ...fields,
      slug: resolved.slug,
      publishedAt: publishedAt(fields.status, existing.publishedAt),
    });
    return { ok: true, post };
  } catch (error) {
    return toResult(error, "The post could not be updated.");
  }
}

/**
 * Link (or clear) the stored cover image on a post. The bytes live on disk —
 * this only decides which key the row points at, so a bad key can never be
 * written even if a caller forges one.
 */
export async function setBlogPostImage(
  actor: CrmUser | null,
  postId: string,
  imagePath: string | null,
): Promise<BlogResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof postId !== "string" || !cuidLike.test(postId)) {
    return { ok: false, error: "not_found" };
  }
  if (imagePath !== null && !BLOG_IMAGE_FILENAME_PATTERN.test(imagePath)) {
    return { ok: false, error: "invalid", message: "Unsupported image filename." };
  }
  if (!(await getBlogPost(postId))) return { ok: false, error: "not_found" };
  try {
    const post = await setBlogPostImageRow(postId, imagePath);
    return { ok: true, post };
  } catch (error) {
    return toResult(error, "The cover image could not be saved.");
  }
}

/**
 * Delete a post permanently — `canMutateLeads` actors only. The row is read
 * first so the caller gets its slug and cover key back, then removed; nothing
 * public may keep serving a URL whose row is gone.
 */
export async function deleteBlogPost(
  actor: CrmUser | null,
  postId: string,
): Promise<BlogDeleteResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof postId !== "string" || !cuidLike.test(postId)) {
    return { ok: false, error: "not_found" };
  }
  const existing = await getBlogPost(postId);
  if (!existing) return { ok: false, error: "not_found" };
  try {
    await deleteBlogPostRow(postId);
    return { ok: true, slug: existing.slug, imagePath: existing.imagePath };
  } catch (error) {
    console.error("[blog] delete failed", error);
    return { ok: false, error: "invalid", message: "The post could not be deleted." };
  }
}

// ── Public reads for /blog (Phase 25) ─────────────────────────────

/**
 * Wire-safe published post: no CRM ids, no creator identity — only what the
 * public list, detail page, sitemap and RSS feed render.
 */
export interface PublishedBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  publishedAt: Date | null;
  readingMinutes: number;
  updatedAt: Date;
  /** Cover image key — the public page builds its own URL from it. */
  imagePath: string | null;
  imageAlt: string | null;
  /** YouTube/Vimeo embed URL, or null when the post has no video. */
  videoEmbedUrl: string | null;
}

function toPublished(row: BlogPost): PublishedBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    tags: parseBlogTags(row.tags),
    publishedAt: row.publishedAt,
    readingMinutes: blogReadingMinutes(row.content),
    updatedAt: row.updatedAt,
    imagePath: row.imagePath,
    imageAlt: row.imageAlt,
    videoEmbedUrl: row.videoEmbedUrl,
  };
}

/** Every published post, newest first. Never throws — degrades to []. */
export async function listPublishedBlogPosts(): Promise<PublishedBlogPost[]> {
  try {
    const rows = await listPublishedBlogPostRows();
    return rows.map(toPublished);
  } catch (error) {
    console.error("[blog] public list read failed", error);
    return [];
  }
}

/**
 * One published post by its URL segment. Unknown, malformed and
 * not-yet-published slugs are all `null` — the route turns that into a 404.
 */
export async function getPublishedBlogPostBySlug(
  slugParam: unknown,
): Promise<PublishedBlogPost | null> {
  if (typeof slugParam !== "string" || !slugPattern.test(slugParam)) return null;
  try {
    const row = await findBlogPostBySlug(slugParam);
    if (!row || row.status !== "PUBLISHED") return null;
    return toPublished(row);
  } catch (error) {
    console.error("[blog] public detail read failed", error);
    return null;
  }
}
