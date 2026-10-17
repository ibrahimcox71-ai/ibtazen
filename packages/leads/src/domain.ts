/**
 * Lead domain types — statuses, transitions, sources.
 * Framework-free; timelines are canonical in @ibtatech/types (single source
 * of truth, shared with @ibtatech/config and the UI surfaces).
 */
import { TIMELINE_VALUES } from "@ibtatech/types";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
  "spam",
] as const;

export type LeadPipelineStatus = (typeof LEAD_STATUSES)[number];

/** Allowed status transitions (lifecycle guard for the CRM phase). */
const TRANSITIONS: Record<LeadPipelineStatus, readonly LeadPipelineStatus[]> = {
  new: ["contacted", "qualified", "spam"],
  contacted: ["qualified", "proposal", "lost"],
  qualified: ["proposal", "won", "lost"],
  proposal: ["won", "lost"],
  won: [],
  lost: ["contacted"], // re-engage nurture
  spam: [],
};

export function canTransition(from: LeadPipelineStatus, to: LeadPipelineStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const LEAD_SOURCES = [
  "contact",
  "website-audit",
  "seo-audit",
  "ads-audit",
  "estimate",
  "booking",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Timeline slugs — re-exported from @ibtatech/types (single source). */
export const TIMELINES = TIMELINE_VALUES;

export function isLeadSource(v: string): v is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(v);
}

export { isTimeline } from "@ibtatech/types";

/**
 * Identity used for duplicate protection: lowercased email + source.
 * Leads whose pipeline status has left `new` are no longer "open".
 */
export function openLeadKey(email: string, source: string): string {
  return `${email.trim().toLowerCase()}::${source}`;
}

/** Lead activity types written to the append-only LeadActivity audit trail. */
export const LEAD_ACTIVITY_TYPES = [
  "status_change",
  "assigned",
  "unassigned",
  "follow_up_created",
  "follow_up_updated",
  "follow_up_completed",
  "proposal_created",
  "proposal_updated",
  "proposal_sent",
  "proposal_accepted",
  "proposal_declined",
  "proposal_won",
  "converted_to_client",
  "contract_created",
  "contract_status_changed",
  "project_created",
  "project_status_changed",
  "invoice_created",
  "invoice_status_changed",
] as const;

export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export function isLeadActivityType(v: string): v is LeadActivityType {
  return (LEAD_ACTIVITY_TYPES as readonly string[]).includes(v);
}

// ── Proposals (Phase 7) ────────────────────────────────────────────────

export const PROPOSAL_STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const PROPOSAL_TRANSITIONS: Record<ProposalStatus, readonly ProposalStatus[]> = {
  draft: ["sent", "declined"],
  sent: ["accepted", "declined"],
  accepted: [],
  declined: [],
};

export function canProposalTransition(from: ProposalStatus, to: ProposalStatus): boolean {
  return PROPOSAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isProposalStatus(v: string): v is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(v);
}

// ── Contracts (Phase 11) ───────────────────────────────────────────────

/**
 * Internal contract lifecycle. Statuses advance only via explicit
 * server-validated transitions — never automatic activation or signing.
 */
export const CONTRACT_STATUSES = ["draft", "out_for_signature", "active", "void"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

const CONTRACT_TRANSITIONS: Record<ContractStatus, readonly ContractStatus[]> = {
  draft: ["out_for_signature", "void"],
  out_for_signature: ["active", "void"],
  active: ["void"],
  void: [],
};

export function canContractTransition(from: ContractStatus, to: ContractStatus): boolean {
  return CONTRACT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isContractStatus(v: string): v is ContractStatus {
  return (CONTRACT_STATUSES as readonly string[]).includes(v);
}

// ── Projects (Phase 12) ───────────────────────────────────────────────

/**
 * Delivery project lifecycle. Values match `PROJECT_STATUSES` in
 * @ibtatech/types (canonical shared vocabulary). Status advances only via
 * explicit server-validated transitions — never automatic or date-driven.
 */
export const PROJECT_STATUSES = [
  "planning",
  "active",
  "review",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  planning: ["active", "archived"],
  active: ["review", "paused", "archived"],
  review: ["active", "completed", "paused"],
  paused: ["active", "archived"],
  completed: ["archived"],
  archived: [],
};

export function canProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isProjectStatus(v: string): v is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(v);
}

export const PROPOSAL_CURRENCIES = ["GBP", "USD", "EUR"] as const;

// ── Invoices (Phase 14) ───────────────────────────────────────────────

/**
 * Internal invoice lifecycle. "paid" is a manual CRM mark — not a payment
 * gateway confirmation. No automatic, overdue, partial, or refunded states.
 */
export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  paid: [],
  void: [],
};

export function canInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isInvoiceStatus(v: string): v is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(v);
}

// ── Case studies (Phase 16) ───────────────────────────────────────────

/**
 * Marketing case-study lifecycle. `IN_PRODUCTION` is an editorial
 * work-in-progress state that never reaches the public site — only
 * `PUBLISHED` rows are rendered in the landing "Selected work" section.
 */
export const CASE_STUDY_STATUSES = ["IN_PRODUCTION", "PUBLISHED"] as const;

export type CaseStudyStatus = (typeof CASE_STUDY_STATUSES)[number];

export function isCaseStudyStatus(v: string): v is CaseStudyStatus {
  return (CASE_STUDY_STATUSES as readonly string[]).includes(v);
}

/** Landing "Selected work" slots — slot 1 is the featured story. */
export const CASE_STUDY_SLOTS = [1, 2, 3, 4] as const;

export type CaseStudySlot = (typeof CASE_STUDY_SLOTS)[number];

export function isCaseStudySlot(v: number): v is CaseStudySlot {
  return (CASE_STUDY_SLOTS as readonly number[]).includes(v);
}

/** One displayed result: short label plus its value ("+180%", "6 weeks"). */
export interface CaseStudyMetric {
  label: string;
  value: string;
}

export const CASE_STUDY_MAX_METRICS = 6;
export const CASE_STUDY_MAX_TITLE = 200;
export const CASE_STUDY_MAX_CLIENT_NAME = 200;
export const CASE_STUDY_MAX_DESCRIPTION = 2000;
export const CASE_STUDY_MAX_METRIC_LABEL = 60;
export const CASE_STUDY_MAX_METRIC_VALUE = 60;
/** Longest `/case-studies/[slug]` segment a case study may claim. */
export const CASE_STUDY_SLUG_MAX = 80;
export const CASE_STUDY_MAX_IMAGE_ALT = 120;
export const CASE_STUDY_MAX_SORT_ORDER = 9999;
export const CASE_STUDY_IMAGE_FILENAME_PATTERN =
  /^[a-z0-9]+-[a-f0-9]{8}\.(?:png|jpe?g|webp|avif|gif)$/i;

/**
 * Parse the persisted `metrics` JSON array. Malformed or non-array payloads
 * degrade to an empty list — the public page must never crash on old data.
 */
export function parseCaseStudyMetrics(raw: string | null | undefined): CaseStudyMetric[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const metrics: CaseStudyMetric[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const { label, value } = entry as { label?: unknown; value?: unknown };
    if (typeof label !== "string" || typeof value !== "string") continue;
    metrics.push({ label, value });
  }
  return metrics;
}

export type ProposalCurrency = (typeof PROPOSAL_CURRENCIES)[number];

export function isProposalCurrency(v: string): v is ProposalCurrency {
  return (PROPOSAL_CURRENCIES as readonly string[]).includes(v);
}

/** Single commercial line — money in integer minor units only. */
export interface ProposalLine {
  description: string;
  quantity: number;
  unitPriceMinor: number;
}

export const PROPOSAL_MAX_LINES = 50;
export const PROPOSAL_MAX_QUANTITY = 1_000_000;
/** Upper bound per line total (minor) — keeps sums inside safe integers. */
export const PROPOSAL_MAX_LINE_TOTAL_MINOR = 1_000_000_000_00;

/**
 * Parse a decimal major-unit string ("12", "12.3", "12.34") into minor units
 * using integer arithmetic only. Returns null for malformed input.
 */
export function parseMoneyToMinor(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d{1,15}(\.\d{1,2})?$/.test(value)) return null;
  const dot = value.indexOf(".");
  const wholePart = dot === -1 ? value : value.slice(0, dot);
  const fracPart = dot === -1 ? "00" : (value.slice(dot + 1) + "00").slice(0, 2);
  const whole = Number(wholePart);
  const frac = Number(fracPart);
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(frac)) return null;
  const minor = whole * 100 + frac;
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

/** Display minor units as a fixed 2-decimal major string (no currency symbol). */
export function formatMinorToMajor(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${String(frac).padStart(2, "0")}`;
}

/**
 * Validate lines and compute subtotal/total with integer math only.
 * No tax/discount in Phase 7 — total equals subtotal.
 */
export function computeProposalTotals(
  lines: readonly ProposalLine[],
): { ok: true; subtotalMinor: number; totalMinor: number } | { ok: false; error: string } {
  if (lines.length === 0) {
    return { ok: false, error: "Add at least one line item." };
  }
  if (lines.length > PROPOSAL_MAX_LINES) {
    return { ok: false, error: `A proposal can have at most ${PROPOSAL_MAX_LINES} lines.` };
  }
  let subtotal = 0;
  for (const line of lines) {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > PROPOSAL_MAX_QUANTITY
    ) {
      return { ok: false, error: "Line quantity must be a whole number between 1 and 1000000." };
    }
    if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      return { ok: false, error: "Line unit price must be a non-negative amount." };
    }
    const lineTotal = line.quantity * line.unitPriceMinor;
    if (!Number.isSafeInteger(lineTotal) || lineTotal > PROPOSAL_MAX_LINE_TOTAL_MINOR) {
      return { ok: false, error: "Line total is too large." };
    }
    subtotal += lineTotal;
    if (!Number.isSafeInteger(subtotal)) {
      return { ok: false, error: "Proposal total exceeds the maximum allowed amount." };
    }
  }
  return { ok: true, subtotalMinor: subtotal, totalMinor: subtotal };
}

export function isValidDateString(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Follow-up completion state derived from `completedAt`. */
export type FollowUpState = "open" | "completed" | "overdue";

export function followUpState(
  dueDate: string,
  completedAt: Date | null,
  now: Date = new Date(),
): FollowUpState {
  if (completedAt) return "completed";
  // dueDate is YYYY-MM-DD; treat end of local day as the deadline.
  const due = new Date(`${dueDate}T23:59:59`);
  return due.getTime() < now.getTime() ? "overdue" : "open";
}

// ── Blog (Phase 25) ────────────────────────────────────────────────

/**
 * Blog lifecycle — only `PUBLISHED` rows are ever read by the public site
 * (`/blog`, `/blog/[slug]`, the sitemap and the RSS feed).
 */
export const BLOG_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type BlogStatus = (typeof BLOG_STATUSES)[number];

export function isBlogStatus(v: string): v is BlogStatus {
  return (BLOG_STATUSES as readonly string[]).includes(v);
}

export const BLOG_MAX_TITLE = 120;
/** Card + meta-description copy — short enough for a search result snippet. */
export const BLOG_MAX_EXCERPT = 300;
/** Longest article body — payload-limit defence before anything renders. */
export const BLOG_MAX_CONTENT = 40000;
/** Longest `/blog/[slug]` segment a post may claim. */
export const BLOG_SLUG_MAX = 80;
export const BLOG_MAX_TAGS = 5;
export const BLOG_MAX_TAG = 30;
/** Words per minute used for the reading-time estimate on cards. */
export const BLOG_WORDS_PER_MINUTE = 200;

/**
 * Parse the persisted `tags` JSON array. Malformed or non-array payloads
 * degrade to an empty list — the public page must never crash on old data.
 */
export function parseBlogTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const tags: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed) tags.push(trimmed);
  }
  return tags;
}

/** Reading-time estimate in whole minutes, never below 1. */
export function blogReadingMinutes(content: string): number {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / BLOG_WORDS_PER_MINUTE));
}

// ── Blog media (Phase 26) ─────────────────────────────────────────

/** Screen-reader description for the cover image — blank falls back to the title. */
export const BLOG_MAX_IMAGE_ALT = 120;
/** Generated cover filename: `<postId>-<8 hex>.<ext>` — the only key ever served. */
export const BLOG_IMAGE_FILENAME_PATTERN = /^[a-z0-9]+-[a-f0-9]{8}\.(?:png|jpe?g|webp|avif|gif)$/i;
/** Longest YouTube/Vimeo link accepted as an article embed. */
export const BLOG_MAX_VIDEO_EMBED_URL = 300;

/**
 * Only these hosts may back `videoEmbedUrl` — an iframe src is attacker
 * territory, so the scheme (https) and the host are both checked and nothing
 * else ever reaches the page.
 */
export const BLOG_VIDEO_EMBED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
] as const;

/** True when an already-parsed URL points at a host we are willing to embed. */
export function isAllowedBlogVideoEmbedHost(url: URL): boolean {
  return (BLOG_VIDEO_EMBED_HOSTS as readonly string[]).includes(url.hostname.toLowerCase());
}

/** YouTube path segments that carry a video id (`/shorts/<id>`, `/live/<id>`, …). */
const YOUTUBE_EMBED_PATHS = new Set(["shorts", "live", "embed", "v", "e"]);

/** Video ids are base64url tokens — nothing else is ever pasted into a URL we build. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** `90` / `90s` / `1m30s` / `1h2m3s` → seconds; null for anything else. */
function startSeconds(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) return null;
  return Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
}

/** Keep only the query a player understands: playlist, index, start time. */
function youtubeParams(url: URL): string {
  const params = new URLSearchParams();
  const list = url.searchParams.get("list");
  if (list) params.set("list", list);
  const index = url.searchParams.get("index");
  if (index) params.set("index", index);
  const start = startSeconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
  if (start) params.set("start", String(start));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Rewrite a share link into the URL that actually plays inside an `<iframe>`.
 * YouTube refuses to frame `/watch`, `/shorts` and `/live` (blank frame — the
 * bug a Shorts link hits), and Vimeo only plays from `player.vimeo.com/video/<id>`.
 * Shapes we do not recognise on an allowed host pass through unchanged, so the
 * https + host rule stays the only rejector.
 */
export function normaliseBlogVideoEmbedUrl(url: URL): string {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = parts[0];
    if (id && YOUTUBE_ID.test(id)) {
      return `https://www.youtube.com/embed/${id}${youtubeParams(url)}`;
    }
    return url.toString();
  }

  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    const id =
      parts[0] === "watch"
        ? url.searchParams.get("v")
        : YOUTUBE_EMBED_PATHS.has(parts[0] ?? "")
          ? (parts[1] ?? null)
          : null;
    if (id && YOUTUBE_ID.test(id))
      return `https://www.youtube.com/embed/${id}${youtubeParams(url)}`;
    return url.toString();
  }

  if (host === "vimeo.com" || host === "www.vimeo.com") {
    const id = parts[parts.length - 1];
    // `?h=` is the private-video hash — the player needs it back.
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}${url.search}`;
    return url.toString();
  }

  if (host === "player.vimeo.com") {
    const id = parts[parts.length - 1];
    if (parts[0] === "video" && id && /^\d+$/.test(id)) {
      return `https://player.vimeo.com/video/${id}${url.search}`;
    }
    return url.toString();
  }

  return url.toString();
}

/**
 * Re-check a stored embed URL where it is about to become an `<iframe src>`.
 * The service validates on write, but rows can outlive the rules that created
 * them — so nothing reaches the page without passing this again, and legacy
 * rows holding a watch/shorts link are rewritten to their embed form here.
 */
export function blogVideoEmbedSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!isAllowedBlogVideoEmbedHost(url)) return null;
  return normaliseBlogVideoEmbedUrl(url);
}

/**
 * Validate a video link from a form field: an https YouTube/Vimeo share URL,
 * stored in its canonical embed form, or blank/null for "no video". Shared by
 * the blog and case-study services so both surfaces accept exactly the same
 * links — and because the result is rendered into an `<iframe src>`, a
 * `javascript:` URL or an arbitrary host never reaches the page.
 */
export function parseVideoEmbedUrl(value: unknown, errors: string[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors.push("Video link must be text.");
    return null;
  }
  const raw = value.trim();
  if (!raw) return null;
  if (raw.length > BLOG_MAX_VIDEO_EMBED_URL) {
    errors.push(`Video link must be ${BLOG_MAX_VIDEO_EMBED_URL} characters or fewer.`);
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    errors.push("Video link must be a full YouTube or Vimeo URL.");
    return null;
  }
  if (parsed.protocol !== "https:") {
    errors.push("Video link must use https.");
    return null;
  }
  if (!isAllowedBlogVideoEmbedHost(parsed)) {
    errors.push("Video link must point at YouTube or Vimeo.");
    return null;
  }
  return normaliseBlogVideoEmbedUrl(parsed);
}

// ── Site brand assets (Phase 28) ──────────────────────────────────

/** Uploadable brand slots on the admin Settings page. */
export const SITE_ASSET_SLOTS = ["logo", "favicon"] as const;

export type SiteAssetSlot = (typeof SITE_ASSET_SLOTS)[number];

export function isSiteAssetSlot(value: string): value is SiteAssetSlot {
  return (SITE_ASSET_SLOTS as readonly string[]).includes(value);
}

/**
 * Generated brand filename: `<slot>-<8 hex>.<ext>` — the only key the settings
 * row may hold and the only key `/api/uploads/brand/` will ever serve. The slot
 * prefix is part of the pattern so a logo key can never be read as a favicon.
 */
export const SITE_ASSET_FILENAME_PATTERN =
  /^(?:logo|favicon)-[a-f0-9]{8}\.(?:png|jpe?g|webp|avif|gif)$/i;
