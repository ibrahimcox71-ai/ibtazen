import type { BudgetBand } from "@ibtatech/types";

/**
 * ESTIMATOR CONFIG — typed, config-driven multi-step estimator. No prices are
 * invented: the "indicative range" is a coarse label, and the final step is a
 * qualification flow ending in a tailored proposal, never a computed quote.
 */

export type EstimatorServiceKey =
  "website" | "web-app" | "mobile-app" | "email-marketing" | "paid-advertising" | "multiple";

export interface EstimatorOption {
  value: string;
  label: string;
  hint?: string;
}

export interface EstimatorStep {
  id: string;
  title: string;
  description: string;
  /** Which services make a step relevant (empty = always shown). */
  showFor?: EstimatorServiceKey[];
}

export const ESTIMATOR_SERVICES: ReadonlyArray<{
  value: EstimatorServiceKey;
  label: string;
  hint: string;
}> = [
  { value: "website", label: "Website", hint: "Marketing site, CMS, landing pages" },
  { value: "web-app", label: "Web application", hint: "SaaS, portals, dashboards" },
  { value: "mobile-app", label: "Mobile app", hint: "Android, iOS or both" },
  { value: "email-marketing", label: "Email marketing", hint: "Lifecycle, automation, campaigns" },
  { value: "paid-advertising", label: "Paid advertising", hint: "Google, Meta, LinkedIn" },
  { value: "multiple", label: "Multiple services", hint: "We'll scope it together" },
];

export const ESTIMATOR_FEATURES: ReadonlyArray<EstimatorOption> = [
  { value: "auth", label: "Accounts & login" },
  { value: "payments", label: "Payments / checkout" },
  { value: "integrations", label: "Third-party integrations" },
  { value: "cms", label: "Content management" },
  { value: "analytics", label: "Analytics & reporting" },
  { value: "dashboards", label: "Custom dashboards" },
];

export const ESTIMATOR_SCALES: ReadonlyArray<EstimatorOption> = [
  { value: "small", label: "Small", hint: "A few core screens" },
  { value: "medium", label: "Medium", hint: "A full product area" },
  { value: "large", label: "Large", hint: "Multi-role platform" },
];

export const ESTIMATOR_STEPS: readonly EstimatorStep[] = [
  {
    id: "services",
    title: "What do you need?",
    description: "Pick the closest fit — you can refine it with us later.",
  },
  {
    id: "scope",
    title: "Project scope",
    description: "A few details shape the indicative range.",
  },
  {
    id: "budget",
    title: "Budget range",
    description: "Indicative — helps us propose the right engagement.",
  },
  {
    id: "timeline",
    title: "Timeline",
    description: "When would you like to start?",
  },
  {
    id: "contact",
    title: "Contact details",
    description: "Where should the proposal go?",
  },
  {
    id: "review",
    title: "Review & submit",
    description: "Check everything, then send it over.",
  },
];

export const ESTIMATOR_TIMELINES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3-months", label: "1–3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "exploring", label: "Just exploring" },
  { value: "flexible", label: "Flexible" },
];

export const ESTIMATOR_BUDGETS: ReadonlyArray<{ value: BudgetBand; label: string }> = [
  { value: "under-5k", label: "Under £5k" },
  { value: "5k-15k", label: "£5k – £15k" },
  { value: "15k-50k", label: "£15k – £50k" },
  { value: "50k-100k", label: "£50k – £100k" },
  { value: "100k-plus", label: "£100k+" },
  { value: "not-sure", label: "Not sure yet" },
];

/**
 * Indicative engagement shape per service — deliberately coarse labels,
 * NOT prices. Every value is framed as "typically shaped like", never "costs".
 */
export const ESTIMATOR_ENGAGEMENT: Record<EstimatorServiceKey, string> = {
  website: "Typically a fixed-scope build of 4–10 weeks",
  "web-app": "Typically a phased build starting with an MVP milestone",
  "mobile-app": "Typically a phased build — one platform first, then the second",
  "email-marketing": "Typically a monthly retainer with a setup sprint",
  "paid-advertising": "Typically a monthly retainer with ad spend separate",
  multiple: "Typically a blended engagement — scoped in a discovery call",
};
