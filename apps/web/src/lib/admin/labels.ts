import { AUDIT_KINDS, AD_PLATFORMS, AD_SPEND_BANDS } from "@ibtatech/leads/audit";
import {
  INVOICE_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PROJECT_STATUSES,
  TIMELINES,
} from "@ibtatech/leads/domain";
import { BUDGET_BAND_VALUES, SERVICE_SLUGS, isBudgetBand } from "@ibtatech/types";

/**
 * Human-readable CRM labels. Canonical values stay in the database;
 * only presentation uses these maps.
 */

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

export const STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  new: "info",
  contacted: "accent",
  qualified: "success",
  proposal: "warning",
  won: "success",
  lost: "neutral",
  spam: "danger",
};

export const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact form",
  "website-audit": "Website audit",
  "seo-audit": "SEO audit",
  "ads-audit": "Ads audit",
  estimate: "Estimate",
  booking: "Booking",
};

export const TIMELINE_LABELS: Record<string, string> = {
  asap: "ASAP",
  "1-3-months": "1–3 months",
  "3-6-months": "3–6 months",
  exploring: "Exploring",
  flexible: "Flexible",
};

export const BUDGET_LABELS: Record<string, string> = {
  "under-5k": "Under 5k",
  "5k-15k": "5k – 15k",
  "15k-50k": "15k – 50k",
  "50k-100k": "50k – 100k",
  "100k-plus": "100k+",
  "not-sure": "Not sure",
};

export const AUDIT_KIND_LABELS: Record<string, string> = {
  website: "Website",
  seo: "SEO",
  ads: "Ads",
};

export const AD_PLATFORM_LABELS: Record<string, string> = {
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  "linkedin-ads": "LinkedIn Ads",
  other: "Other",
};

export const AD_SPEND_LABELS: Record<string, string> = {
  "under-2k": "Under 2k/mo",
  "2k-10k": "2k – 10k/mo",
  "10k-50k": "10k – 50k/mo",
  "50k-plus": "50k+/mo",
  "not-sure": "Not sure",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  status_change: "Status change",
  assigned: "Assigned",
  unassigned: "Unassigned",
  follow_up_created: "Follow-up created",
  follow_up_updated: "Follow-up updated",
  follow_up_completed: "Follow-up completed",
  proposal_created: "Proposal created",
  proposal_updated: "Proposal updated",
  proposal_sent: "Proposal sent",
  proposal_accepted: "Proposal accepted",
  proposal_declined: "Proposal declined",
  proposal_won: "Accept & Win",
  converted_to_client: "Converted to client",
  contract_created: "Contract created",
  contract_status_changed: "Contract status changed",
  project_created: "Project created",
  project_status_changed: "Project status changed",
  invoice_created: "Invoice created",
  invoice_status_changed: "Invoice status changed",
};

export const ACTIVITY_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  status_change: "info",
  assigned: "accent",
  unassigned: "warning",
  follow_up_created: "info",
  follow_up_updated: "neutral",
  follow_up_completed: "success",
  proposal_created: "info",
  proposal_updated: "neutral",
  proposal_sent: "accent",
  proposal_accepted: "success",
  proposal_declined: "danger",
  proposal_won: "success",
  converted_to_client: "success",
  contract_created: "success",
  contract_status_changed: "info",
  project_created: "success",
  project_status_changed: "info",
  invoice_created: "success",
  invoice_status_changed: "info",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  out_for_signature: "Out for signature",
  active: "Active",
  void: "Void",
};

export const CONTRACT_STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  draft: "neutral",
  out_for_signature: "accent",
  active: "success",
  void: "danger",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  review: "Review",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  planning: "neutral",
  active: "success",
  review: "info",
  paused: "warning",
  completed: "accent",
  archived: "neutral",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

export const PROPOSAL_STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  draft: "neutral",
  sent: "accent",
  accepted: "success",
  declined: "danger",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

export const INVOICE_STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  draft: "neutral",
  sent: "accent",
  paid: "success",
  void: "danger",
};

export const CASE_STUDY_STATUS_LABELS: Record<string, string> = {
  IN_PRODUCTION: "In production",
  PUBLISHED: "Published",
};

export const CASE_STUDY_STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  IN_PRODUCTION: "warning",
  PUBLISHED: "success",
};

export const BLOG_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

export const BLOG_STATUS_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
};

/** Valid next invoice statuses for UI affordances (server remains authoritative). */
export function canInvoiceStatusNext(current: string): string[] {
  const map: Record<string, string[]> = {
    draft: ["sent", "void"],
    sent: ["paid", "void"],
    paid: [],
    void: [],
  };
  return map[current] ?? [];
}

/** Button labels for invoice transitions — "paid" is explicitly a manual mark. */
export function invoiceActionLabel(to: string): string {
  if (to === "paid") return "Mark Paid (manual)";
  if (to === "sent") return "Send";
  if (to === "void") return "Void";
  return INVOICE_STATUS_LABELS[to] ?? to;
}

export { INVOICE_STATUSES };

export function formatMoneyMinor(minor: number, currency: string): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${String(frac).padStart(2, "0")} ${currency}`;
}

export const FOLLOW_UP_TONES: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  open: "info",
  overdue: "danger",
  completed: "success",
};

export const SERVICE_SLUG_LABELS: Record<string, string> = {
  "web-development": "Web development",
  "mobile-app-development": "Mobile app",
  "email-marketing": "Email marketing",
  "paid-advertising": "Paid ads",
  website: "Website",
  "web-app": "Web app",
  "mobile-app": "Mobile app",
  "email-marketing-flow": "Email marketing",
  "paid-advertising-flow": "Paid advertising",
  multiple: "Multiple services",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function timelineLabel(timeline: string | null): string | null {
  if (!timeline) return null;
  return TIMELINE_LABELS[timeline] ?? timeline;
}

export function budgetLabel(band: string | null): string | null {
  if (!band) return null;
  return BUDGET_LABELS[band] ?? band;
}

export function serviceLabel(service: string | null): string | null {
  if (!service) return null;
  return SERVICE_SLUG_LABELS[service] ?? service;
}

export function statusOptions(
  includeAll = false,
  current?: string,
): { value: string; label: string }[] {
  const options = LEAD_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }));
  const filtered =
    current && options.some((o) => o.value === current)
      ? options.filter((o) => o.value !== current)
      : options;
  return includeAll ? [{ value: "", label: "All statuses" }, ...filtered] : filtered;
}

export function sourceOptions(includeAll = false): { value: string; label: string }[] {
  const options = LEAD_SOURCES.map((s) => ({ value: s, label: sourceLabel(s) }));
  return includeAll ? [{ value: "", label: "All sources" }, ...options] : options;
}

export function timelineOptions(includeAll = false): { value: string; label: string }[] {
  const options = TIMELINES.map((t) => ({ value: t, label: timelineLabel(t) ?? t }));
  return includeAll ? [{ value: "", label: "Any timeline" }, ...options] : options;
}

export function budgetOptions(includeAll = false): { value: string; label: string }[] {
  const options = BUDGET_BAND_VALUES.map((b) => ({ value: b, label: budgetLabel(b) ?? b }));
  return includeAll ? [{ value: "", label: "Any budget" }, ...options] : options;
}
export function serviceOptions(includeAll = false): { value: string; label: string }[] {
  const options = SERVICE_SLUGS.map((s) => ({ value: s, label: serviceLabel(s) ?? s }));
  return includeAll ? [{ value: "", label: "All services" }, ...options] : options;
}

export function projectStatusOptions(current?: string): { value: string; label: string }[] {
  return PROJECT_STATUSES.filter((s) => s !== current).map((s) => ({
    value: s,
    label: PROJECT_STATUS_LABELS[s] ?? s,
  }));
}

/** Valid next project statuses for UI affordances (server remains authoritative). */
export function canProjectStatusNext(current: string): string[] {
  const map: Record<string, string[]> = {
    planning: ["active", "archived"],
    active: ["review", "paused", "archived"],
    review: ["active", "completed", "paused"],
    paused: ["active", "archived"],
    completed: ["archived"],
    archived: [],
  };
  return map[current] ?? [];
}
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Human summary for one append-only LeadActivity row — never HTML. */
export function describeActivity(activity: {
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: string | null;
}): string {
  const fromLabel = (map: Record<string, string>, value?: string | null) =>
    value ? (map[value] ?? value) : "—";

  if (activity.type === "status_change") {
    return `${fromLabel(STATUS_LABELS, activity.fromStatus)} → ${fromLabel(
      STATUS_LABELS,
      activity.toStatus,
    )}`;
  }

  let meta: Record<string, unknown> | null = null;
  if (activity.metadata) {
    try {
      const parsed = JSON.parse(activity.metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        meta = parsed as Record<string, unknown>;
      }
    } catch {
      meta = null;
    }
  }

  if (activity.type === "contract_status_changed") {
    const title = typeof meta?.title === "string" && meta.title ? `${meta.title} — ` : "";
    return `${title}${fromLabel(CONTRACT_STATUS_LABELS, activity.fromStatus)} → ${fromLabel(
      CONTRACT_STATUS_LABELS,
      activity.toStatus,
    )}`;
  }
  if (activity.type === "project_status_changed") {
    const name = typeof meta?.name === "string" && meta.name ? `${meta.name} — ` : "";
    return `${name}${fromLabel(PROJECT_STATUS_LABELS, activity.fromStatus)} → ${fromLabel(
      PROJECT_STATUS_LABELS,
      activity.toStatus,
    )}`;
  }
  if (activity.type === "invoice_status_changed") {
    const number = typeof meta?.invoiceNumber === "string" ? `${meta.invoiceNumber} — ` : "";
    return `${number}${fromLabel(INVOICE_STATUS_LABELS, activity.fromStatus)} → ${fromLabel(
      INVOICE_STATUS_LABELS,
      activity.toStatus,
    )}`;
  }

  if (meta) {
    if (activity.type === "assigned" || activity.type === "unassigned") {
      if (activity.type === "unassigned") return "Cleared owner";
      const id = typeof meta.assigneeId === "string" ? meta.assigneeId.slice(0, 8) : "";
      return id ? `Owner set (${id}…)` : "Owner set";
    }
    if (activity.type === "converted_to_client") {
      const clientName = typeof meta.leadName === "string" ? meta.leadName : "";
      return clientName ? `Client record created for “${clientName}”` : "Client record created";
    }
    if (activity.type === "contract_created") {
      const title = typeof meta.title === "string" ? meta.title : "contract";
      const version = typeof meta.proposalVersion === "number" ? `v${meta.proposalVersion}` : "";
      return `Internal contract created from ${title} ${version}`.trim();
    }
    if (activity.type.startsWith("proposal_")) {
      const version = typeof meta.version === "number" ? `v${meta.version}` : "";
      const title = typeof meta.title === "string" ? meta.title : "proposal";
      const total =
        typeof meta.totalMinor === "number" && typeof meta.currency === "string"
          ? ` · ${formatMoneyMinor(meta.totalMinor, meta.currency)}`
          : "";
      if (activity.type === "proposal_won") {
        return `${title} ${version} — lead converted to won`.trim();
      }
      return `${title} ${version}${total}`.trim();
    }
    if (typeof meta.title === "string" && meta.title) {
      if (typeof meta.dueDate === "string" && meta.dueDate) {
        return `“${meta.title}” due ${meta.dueDate}`;
      }
      if (typeof meta.completed === "boolean") {
        return `“${meta.title}” ${meta.completed ? "completed" : "reopened"}`;
      }
      return `“${meta.title}”`;
    }
    if (typeof meta.name === "string" && meta.name) {
      return `“${meta.name}”`;
    }
  }

  return ACTIVITY_LABELS[activity.type] ?? activity.type;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

/** Safe key/value pairs from lead.detail JSON — never treated as HTML. */
export function parseDetail(detail: string | null): Array<{ key: string; value: string }> {
  if (!detail) return [];
  try {
    const parsed = JSON.parse(detail) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && String(v).length > 0)
      .map(([k, v]) => ({ key: k, value: String(v).slice(0, 500) }));
  } catch {
    return [];
  }
}

export const DETAIL_KEY_LABELS: Record<string, string> = {
  service: "Service",
  services: "Services",
  features: "Features",
  scale: "Scale",
  pages: "Pages",
  budgetBand: "Budget",
  timeline: "Timeline",
  auditKind: "Audit type",
  challenge: "Challenge",
  adPlatform: "Ad platform",
  monthlyAdSpend: "Monthly ad spend",
  primaryGoal: "Primary goal",
  notes: "Extra notes",
  website: "Website",
};

export function detailLabel(key: string): string {
  return (
    DETAIL_KEY_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

export function auditKindLabel(value: string): string {
  return AUDIT_KIND_LABELS[value] ?? value;
}

export function adPlatformLabel(value: string): string {
  return AD_PLATFORM_LABELS[value] ?? value;
}

export function adSpendLabel(value: string): string {
  return AD_SPEND_LABELS[value] ?? value;
}

export { AUDIT_KINDS, AD_PLATFORMS, AD_SPEND_BANDS, isBudgetBand };
