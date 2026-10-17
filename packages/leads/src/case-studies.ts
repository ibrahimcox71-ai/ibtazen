import type { CaseStudy, CaseStudyWithCreator } from "./repository";
import {
  CaseStudySlotTakenError,
  CaseStudySlugTakenError,
  createCaseStudyRow,
  deleteCaseStudyRow,
  findCaseStudyBySlot,
  findCaseStudyBySlug,
  getCaseStudy,
  listCaseStudies,
  listPublishedCaseStudyRows,
  setCaseStudyImageRow,
  updateCaseStudyRow,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";
import {
  CASE_STUDY_IMAGE_FILENAME_PATTERN,
  CASE_STUDY_MAX_CLIENT_NAME,
  CASE_STUDY_MAX_DESCRIPTION,
  CASE_STUDY_MAX_IMAGE_ALT,
  CASE_STUDY_MAX_METRIC_LABEL,
  CASE_STUDY_MAX_METRICS,
  CASE_STUDY_MAX_METRIC_VALUE,
  CASE_STUDY_MAX_SORT_ORDER,
  CASE_STUDY_MAX_TITLE,
  CASE_STUDY_SLUG_MAX,
  isCaseStudySlot,
  isCaseStudyStatus,
  parseCaseStudyMetrics,
  parseVideoEmbedUrl,
  type CaseStudyMetric,
  type CaseStudyStatus,
} from "./domain";

/**
 * Case study service — marketing stories behind the public "Selected work"
 * section (Phase 16) and the public detail pages at `/case-studies/[slug]`
 * (Phase 20). One row per landing slot (`slotNumber` unique) with its own
 * URL segment (`slug` unique, stable across title edits); only `PUBLISHED`
 * rows are ever readable without an actor. Text, slot, slug, status and
 * metrics are validated here — the browser never writes a row directly.
 * Phase 27 adds the story video: a YouTube/Vimeo share link validated against
 * the shared https + host allow-list and stored as its canonical embed URL.
 */

const cuidLike = /^[c][a-z0-9]{20,}$/i;

/** Shape of a URL segment a case study may claim. */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CaseStudyErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid"
  | "slot_taken"
  | "slug_taken"
  /** The row committed, but a follow-up step (the image) did not — the caller must not report it as unsaved. */
  | "partial";

export type CaseStudyResult =
  | { ok: true; caseStudy: CaseStudyWithCreator }
  | { ok: false; error: CaseStudyErrorCode; message?: string };

/** What the caller needs after a row is gone: its URL and the image it owned. */
export type CaseStudyDeleteResult =
  | { ok: true; slug: string; imagePath: string | null }
  | { ok: false; error: CaseStudyErrorCode; message?: string };

export type CaseStudyListResult =
  { ok: true; caseStudies: CaseStudyWithCreator[] } | { ok: false; error: "unauthorized" };

export type CaseStudyDetailErrorCode = "unauthorized" | "not_found";

export type CaseStudyDetailResult =
  { ok: true; caseStudy: CaseStudyWithCreator } | { ok: false; error: CaseStudyDetailErrorCode };

export type CaseStudyInput = {
  title: unknown;
  clientName: unknown;
  /** URL segment — blank means "derive from the title" / "keep the current one". */
  slug?: unknown;
  slotNumber: unknown;
  description: unknown;
  status: unknown;
  metrics: unknown;
  imageAlt?: unknown;
  /** YouTube/Vimeo share link — blank means "no video". */
  videoEmbedUrl?: unknown;
  sortOrder?: unknown;
};

interface NormalisedCaseStudy {
  title: string;
  clientName: string;
  slug: string;
  slotNumber: number;
  description: string;
  metrics: string;
  status: CaseStudyStatus;
  imageAlt: string | null;
  videoEmbedUrl: string | null;
  sortOrder: number;
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

function slot(value: unknown, errors: string[]): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || !isCaseStudySlot(parsed)) {
    errors.push("Slot must be one of the landing slots (1–4).");
    return 1;
  }
  return parsed;
}

/** URL segment for a title — ASCII, lowercase, hyphen-separated. */
export function slugifyCaseStudyTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CASE_STUDY_SLUG_MAX)
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
  if (trimmed.length > CASE_STUDY_SLUG_MAX || !slugPattern.test(trimmed)) {
    errors.push("Slug may use lowercase letters, numbers and hyphens (max 80 characters).");
    return "";
  }
  return trimmed;
}

function status(value: unknown, errors: string[]): CaseStudyStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "IN_PRODUCTION";
  if (!isCaseStudyStatus(raw)) {
    errors.push("Status must be In production or Published.");
    return "IN_PRODUCTION";
  }
  return raw;
}

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

function sortOrder(value: unknown, errors: string[]): number {
  const raw = typeof value === "number" ? String(value) : String(value ?? "").trim();
  if (raw === "") return 0;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > CASE_STUDY_MAX_SORT_ORDER) {
    errors.push(`Sort order must be a whole number between 0 and ${CASE_STUDY_MAX_SORT_ORDER}.`);
    return 0;
  }
  return parsed;
}

function metrics(value: unknown, errors: string[]): string {
  if (value === undefined || value === null || value === "") return "[]";
  if (!Array.isArray(value)) {
    errors.push("Metrics must be a list of label/value pairs.");
    return "[]";
  }
  const rows = value.filter((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    const { label, value: metricValue } = row as { label?: unknown; value?: unknown };
    const hasLabel = typeof label === "string" && Boolean(label.trim());
    const hasValue = typeof metricValue === "string" && Boolean(metricValue.trim());
    return hasLabel || hasValue;
  });
  if (rows.length > CASE_STUDY_MAX_METRICS) {
    errors.push(`A case study can show at most ${CASE_STUDY_MAX_METRICS} metrics.`);
  }
  const clean: Array<{ label: string; value: string }> = [];
  for (const row of rows.slice(0, CASE_STUDY_MAX_METRICS)) {
    const { label, value: metricValue } = row as { label?: unknown; value?: unknown };
    if (
      typeof label !== "string" ||
      !label.trim() ||
      typeof metricValue !== "string" ||
      !metricValue.trim()
    ) {
      errors.push("Each metric needs both a label and a value.");
      continue;
    }
    if (
      label.trim().length > CASE_STUDY_MAX_METRIC_LABEL ||
      metricValue.trim().length > CASE_STUDY_MAX_METRIC_VALUE
    ) {
      errors.push(
        `Metric labels are limited to ${CASE_STUDY_MAX_METRIC_LABEL} characters and values to ${CASE_STUDY_MAX_METRIC_VALUE}.`,
      );
      continue;
    }
    clean.push({ label: label.trim(), value: metricValue.trim() });
  }
  return JSON.stringify(clean);
}

/** Validate raw form fields into a row payload — first error wins the message. */
function normalise(
  input: CaseStudyInput,
): { ok: true; value: NormalisedCaseStudy } | { ok: false; message: string } {
  const errors: string[] = [];
  const value: NormalisedCaseStudy = {
    title: text(input.title, "Title", CASE_STUDY_MAX_TITLE, errors),
    clientName: text(input.clientName, "Client name", CASE_STUDY_MAX_CLIENT_NAME, errors),
    slug: slug(input.slug, errors),
    slotNumber: slot(input.slotNumber, errors),
    description: text(input.description, "Description", CASE_STUDY_MAX_DESCRIPTION, errors),
    status: status(input.status, errors),
    metrics: metrics(input.metrics, errors),
    imageAlt: optionalText(input.imageAlt, "Image alt text", CASE_STUDY_MAX_IMAGE_ALT, errors),
    videoEmbedUrl: parseVideoEmbedUrl(input.videoEmbedUrl, errors),
    sortOrder: sortOrder(input.sortOrder, errors),
  };
  if (errors.length > 0) return { ok: false, message: errors[0] ?? "Invalid case study." };
  return { ok: true, value };
}

function toResult(error: unknown, fallback: string): CaseStudyResult {
  if (error instanceof CaseStudySlugTakenError) {
    return {
      ok: false,
      error: "slug_taken",
      message: "Another case study already uses that URL slug.",
    };
  }
  if (error instanceof CaseStudySlotTakenError) {
    return {
      ok: false,
      error: "slot_taken",
      message: "Another case study already uses that slot.",
    };
  }
  console.error("[case-studies] write failed", error);
  return { ok: false, error: "invalid", message: fallback };
}

type SlugResolution =
  { ok: true; slug: string } | { ok: false; error: "slug_taken" | "invalid"; message: string };

/**
 * Resolve the slug for a new row: an explicit one is checked for collisions,
 * a blank one is derived from the title and given a numeric suffix when the
 * title is already taken. The unique constraint is still the final guard.
 */
async function resolveNewSlug(provided: string, title: string): Promise<SlugResolution> {
  if (provided) {
    if (await findCaseStudyBySlug(provided)) {
      return {
        ok: false,
        error: "slug_taken",
        message: "Another case study already uses that URL slug.",
      };
    }
    return { ok: true, slug: provided };
  }

  const base = slugifyCaseStudyTitle(title);
  if (!base) {
    return { ok: false, error: "invalid", message: "Add a title that can form a URL slug." };
  }
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const candidate = `${base.slice(0, CASE_STUDY_SLUG_MAX - suffix.length)}${suffix}`;
    if (!(await findCaseStudyBySlug(candidate))) return { ok: true, slug: candidate };
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
  const taken = await findCaseStudyBySlug(provided);
  if (taken && taken.id !== current.id) {
    return {
      ok: false,
      error: "slug_taken",
      message: "Another case study already uses that URL slug.",
    };
  }
  return { ok: true, slug: provided };
}

/** Registry listing — CRM actors only (`canAccessCrm`). */
export async function listCaseStudiesForActor(actor: CrmUser | null): Promise<CaseStudyListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, caseStudies: await listCaseStudies() };
}

/**
 * Load one case study for the edit surface — CRM actors only.
 * Malformed and missing ids both return `not_found`.
 */
export async function getCaseStudyForActor(
  actor: CrmUser | null,
  caseStudyId: string,
): Promise<CaseStudyDetailResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof caseStudyId !== "string" || !cuidLike.test(caseStudyId)) {
    return { ok: false, error: "not_found" };
  }
  const caseStudy = await getCaseStudy(caseStudyId);
  if (!caseStudy) return { ok: false, error: "not_found" };
  return { ok: true, caseStudy };
}

/** Create a case study for a landing slot — `canMutateLeads` actors only. */
export async function createCaseStudy(
  actor: CrmUser | null,
  input: CaseStudyInput,
): Promise<CaseStudyResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const parsed = normalise(input);
  if (!parsed.ok) return { ok: false, error: "invalid", message: parsed.message };

  const resolved = await resolveNewSlug(parsed.value.slug, parsed.value.title);
  if (!resolved.ok) return { ok: false, error: resolved.error, message: resolved.message };

  try {
    const { slug: _slug, ...fields } = parsed.value;
    const caseStudy = await createCaseStudyRow({
      ...fields,
      slug: resolved.slug,
      createdById: actor.id,
    });
    return { ok: true, caseStudy };
  } catch (error) {
    return toResult(error, "Case study could not be created.");
  }
}

/** Update an existing case study — `canMutateLeads` actors only. */
export async function updateCaseStudy(
  actor: CrmUser | null,
  caseStudyId: string,
  input: CaseStudyInput,
): Promise<CaseStudyResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof caseStudyId !== "string" || !cuidLike.test(caseStudyId)) {
    return { ok: false, error: "not_found" };
  }
  const existing = await getCaseStudy(caseStudyId);
  if (!existing) return { ok: false, error: "not_found" };

  const parsed = normalise(input);
  if (!parsed.ok) return { ok: false, error: "invalid", message: parsed.message };

  const resolved = await resolveExistingSlug(parsed.value.slug, existing);
  if (!resolved.ok) return { ok: false, error: resolved.error, message: resolved.message };

  try {
    const { slug: _slug, ...fields } = parsed.value;
    const caseStudy = await updateCaseStudyRow(caseStudyId, {
      ...fields,
      slug: resolved.slug,
    });
    return { ok: true, caseStudy };
  } catch (error) {
    return toResult(error, "Case study could not be updated.");
  }
}

/**
 * Delete a case study permanently — `canMutateLeads` actors only. The row is
 * read first so the caller gets its slug and image key back, then removed;
 * nothing public may keep serving a URL whose row is gone, and the freed
 * landing slot becomes claimable again.
 */
export async function deleteCaseStudy(
  actor: CrmUser | null,
  caseStudyId: string,
): Promise<CaseStudyDeleteResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof caseStudyId !== "string" || !cuidLike.test(caseStudyId)) {
    return { ok: false, error: "not_found" };
  }
  const existing = await getCaseStudy(caseStudyId);
  if (!existing) return { ok: false, error: "not_found" };
  try {
    await deleteCaseStudyRow(caseStudyId);
    return { ok: true, slug: existing.slug, imagePath: existing.imagePath };
  } catch (error) {
    console.error("[case-studies] delete failed", error);
    return { ok: false, error: "invalid", message: "The case study could not be deleted." };
  }
}

export async function setCaseStudyImage(
  actor: CrmUser | null,
  caseStudyId: string,
  imagePath: string | null,
): Promise<CaseStudyResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof caseStudyId !== "string" || !cuidLike.test(caseStudyId)) {
    return { ok: false, error: "not_found" };
  }
  if (imagePath !== null && !CASE_STUDY_IMAGE_FILENAME_PATTERN.test(imagePath)) {
    return { ok: false, error: "invalid", message: "Unsupported image filename." };
  }
  if (!(await getCaseStudy(caseStudyId))) return { ok: false, error: "not_found" };
  try {
    const caseStudy = await setCaseStudyImageRow(caseStudyId, imagePath);
    return { ok: true, caseStudy };
  } catch (error) {
    return toResult(error, "Case study image could not be saved.");
  }
}

/**
 * Public read for the landing page: the `PUBLISHED` study occupying one
 * slot, or null. Never throws — a missing row, an in-production draft, or a
 * database failure all degrade to the placeholder, because the marketing
 * page must still render.
 */
export async function getPublishedCaseStudyForSlot(
  slotNumber: number,
): Promise<CaseStudyWithCreator | null> {
  if (!isCaseStudySlot(slotNumber)) return null;
  try {
    const found = await findCaseStudyBySlot(slotNumber);
    if (!found || found.status !== "PUBLISHED") return null;
    return getCaseStudy(found.id);
  } catch (error) {
    console.error("[case-studies] public slot read failed", error);
    return null;
  }
}

// ── Public reads for /case-studies (Phase 20) ───────────────────────────

/**
 * Wire-safe published story: no creator identity, no CRM ids, no pipeline
 * data — only what the public list and detail pages render.
 */
export interface PublishedCaseStudy {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  description: string;
  metrics: CaseStudyMetric[];
  slotNumber: number;
  status: CaseStudyStatus;
  imagePath: string | null;
  imageAlt: string | null;
  /** Canonical embed URL for the story video; null when there is none. */
  videoEmbedUrl: string | null;
  updatedAt: Date;
}

function toPublished(row: CaseStudy): PublishedCaseStudy {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    clientName: row.clientName,
    description: row.description,
    metrics: parseCaseStudyMetrics(row.metrics),
    slotNumber: row.slotNumber,
    status: row.status as CaseStudyStatus,
    imagePath: row.imagePath,
    imageAlt: row.imageAlt,
    videoEmbedUrl: row.videoEmbedUrl,
    updatedAt: row.updatedAt,
  };
}

/** Every published story in landing order. Never throws — degrades to []. */
export async function listPublishedCaseStudies(): Promise<PublishedCaseStudy[]> {
  try {
    const rows = await listPublishedCaseStudyRows();
    return rows.map(toPublished);
  } catch (error) {
    console.error("[case-studies] public list read failed", error);
    return [];
  }
}

/**
 * One published story by its URL segment. Unknown, malformed and
 * not-yet-published slugs are all `null` — the route turns that into a 404.
 */
export async function getPublishedCaseStudyBySlug(
  slugParam: unknown,
): Promise<PublishedCaseStudy | null> {
  if (typeof slugParam !== "string" || !slugPattern.test(slugParam)) return null;
  try {
    const row = await findCaseStudyBySlug(slugParam);
    if (!row || row.status !== "PUBLISHED") return null;
    return toPublished(row);
  } catch (error) {
    console.error("[case-studies] public detail read failed", error);
    return null;
  }
}
