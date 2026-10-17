import { PrismaClient } from "@prisma/client";
import type {
  Lead,
  LeadNote,
  AdminSession,
  AdminUser,
  LeadActivity,
  FollowUp,
  Proposal,
  Client,
  Contract,
  Project,
  Invoice,
  CaseStudy,
  BlogPost,
  SiteSetting,
  TeamMember,
} from "@prisma/client";
import type {
  LeadPipelineStatus,
  LeadSource,
  LeadActivityType,
  ProposalLine,
  ContractStatus,
  ProjectStatus,
  InvoiceStatus,
  SiteAssetSlot,
} from "./domain";
import {
  canContractTransition,
  canInvoiceTransition,
  canProjectTransition,
  canTransition,
  openLeadKey,
} from "./domain";

/**
 * LeadRepository — the only module that knows Prisma exists. Everything else
 * works on domain types, so swapping storage never leaks past this file.
 * Admin users, sessions and CRM notes persist here too (Phase 5).
 */

let client: PrismaClient | undefined;

/** Lazily-instantiated singleton so Next.js dev reloads reuse one connection. */
export function getPrisma(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}

/** Shape written by the lead service — never a raw passthrough of user input. */
export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  country?: string;
  source: LeadSource;
  budgetBand?: string;
  timeline?: string;
  message: string;
  consent: boolean;
  marketingConsent: boolean;
  detail?: Record<string, unknown>;
}
export type { Lead, LeadNote, AdminUser };

export async function createLead(data: CreateLeadInput): Promise<Lead> {
  return getPrisma().lead.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      website: data.website,
      country: data.country,
      source: data.source,
      status: "new",
      openLeadKey: openLeadKey(data.email, data.source),
      budgetBand: data.budgetBand,
      timeline: data.timeline,
      message: data.message,
      consent: data.consent,
      marketingConsent: data.marketingConsent,
      detail: data.detail === undefined ? undefined : JSON.stringify(data.detail),
    },
  });
}

/** Row shape of `listLeads` — keep in sync with the select below. */
export interface LeadListItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  company: string | null;
  source: string;
  status: string;
  budgetBand: string | null;
  timeline: string | null;
  service: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
}

const LEAD_LIST_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  email: true,
  company: true,
  source: true,
  status: true,
  budgetBand: true,
  timeline: true,
  detail: true,
  assignedToId: true,
  assignedTo: { select: { name: true } },
} as const;

function toListItem(row: {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  company: string | null;
  source: string;
  status: string;
  budgetBand: string | null;
  timeline: string | null;
  detail: string | null;
  assignedToId: string | null;
  assignedTo: { name: string } | null;
}): LeadListItem {
  let service: string | null = null;
  if (row.detail) {
    try {
      const parsed = JSON.parse(row.detail) as Record<string, unknown>;
      const raw = parsed.service ?? parsed.auditKind ?? parsed.services;
      if (typeof raw === "string" && raw.trim()) {
        service = raw.split(",")[0]?.trim() || null;
      }
    } catch {
      service = null;
    }
  }
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    name: row.name,
    email: row.email,
    company: row.company,
    source: row.source,
    status: row.status,
    budgetBand: row.budgetBand,
    timeline: row.timeline,
    service,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedTo?.name ?? null,
  };
}

export async function listLeads(options: {
  status?: LeadPipelineStatus;
  source?: LeadSource;
  limit?: number;
}): Promise<LeadListItem[]> {
  const rows = await getPrisma().lead.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.source ? { source: options.source } : {}),
    },
    select: LEAD_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take: Math.min(options.limit ?? 100, 200),
  });
  return rows.map(toListItem);
}

/** Server-side CRM list query — pagination + filters never load the full DB. */
export interface LeadQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: LeadPipelineStatus;
  source?: LeadSource;
  budgetBand?: string;
  timeline?: string;
  service?: string;
  /** AdminUser id, or literal `"unassigned"` for null assignee. */
  assignedTo?: string;
  sort?: "newest" | "oldest";
}

export interface LeadPage {
  items: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

type PrismaWhere = Record<string, unknown>;

function buildLeadWhere(query: LeadQuery): PrismaWhere {
  const where: PrismaWhere = {};
  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.budgetBand) where.budgetBand = query.budgetBand;
  if (query.timeline) where.timeline = query.timeline;
  if (query.assignedTo === "unassigned") where.assignedToId = null;
  else if (query.assignedTo) where.assignedToId = query.assignedTo;
  if (query.service) {
    // `detail` is a JSON string; match the canonical key written by flows.
    where.detail = { contains: `"service":"${query.service}"` };
  }
  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ];
  }
  return where;
}

export async function listLeadsPage(query: LeadQuery): Promise<LeadPage> {
  const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const where = buildLeadWhere(query);
  const [total, rows] = await Promise.all([
    getPrisma().lead.count({ where }),
    getPrisma().lead.findMany({
      where,
      select: LEAD_LIST_SELECT,
      orderBy: { createdAt: query.sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items: rows.map(toListItem),
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export type LeadWithAssignee = Lead & {
  assignedTo: Pick<AdminUser, "id" | "name" | "email"> | null;
};

export async function getLead(id: string): Promise<LeadWithAssignee | null> {
  return getPrisma().lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

export class StatusTransitionError extends Error {
  constructor(from: LeadPipelineStatus, to: LeadPipelineStatus) {
    super(`Invalid lead status transition: ${from} → ${to}`);
    this.name = "StatusTransitionError";
  }
}

export async function updateLeadStatus(id: string, to: LeadPipelineStatus): Promise<Lead> {
  const lead = await getLead(id);
  if (!lead) throw new Error(`Lead not found: ${id}`);
  const from = lead.status as LeadPipelineStatus;
  if (!canTransition(from, to)) throw new StatusTransitionError(from, to);
  const updated = await getPrisma().lead.update({
    where: { id },
    data: {
      status: to,
      // Leaving `new` releases the dedupe key — the same email can open a
      // fresh lead later without hitting the unique constraint.
      openLeadKey: to === "new" ? openLeadKey(lead.email, lead.source) : null,
    },
  });
  return updated;
}

export async function addLeadNote(id: string, note: string): Promise<Lead> {
  return getPrisma().lead.update({
    where: { id },
    data: {
      notes: note.slice(0, 2000),
    },
  });
}

// ── Dashboard aggregates ─────────────────────────────────────────────────

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  unassigned: number;
}

export async function getLeadStats(): Promise<LeadStats> {
  const prisma = getPrisma();
  const [total, statusGroups, sourceGroups, unassigned] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.lead.count({ where: { assignedToId: null } }),
  ]);
  const byStatus: Record<string, number> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count._all;
  const bySource: Record<string, number> = {};
  for (const g of sourceGroups) bySource[g.source] = g._count._all;
  return { total, byStatus, bySource, unassigned };
}

// ── Admin users & sessions ───────────────────────────────────────────────

export async function countAdminUsers(): Promise<number> {
  return getPrisma().adminUser.count();
}

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  return getPrisma().adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function findAdminById(id: string): Promise<AdminUser | null> {
  return getPrisma().adminUser.findUnique({ where: { id } });
}

export interface CreateAdminInput {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  /** Portal link — only ever set for `role = "client"` rows. */
  clientId?: string | null;
}

export async function createAdminUser(data: CreateAdminInput): Promise<AdminUser> {
  return getPrisma().adminUser.create({
    data: {
      email: data.email.trim().toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role,
      clientId: data.clientId ?? null,
    },
  });
}

/** The portal login linked to a Client, if one has been provisioned. */
export async function findPortalUserByClientId(clientId: string): Promise<AdminUser | null> {
  return getPrisma().adminUser.findUnique({ where: { clientId } });
}

/**
 * Reset a portal login's email/password in place — never creates a second
 * user for the same Client (the `clientId` unique constraint enforces it).
 */
export async function updatePortalUserCredentials(
  id: string,
  data: { email: string; passwordHash: string; active?: boolean },
): Promise<AdminUser> {
  return getPrisma().adminUser.update({
    where: { id },
    data: {
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      ...(data.active === undefined ? {} : { active: data.active }),
    },
  });
}

/** Replace the password hash only — email, role and links are untouched. */
export async function setAdminUserPassword(id: string, passwordHash: string): Promise<AdminUser> {
  return getPrisma().adminUser.update({ where: { id }, data: { passwordHash } });
}

export async function touchAdminLogin(id: string): Promise<void> {
  await getPrisma().adminUser.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function createAdminSession(data: CreateSessionInput): Promise<AdminSession> {
  return getPrisma().adminSession.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<(AdminSession & { user: AdminUser }) | null> {
  return getPrisma().adminSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function revokeSessionByTokenHash(tokenHash: string): Promise<void> {
  await getPrisma().adminSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every live session of one user — used on portal password reset. */
export async function revokeSessionsForUserId(userId: string): Promise<void> {
  await getPrisma().adminSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke every live session of one user except the one making the change —
 * the self-service password change keeps the current login alive while
 * signing out any other device/cookie. Omit `keepTokenHash` to revoke all.
 */
export async function revokeOtherSessionsForUser(
  userId: string,
  keepTokenHash?: string,
): Promise<void> {
  await getPrisma().adminSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepTokenHash ? { tokenHash: { not: keepTokenHash } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

// ── CRM notes ────────────────────────────────────────────────────────────

export interface CreateCrmNoteInput {
  leadId: string;
  authorId: string;
  body: string;
}

export type LeadNoteWithAuthor = LeadNote & {
  author: Pick<AdminUser, "id" | "name" | "email">;
};

export async function createLeadCrmNote(data: CreateCrmNoteInput): Promise<LeadNoteWithAuthor> {
  return getPrisma().leadNote.create({
    data: {
      leadId: data.leadId,
      authorId: data.authorId,
      body: data.body,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
}

export async function listLeadCrmNotes(leadId: string): Promise<LeadNoteWithAuthor[]> {
  return getPrisma().leadNote.findMany({
    where: { leadId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// ── Assignment (Phase 6) ────────────────────────────────────────────────

export async function listActiveCrmUsers(): Promise<
  Array<Pick<AdminUser, "id" | "name" | "email" | "role">>
> {
  return getPrisma().adminUser.findMany({
    where: { active: true, role: { in: ["admin", "staff"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

/** Every CRM login, active or not — the /admin/users management surface. */
export async function listCrmUserRows(): Promise<
  Array<Pick<AdminUser, "id" | "name" | "email" | "role" | "active" | "lastLoginAt" | "createdAt">>
> {
  return getPrisma().adminUser.findMany({
    where: { role: { in: ["admin", "staff"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

/** Feeds the "never leave zero active admins" invariant. */
export async function countActiveAdmins(): Promise<number> {
  return getPrisma().adminUser.count({ where: { role: "admin", active: true } });
}

/** Role / active toggle for a CRM login. Client-portal rows are out of scope. */
export async function updateCrmUserRow(
  id: string,
  data: { role?: string; active?: boolean },
): Promise<AdminUser> {
  return getPrisma().adminUser.update({ where: { id }, data });
}

export interface AssignLeadInput {
  leadId: string;
  assignedToId: string | null;
  actorId: string;
  type: LeadActivityType;
  metadata?: Record<string, unknown>;
}

/**
 * Assign (or unassign) a lead and append an activity row in one transaction.
 * The activity is never written without the assignment, and vice versa.
 */
export async function assignLeadWithActivity(
  input: AssignLeadInput,
): Promise<Lead & { assignedTo: Pick<AdminUser, "id" | "name" | "email"> | null }> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: input.leadId },
      data: { assignedToId: input.assignedToId },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    await tx.leadActivity.create({
      data: {
        type: input.type,
        leadId: input.leadId,
        actorId: input.actorId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
    return lead;
  });
}

/**
 * Record a status-change activity (called after a successful status update).
 * Status itself is already committed by `updateLeadStatus` — activity is
 * best-effort audit; failures are thrown to the service layer for logging.
 */
export async function recordLeadActivity(input: {
  type: LeadActivityType;
  leadId: string;
  actorId: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<LeadActivity> {
  return getPrisma().leadActivity.create({
    data: {
      type: input.type,
      leadId: input.leadId,
      actorId: input.actorId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export type LeadActivityWithActor = LeadActivity & {
  actor: Pick<AdminUser, "id" | "name" | "email">;
};

export async function listLeadActivities(leadId: string): Promise<LeadActivityWithActor[]> {
  return getPrisma().leadActivity.findMany({
    where: { leadId },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// ── Follow-ups (Phase 6) ────────────────────────────────────────────────

export type FollowUpWithRelations = FollowUp & {
  assignee: Pick<AdminUser, "id" | "name" | "email"> | null;
  creator: Pick<AdminUser, "id" | "name" | "email">;
};

const FOLLOW_UP_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true, email: true } },
} as const;

export interface CreateFollowUpInput {
  leadId: string;
  creatorId: string;
  assigneeId: string | null;
  title: string;
  body?: string | null;
  dueDate: string;
}

export async function createFollowUp(input: CreateFollowUpInput): Promise<FollowUpWithRelations> {
  return getPrisma().followUp.create({
    data: {
      leadId: input.leadId,
      creatorId: input.creatorId,
      assigneeId: input.assigneeId,
      title: input.title,
      body: input.body ?? null,
      dueDate: input.dueDate,
    },
    include: FOLLOW_UP_INCLUDE,
  });
}

export async function getFollowUp(id: string): Promise<FollowUpWithRelations | null> {
  return getPrisma().followUp.findUnique({ where: { id }, include: FOLLOW_UP_INCLUDE });
}

export async function listLeadFollowUps(leadId: string): Promise<FollowUpWithRelations[]> {
  return getPrisma().followUp.findMany({
    where: { leadId },
    include: FOLLOW_UP_INCLUDE,
    orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function updateFollowUp(
  id: string,
  data: {
    title?: string;
    body?: string | null;
    dueDate?: string;
    assigneeId?: string | null;
    completedAt?: Date | null;
  },
): Promise<FollowUpWithRelations> {
  return getPrisma().followUp.update({
    where: { id },
    data,
    include: FOLLOW_UP_INCLUDE,
  });
}

/** Open follow-ups due on or before `asOf` (YYYY-MM-DD), for dashboard tiles. */
export async function countOverdueFollowUps(asOf?: string): Promise<number> {
  const day = asOf ?? new Date().toISOString().slice(0, 10);
  return getPrisma().followUp.count({
    where: { completedAt: null, dueDate: { lte: day } },
  });
}

// ── Proposals (Phase 7) ────────────────────────────────────────────────

export type ProposalWithCreator = Proposal & {
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const PROPOSAL_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export interface CreateProposalRowInput {
  leadId: string;
  createdById: string;
  title: string;
  currency: string;
  validUntil: string;
  notes?: string | null;
  lines: ProposalLine[];
  subtotalMinor: number;
  totalMinor: number;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Insert a proposal with the next per-lead version.
 * Retries on unique (leadId, version) conflicts so concurrent creates
 * cannot silently share a version under SQLite constraints.
 */
export async function createProposalWithNextVersion(
  input: CreateProposalRowInput,
): Promise<ProposalWithCreator> {
  const prisma = getPrisma();
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const agg = await prisma.proposal.aggregate({
      where: { leadId: input.leadId },
      _max: { version: true },
    });
    const version = (agg._max.version ?? 0) + 1;
    try {
      return await prisma.proposal.create({
        data: {
          leadId: input.leadId,
          createdById: input.createdById,
          version,
          status: "draft",
          title: input.title,
          currency: input.currency,
          validUntil: input.validUntil,
          notes: input.notes ?? null,
          lines: JSON.stringify(input.lines),
          subtotalMinor: input.subtotalMinor,
          totalMinor: input.totalMinor,
        },
        include: PROPOSAL_INCLUDE,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("proposal_version_conflict");
}

export async function getProposal(id: string): Promise<ProposalWithCreator | null> {
  return getPrisma().proposal.findUnique({ where: { id }, include: PROPOSAL_INCLUDE });
}

export async function listLeadProposals(leadId: string): Promise<ProposalWithCreator[]> {
  return getPrisma().proposal.findMany({
    where: { leadId },
    include: PROPOSAL_INCLUDE,
    orderBy: { version: "desc" },
    take: 50,
  });
}

export async function findAcceptedProposal(leadId: string): Promise<ProposalWithCreator | null> {
  return getPrisma().proposal.findFirst({
    where: { leadId, status: "accepted" },
    include: PROPOSAL_INCLUDE,
    orderBy: { version: "desc" },
  });
}

/** Commercial content + totals — only allowed while status is draft. */
export async function updateDraftProposalContent(
  id: string,
  data: {
    title: string;
    currency: string;
    validUntil: string;
    notes: string | null;
    lines: ProposalLine[];
    subtotalMinor: number;
    totalMinor: number;
  },
): Promise<ProposalWithCreator> {
  return getPrisma().proposal.update({
    where: { id },
    data: {
      title: data.title,
      currency: data.currency,
      validUntil: data.validUntil,
      notes: data.notes,
      lines: JSON.stringify(data.lines),
      subtotalMinor: data.subtotalMinor,
      totalMinor: data.totalMinor,
    },
    include: PROPOSAL_INCLUDE,
  });
}

export async function updateProposalStatusRow(
  id: string,
  status: "sent" | "accepted" | "declined",
  timestamps: { sentAt?: Date; acceptedAt?: Date; declinedAt?: Date },
): Promise<ProposalWithCreator> {
  return getPrisma().proposal.update({
    where: { id },
    data: {
      status,
      ...(timestamps.sentAt ? { sentAt: timestamps.sentAt } : {}),
      ...(timestamps.acceptedAt ? { acceptedAt: timestamps.acceptedAt } : {}),
      ...(timestamps.declinedAt ? { declinedAt: timestamps.declinedAt } : {}),
    },
    include: PROPOSAL_INCLUDE,
  });
}

/**
 * Compare-and-swap answer for the portal response: the row only moves when
 * it is still `sent`, so two racing responses can never both win. Returns
 * `null` when the guard fails — the caller re-reads to report the reason.
 */
export async function answerProposalStatusRow(
  id: string,
  status: "accepted" | "declined",
  timestamps: { acceptedAt?: Date; declinedAt?: Date },
): Promise<ProposalWithCreator | null> {
  const result = await getPrisma().proposal.updateMany({
    where: { id, status: "sent" },
    data: {
      status,
      ...(timestamps.acceptedAt ? { acceptedAt: timestamps.acceptedAt } : {}),
      ...(timestamps.declinedAt ? { declinedAt: timestamps.declinedAt } : {}),
    },
  });
  if (result.count === 0) return null;
  return getProposal(id);
}

export function parseProposalLines(raw: string): ProposalLine[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ProposalLine[] => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.description !== "string") return [];
      if (typeof row.quantity !== "number" || typeof row.unitPriceMinor !== "number") return [];
      return [
        {
          description: row.description,
          quantity: row.quantity,
          unitPriceMinor: row.unitPriceMinor,
        },
      ];
    });
  } catch {
    return [];
  }
}

// ── Clients (Phase 9) ───────────────────────────────────────────────────

export type { Client };

export type ClientWithRelations = Client & {
  lead: Pick<Lead, "id" | "name" | "email" | "status" | "source">;
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const CLIENT_INCLUDE = {
  lead: { select: { id: true, name: true, email: true, status: true, source: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Thrown when the unique `leadId` constraint rejects a second client. */
export class ClientAlreadyExistsError extends Error {
  constructor() {
    super("A client already exists for this lead");
    this.name = "ClientAlreadyExistsError";
  }
}

export interface CreateClientRowInput {
  leadId: string;
  createdById: string;
  name: string;
  email: string;
  phone?: string | null;
  organizationName?: string | null;
  sourceStatus: string;
}

export async function findClientByLeadId(leadId: string): Promise<Client | null> {
  return getPrisma().client.findUnique({ where: { leadId } });
}

export async function getClient(id: string): Promise<ClientWithRelations | null> {
  return getPrisma().client.findUnique({ where: { id }, include: CLIENT_INCLUDE });
}

/**
 * Create the Client and its `converted_to_client` LeadActivity in one
 * transaction. The unique `leadId` constraint is the final duplicate guard —
 * a concurrent second insert rolls back both the client and its activity.
 */
export async function createClientWithActivity(
  input: CreateClientRowInput & {
    activityMetadata: Record<string, unknown>;
  },
): Promise<ClientWithRelations> {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          leadId: input.leadId,
          createdById: input.createdById,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          organizationName: input.organizationName ?? null,
          sourceStatus: input.sourceStatus,
        },
        include: CLIENT_INCLUDE,
      });
      await tx.leadActivity.create({
        data: {
          type: "converted_to_client",
          leadId: input.leadId,
          actorId: input.createdById,
          metadata: JSON.stringify({
            ...input.activityMetadata,
            clientId: created.id,
          }),
        },
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ClientAlreadyExistsError();
    throw error;
  }
}

export interface ClientListItem {
  id: string;
  createdAt: Date;
  name: string;
  email: string;
  phone: string | null;
  organizationName: string | null;
  sourceStatus: string;
  leadId: string;
  leadName: string;
  leadStatus: string;
}

export async function listClients(limit = 200): Promise<ClientListItem[]> {
  const rows = await getPrisma().client.findMany({
    select: {
      id: true,
      createdAt: true,
      name: true,
      email: true,
      phone: true,
      organizationName: true,
      sourceStatus: true,
      leadId: true,
      lead: { select: { name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    name: row.name,
    email: row.email,
    phone: row.phone,
    organizationName: row.organizationName,
    sourceStatus: row.sourceStatus,
    leadId: row.leadId,
    leadName: row.lead.name,
    leadStatus: row.lead.status,
  }));
}

// ── Contracts (Phase 11) ───────────────────────────────────────────────

export type { Contract };

export type ContractWithRelations = Contract & {
  client: Pick<Client, "id" | "name" | "email" | "organizationName" | "leadId">;
  proposal: Pick<Proposal, "id" | "version" | "status" | "leadId">;
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const CONTRACT_INCLUDE = {
  client: { select: { id: true, name: true, email: true, organizationName: true, leadId: true } },
  proposal: { select: { id: true, version: true, status: true, leadId: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Thrown when the unique `proposalId` constraint rejects a second contract. */
export class ContractAlreadyExistsError extends Error {
  constructor() {
    super("A contract already exists for this proposal");
    this.name = "ContractAlreadyExistsError";
  }
}

export interface CreateContractRowInput {
  clientId: string;
  proposalId: string;
  createdById: string;
  proposalVersion: number;
  title: string;
  currency: string;
  validUntil: string;
  clientName: string;
  clientEmail: string;
  organizationName?: string | null;
  lines: string;
  subtotalMinor: number;
  totalMinor: number;
}

export async function getContract(id: string): Promise<ContractWithRelations | null> {
  return getPrisma().contract.findUnique({ where: { id }, include: CONTRACT_INCLUDE });
}

export async function findContractByProposalId(proposalId: string): Promise<Contract | null> {
  return getPrisma().contract.findUnique({ where: { proposalId } });
}

export async function listContractsByClientId(clientId: string): Promise<ContractWithRelations[]> {
  return getPrisma().contract.findMany({
    where: { clientId },
    include: CONTRACT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listContracts(limit = 200): Promise<ContractWithRelations[]> {
  return getPrisma().contract.findMany({
    include: CONTRACT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
}

/**
 * Create the Contract and its `contract_created` LeadActivity in one
 * transaction. The unique `proposalId` constraint is the final duplicate
 * guard — a concurrent second insert rolls back both rows.
 */
export async function createContractWithActivity(
  input: CreateContractRowInput & {
    leadId: string;
    activityMetadata: Record<string, unknown>;
  },
): Promise<ContractWithRelations> {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          clientId: input.clientId,
          proposalId: input.proposalId,
          createdById: input.createdById,
          status: "draft",
          proposalVersion: input.proposalVersion,
          title: input.title,
          currency: input.currency,
          validUntil: input.validUntil,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          organizationName: input.organizationName ?? null,
          lines: input.lines,
          subtotalMinor: input.subtotalMinor,
          totalMinor: input.totalMinor,
        },
        include: CONTRACT_INCLUDE,
      });
      await tx.leadActivity.create({
        data: {
          type: "contract_created",
          leadId: input.leadId,
          actorId: input.createdById,
          metadata: JSON.stringify({
            ...input.activityMetadata,
            contractId: created.id,
            clientId: input.clientId,
            proposalId: input.proposalId,
            proposalVersion: input.proposalVersion,
            title: input.title,
            currency: input.currency,
            totalMinor: input.totalMinor,
          }),
        },
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ContractAlreadyExistsError();
    throw error;
  }
}

/**
 * Update contract status and append `contract_status_changed` activity in
 * one transaction. Re-checks the domain transition map before writing so a
 * rejected transition never leaves an orphan activity row.
 */
export async function updateContractStatusWithActivity(input: {
  id: string;
  from: ContractStatus;
  to: ContractStatus;
  leadId: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): Promise<ContractWithRelations> {
  if (!canContractTransition(input.from, input.to)) {
    throw new Error(`invalid_contract_transition:${input.from}->${input.to}`);
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.contract.update({
      where: { id: input.id },
      data: { status: input.to },
      include: CONTRACT_INCLUDE,
    });
    await tx.leadActivity.create({
      data: {
        type: "contract_status_changed",
        leadId: input.leadId,
        actorId: input.actorId,
        fromStatus: input.from,
        toStatus: input.to,
        metadata: JSON.stringify({
          ...input.metadata,
          contractId: input.id,
          clientId: updated.clientId,
          fromStatus: input.from,
          toStatus: input.to,
          title: updated.title,
          proposalVersion: updated.proposalVersion,
          currency: updated.currency,
          totalMinor: updated.totalMinor,
        }),
      },
    });
    return updated;
  });
}

// ── Projects (Phase 12) ──────────────────────────────────────────────

export type { Project };

export type ProjectWithRelations = Project & {
  client: Pick<Client, "id" | "name" | "email" | "organizationName" | "leadId">;
  contract: Pick<Contract, "id" | "status" | "title" | "clientId" | "proposalId">;
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const PROJECT_INCLUDE = {
  client: { select: { id: true, name: true, email: true, organizationName: true, leadId: true } },
  contract: { select: { id: true, status: true, title: true, clientId: true, proposalId: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Thrown when the unique `contractId` constraint rejects a second project. */
export class ProjectAlreadyExistsError extends Error {
  constructor() {
    super("A project already exists for this contract");
    this.name = "ProjectAlreadyExistsError";
  }
}

export interface CreateProjectRowInput {
  clientId: string;
  contractId: string;
  createdById: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  targetEndDate?: string | null;
}

export async function getProject(id: string): Promise<ProjectWithRelations | null> {
  return getPrisma().project.findUnique({ where: { id }, include: PROJECT_INCLUDE });
}

export async function findProjectByContractId(contractId: string): Promise<Project | null> {
  return getPrisma().project.findUnique({ where: { contractId } });
}

export async function listProjects(limit = 200): Promise<ProjectWithRelations[]> {
  return getPrisma().project.findMany({
    include: PROJECT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
}

/** Every Project opened for one Client — across all of that client's contracts. */
export async function listProjectsByClientId(clientId: string): Promise<ProjectWithRelations[]> {
  return getPrisma().project.findMany({
    where: { clientId },
    include: PROJECT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/**
 * Create the Project and its `project_created` LeadActivity in one
 * transaction. The unique `contractId` constraint is the final duplicate
 * guard — a concurrent second insert rolls back both rows.
 * When `failActivity` is true (test seam), the activity insert is forced
 * to fail after the project insert to prove atomic rollback.
 */
export async function createProjectWithActivity(
  input: CreateProjectRowInput & {
    leadId: string;
    activityMetadata: Record<string, unknown>;
    /** Test-only: force activity write failure for atomicity coverage. */
    failActivity?: boolean;
  },
): Promise<ProjectWithRelations> {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          clientId: input.clientId,
          contractId: input.contractId,
          createdById: input.createdById,
          name: input.name,
          description: input.description ?? null,
          status: input.status,
          startDate: input.startDate ?? null,
          targetEndDate: input.targetEndDate ?? null,
        },
        include: PROJECT_INCLUDE,
      });
      await tx.leadActivity.create({
        data: {
          type: "project_created",
          leadId: input.failActivity ? "c0000000000000000000000000" : input.leadId,
          actorId: input.createdById,
          metadata: JSON.stringify({
            ...input.activityMetadata,
            projectId: created.id,
            contractId: input.contractId,
            clientId: input.clientId,
          }),
        },
      });
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ProjectAlreadyExistsError();
    throw error;
  }
}

/**
 * Update project status and append `project_status_changed` activity in one
 * transaction. Re-checks the domain transition map before writing.
 */
export async function updateProjectStatusWithActivity(input: {
  id: string;
  from: ProjectStatus;
  to: ProjectStatus;
  leadId: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): Promise<ProjectWithRelations> {
  if (!canProjectTransition(input.from, input.to)) {
    throw new Error(`invalid_project_transition:${input.from}->${input.to}`);
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: input.id },
      data: { status: input.to },
      include: PROJECT_INCLUDE,
    });
    await tx.leadActivity.create({
      data: {
        type: "project_status_changed",
        leadId: input.leadId,
        actorId: input.actorId,
        fromStatus: input.from,
        toStatus: input.to,
        metadata: JSON.stringify({
          ...input.metadata,
          projectId: input.id,
          fromStatus: input.from,
          toStatus: input.to,
        }),
      },
    });
    return updated;
  });
}

// ── Invoices (Phase 14) ───────────────────────────────────────────────

export type { Invoice };

export type InvoiceWithRelations = Invoice & {
  contract: Contract & {
    client: Pick<Client, "id" | "name" | "email" | "organizationName" | "leadId">;
    projects: Array<Pick<Project, "id" | "name" | "status">>;
  };
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const INVOICE_INCLUDE = {
  contract: {
    include: {
      client: {
        select: { id: true, name: true, email: true, organizationName: true, leadId: true },
      },
      projects: { select: { id: true, name: true, status: true } },
    },
  },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Thrown when the unique `contractId` constraint rejects a second invoice. */
export class InvoiceAlreadyExistsError extends Error {
  constructor() {
    super("An invoice already exists for this contract");
    this.name = "InvoiceAlreadyExistsError";
  }
}

export interface CreateInvoiceRowInput {
  contractId: string;
  createdById: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  title: string;
  lines: string;
  subtotalMinor: number;
  totalMinor: number;
}

export async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  return getPrisma().invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
}

export async function findInvoiceByContractId(contractId: string): Promise<Invoice | null> {
  return getPrisma().invoice.findUnique({ where: { contractId } });
}

export async function listInvoices(limit = 200): Promise<InvoiceWithRelations[]> {
  return getPrisma().invoice.findMany({
    include: INVOICE_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
}

/**
 * Every Invoice belonging to one Client, resolved through the existing
 * Invoice → Contract → Client relationship. No Invoice→Client column is
 * introduced — the unique `contractId` chain is the only source of truth.
 */
export async function listInvoicesByClientId(clientId: string): Promise<InvoiceWithRelations[]> {
  return getPrisma().invoice.findMany({
    where: { contract: { clientId } },
    include: INVOICE_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** Next sequential invoice number (INV-000001, …) — server-authoritative. */
export async function nextInvoiceNumber(): Promise<string> {
  const count = await getPrisma().invoice.count();
  return `INV-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Create the Invoice and its `invoice_created` LeadActivity in one
 * transaction. The unique `contractId` constraint is the final duplicate
 * guard — a concurrent second insert rolls back both rows.
 * Invoice numbers are assigned inside the transaction and retried on
 * number collisions so concurrent creates across different contracts do
 * not falsely report a duplicate invoice.
 * When `failActivity` is true (test seam), the activity insert is forced
 * to fail after the invoice insert to prove atomic rollback.
 */
export async function createInvoiceWithActivity(
  input: Omit<CreateInvoiceRowInput, "invoiceNumber"> & {
    leadId: string;
    activityMetadata: Record<string, unknown>;
    /** Test-only: force activity write failure for atomicity coverage. */
    failActivity?: boolean;
  },
): Promise<InvoiceWithRelations> {
  const prisma = getPrisma();
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const count = await tx.invoice.count();
        const invoiceNumber = `INV-${String(count + 1).padStart(6, "0")}`;
        const created = await tx.invoice.create({
          data: {
            contractId: input.contractId,
            createdById: input.createdById,
            invoiceNumber,
            status: input.status,
            currency: input.currency,
            issueDate: input.issueDate,
            dueDate: input.dueDate ?? null,
            title: input.title,
            lines: input.lines,
            subtotalMinor: input.subtotalMinor,
            totalMinor: input.totalMinor,
          },
          include: INVOICE_INCLUDE,
        });
        await tx.leadActivity.create({
          data: {
            type: "invoice_created",
            leadId: input.failActivity ? "c0000000000000000000000000" : input.leadId,
            actorId: input.createdById,
            metadata: JSON.stringify({
              ...input.activityMetadata,
              invoiceId: created.id,
              contractId: input.contractId,
              invoiceNumber: created.invoiceNumber,
              currency: input.currency,
              totalMinor: input.totalMinor,
            }),
          },
        });
        return created;
      });
    } catch (error) {
      // Unique contractId → true duplicate invoice (domain error).
      // Unique invoiceNumber under a different contract → retry with next number.
      if (isUniqueViolation(error)) {
        const target = (error as { meta?: { target?: unknown } }).meta?.target;
        const targets = Array.isArray(target) ? target : target ? [target] : [];
        const isContractDup = targets.some(
          (t) => typeof t === "string" && t.toLowerCase().includes("contractid"),
        );
        if (isContractDup) throw new InvoiceAlreadyExistsError();
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (lastError && isUniqueViolation(lastError)) {
    // Exhausted number retries — treat as concurrent-create failure.
    const target = (lastError as { meta?: { target?: unknown } }).meta?.target;
    const targets = Array.isArray(target) ? target : target ? [target] : [];
    const isContractDup = targets.some(
      (t) => typeof t === "string" && t.toLowerCase().includes("contractid"),
    );
    if (isContractDup) throw new InvoiceAlreadyExistsError();
  }
  throw lastError ?? new Error("invoice_create_failed");
}

/**
 * Update invoice status and append `invoice_status_changed` activity in one
 * transaction. Re-checks the domain transition map before writing.
 */
export async function updateInvoiceStatusWithActivity(input: {
  id: string;
  from: InvoiceStatus;
  to: InvoiceStatus;
  leadId: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): Promise<InvoiceWithRelations> {
  if (!canInvoiceTransition(input.from, input.to)) {
    throw new Error(`invalid_invoice_transition:${input.from}->${input.to}`);
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: input.id },
      data: { status: input.to },
      include: INVOICE_INCLUDE,
    });
    await tx.leadActivity.create({
      data: {
        type: "invoice_status_changed",
        leadId: input.leadId,
        actorId: input.actorId,
        fromStatus: input.from,
        toStatus: input.to,
        metadata: JSON.stringify({
          ...input.metadata,
          invoiceId: input.id,
          fromStatus: input.from,
          toStatus: input.to,
        }),
      },
    });
    return updated;
  });
}

// ── Case studies (Phase 16) ───────────────────────────────────────────

export type { CaseStudy };

export type CaseStudyWithCreator = CaseStudy & {
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const CASE_STUDY_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Thrown when the unique `slotNumber` constraint rejects a second study. */
export class CaseStudySlotTakenError extends Error {
  constructor() {
    super("A case study already occupies that slot");
    this.name = "CaseStudySlotTakenError";
  }
}

/** Thrown when the unique `slug` constraint rejects a duplicate URL segment. */
export class CaseStudySlugTakenError extends Error {
  constructor() {
    super("A case study already uses that slug");
    this.name = "CaseStudySlugTakenError";
  }
}

/** Field behind a `P2002` unique violation — `null` when Prisma omits it. */
function uniqueViolationField(error: unknown): string | null {
  if (!isUniqueViolation(error)) return null;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(target)) return typeof target[0] === "string" ? target[0] : null;
  return typeof target === "string" ? target : null;
}

/** Rethrow the *right* constraint: slot collisions are not slug collisions. */
function caseStudyUniqueViolation(error: unknown): Error {
  const field = uniqueViolationField(error);
  if (field === "slug") return new CaseStudySlugTakenError();
  return new CaseStudySlotTakenError();
}

export interface CreateCaseStudyRowInput {
  title: string;
  clientName: string;
  /** `/case-studies/[slug]` segment - unique, written by the service. */
  slug: string;
  slotNumber: number;
  description: string;
  /** Ordered metrics JSON: [{ label, value }] */
  metrics: string;
  status: string;
  imageAlt: string | null;
  /** Canonical YouTube/Vimeo embed URL, or null when the story has no video. */
  videoEmbedUrl: string | null;
  sortOrder: number;
  createdById: string;
}

export async function getCaseStudy(id: string): Promise<CaseStudyWithCreator | null> {
  return getPrisma().caseStudy.findUnique({ where: { id }, include: CASE_STUDY_INCLUDE });
}

export async function findCaseStudyBySlot(slotNumber: number): Promise<CaseStudy | null> {
  return getPrisma().caseStudy.findUnique({ where: { slotNumber } });
}

/** One row by its public URL segment — any status (the service gates). */
export async function findCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  if (!slug) return null;
  return getPrisma().caseStudy.findUnique({ where: { slug } });
}

export async function listCaseStudies(limit = 200): Promise<CaseStudyWithCreator[]> {
  return getPrisma().caseStudy.findMany({
    include: CASE_STUDY_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { slotNumber: "asc" }],
    take: Math.min(limit, 200),
  });
}

/**
 * PUBLISHED rows only, in landing order — the raw rows behind the public
 * list/detail pages. Projection to a wire-safe DTO happens in the service.
 */
export async function listPublishedCaseStudyRows(limit = 50): Promise<CaseStudy[]> {
  return getPrisma().caseStudy.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { slotNumber: "asc" }],
    take: Math.min(limit, 50),
  });
}

/**
 * Create a case study. The unique `slotNumber`/`slug` constraints are the
 * final duplicate guards — a concurrent second insert surfaces as
 * `CaseStudySlotTakenError` or `CaseStudySlugTakenError`, never a partial
 * write.
 */
export async function createCaseStudyRow(
  input: CreateCaseStudyRowInput,
): Promise<CaseStudyWithCreator> {
  try {
    return await getPrisma().caseStudy.create({
      data: {
        title: input.title,
        clientName: input.clientName,
        slug: input.slug,
        slotNumber: input.slotNumber,
        description: input.description,
        metrics: input.metrics,
        status: input.status,
        imageAlt: input.imageAlt,
        videoEmbedUrl: input.videoEmbedUrl,
        sortOrder: input.sortOrder,
        createdById: input.createdById,
      },
      include: CASE_STUDY_INCLUDE,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw caseStudyUniqueViolation(error);
    throw error;
  }
}

/** Update editable presentation fields — id only crosses the where clause. */
export async function updateCaseStudyRow(
  id: string,
  input: Omit<CreateCaseStudyRowInput, "createdById">,
): Promise<CaseStudyWithCreator> {
  try {
    return await getPrisma().caseStudy.update({
      where: { id },
      data: {
        title: input.title,
        clientName: input.clientName,
        slug: input.slug,
        slotNumber: input.slotNumber,
        description: input.description,
        metrics: input.metrics,
        status: input.status,
        imageAlt: input.imageAlt,
        videoEmbedUrl: input.videoEmbedUrl,
        sortOrder: input.sortOrder,
      },
      include: CASE_STUDY_INCLUDE,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw caseStudyUniqueViolation(error);
    throw error;
  }
}

export async function setCaseStudyImageRow(
  id: string,
  imagePath: string | null,
): Promise<CaseStudyWithCreator> {
  return getPrisma().caseStudy.update({
    where: { id },
    data: { imagePath },
    include: CASE_STUDY_INCLUDE,
  });
}

export async function deleteCaseStudyRow(id: string): Promise<void> {
  await getPrisma().caseStudy.delete({ where: { id } });
}

// ── Blog (Phase 25) ───────────────────────────────────────────────

export type { BlogPost };

export type { TeamMember };

export type TeamMemberInput = Pick<
  TeamMember,
  "name" | "role" | "bio" | "photoUrl" | "linkedinUrl" | "published" | "sortOrder"
>;

export async function listTeamMembers(): Promise<TeamMember[]> {
  return getPrisma().teamMember.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function listPublishedTeamMemberRows(): Promise<TeamMember[]> {
  return getPrisma().teamMember.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  return getPrisma().teamMember.findUnique({ where: { id } });
}

export async function createTeamMemberRow(input: TeamMemberInput): Promise<TeamMember> {
  return getPrisma().teamMember.create({ data: input });
}

export async function updateTeamMemberRow(id: string, input: TeamMemberInput): Promise<TeamMember> {
  return getPrisma().teamMember.update({ where: { id }, data: input });
}

export async function deleteTeamMemberRow(id: string): Promise<void> {
  await getPrisma().teamMember.delete({ where: { id } });
}

export type BlogPostWithCreator = BlogPost & {
  createdBy: Pick<AdminUser, "id" | "name" | "email">;
};

const BLOG_POST_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Thrown when the unique `slug` constraint rejects a duplicate URL segment. */
export class BlogSlugTakenError extends Error {
  constructor() {
    super("A blog post already uses that slug");
    this.name = "BlogSlugTakenError";
  }
}

export interface CreateBlogPostRowInput {
  slug: string;
  title: string;
  /** Search/list summary — also the meta description fallback. */
  excerpt: string;
  /** Article body: the constrained Markdown subset apps/web renders. */
  content: string;
  /** Tags JSON array string: ["seo", "nextjs"] */
  tags: string;
  status: string;
  publishedAt: Date | null;
  /** Alt text for the cover image — set with the text fields, not the file. */
  imageAlt: string | null;
  /** YouTube/Vimeo watch URL rendered as an embed; null means no video. */
  videoEmbedUrl: string | null;
  createdById: string;
}

export async function getBlogPost(id: string): Promise<BlogPostWithCreator | null> {
  return getPrisma().blogPost.findUnique({ where: { id }, include: BLOG_POST_INCLUDE });
}

export async function findBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return getPrisma().blogPost.findUnique({ where: { slug } });
}

/** CRM registry — newest first, every status. */
export async function listBlogPosts(limit = 200): Promise<BlogPostWithCreator[]> {
  return getPrisma().blogPost.findMany({
    include: BLOG_POST_INCLUDE,
    orderBy: { updatedAt: "desc" },
    take: Math.min(limit, 200),
  });
}

/** Public feed order — published newest first. */
export async function listPublishedBlogPostRows(limit = 50): Promise<BlogPost[]> {
  return getPrisma().blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(limit, 50),
  });
}

/**
 * Create a post. The unique `slug` constraint is the final duplicate guard —
 * a concurrent second insert surfaces as `BlogSlugTakenError`, never a
 * partial write.
 */
export async function createBlogPostRow(
  input: CreateBlogPostRowInput,
): Promise<BlogPostWithCreator> {
  try {
    return await getPrisma().blogPost.create({
      data: {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        tags: input.tags,
        status: input.status,
        publishedAt: input.publishedAt,
        imageAlt: input.imageAlt,
        videoEmbedUrl: input.videoEmbedUrl,
        createdById: input.createdById,
      },
      include: BLOG_POST_INCLUDE,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new BlogSlugTakenError();
    throw error;
  }
}

/** Update editable presentation fields — id only crosses the where clause. */
export async function updateBlogPostRow(
  id: string,
  input: Omit<CreateBlogPostRowInput, "createdById">,
): Promise<BlogPostWithCreator> {
  try {
    return await getPrisma().blogPost.update({
      where: { id },
      data: {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        tags: input.tags,
        status: input.status,
        publishedAt: input.publishedAt,
        imageAlt: input.imageAlt,
        videoEmbedUrl: input.videoEmbedUrl,
      },
      include: BLOG_POST_INCLUDE,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new BlogSlugTakenError();
    throw error;
  }
}

/**
 * Link (or clear) the stored cover image. Separate from the text update so the
 * file write and the row link stay two explicit, individually fallible steps.
 */
export async function setBlogPostImageRow(
  id: string,
  imagePath: string | null,
): Promise<BlogPostWithCreator> {
  return getPrisma().blogPost.update({
    where: { id },
    data: { imagePath },
    include: BLOG_POST_INCLUDE,
  });
}

/** Remove a post row — the row has no children, so the delete is a single statement. */
export async function deleteBlogPostRow(id: string): Promise<void> {
  await getPrisma().blogPost.delete({ where: { id } });
}

// ── Site settings (Phase 28) ──────────────────────────────────────

/** The singleton row's fixed id — there is exactly one site. */
export const SITE_SETTING_ID = "site";

/** Null means "never configured" — callers render their own fallback. */
export async function getSiteSettingRow(): Promise<SiteSetting | null> {
  return getPrisma().siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
}

/**
 * Create-or-update one brand key on the singleton row. The column is chosen
 * from a typed slot, never from client input, so a caller cannot reshape the
 * row or write into an unrelated field.
 */
export async function setSiteAssetRow(
  slot: SiteAssetSlot,
  key: string | null,
): Promise<SiteSetting> {
  const data = slot === "logo" ? { logoPath: key } : { faviconPath: key };
  return getPrisma().siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: { id: SITE_SETTING_ID, ...data },
    update: data,
  });
}
