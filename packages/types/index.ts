/**
 * @ibtatech/types — shared contracts for web, admin, client portal and mobile.
 * Pure TypeScript: no runtime imports, safe for every environment.
 */

/** Preliminary budget bands offered by contact, audit and estimator flows. */
export type BudgetBand = "under-5k" | "5k-15k" | "15k-50k" | "50k-100k" | "100k-plus" | "not-sure";

export const BUDGET_BAND_VALUES = [
  "under-5k",
  "5k-15k",
  "15k-50k",
  "50k-100k",
  "100k-plus",
  "not-sure",
] as const satisfies ReadonlyArray<BudgetBand>;

export function isBudgetBand(value: string): value is BudgetBand {
  return (BUDGET_BAND_VALUES as readonly string[]).includes(value);
}

/** Preferred-start timeline slugs shared by every lead flow. */
export const TIMELINE_VALUES = [
  "asap",
  "1-3-months",
  "3-6-months",
  "exploring",
  "flexible",
] as const;
export type Timeline = (typeof TIMELINE_VALUES)[number];

export function isTimeline(value: string): value is Timeline {
  return (TIMELINE_VALUES as readonly string[]).includes(value);
}

/** The four agency pillars — mirrors the public sitemap. */
export const SERVICE_SLUGS = [
  "web-development",
  "mobile-app-development",
  "email-marketing",
  "paid-advertising",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

export function isServiceSlug(value: string): value is ServiceSlug {
  return (SERVICE_SLUGS as readonly string[]).includes(value);
}

/**
 * CRM pipeline states — must match `@ibtatech/leads/domain.LEAD_STATUSES`
 * (single source of truth for the CRM lifecycle).
 */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
  "spam",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Delivery pipeline states — must match `@ibtatech/leads/domain.PROJECT_STATUSES`. */
export const PROJECT_STATUSES = [
  "planning",
  "active",
  "review",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Auth surface roles. `staff` = CRM operator (Phase 5), `team` covers
 * Sales/Developer/Marketing/AM in future, `client` is the portal role.
 */
export type Role = "admin" | "staff" | "team" | "client";

/** Public API error shape — every API surface must return this. */
export interface ApiError {
  code: string;
  message: string;
  field?: string;
}
