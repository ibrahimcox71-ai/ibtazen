import { z } from "zod";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
} from "./password";
import {
  canAccessCrm,
  canAccessPortal,
  canManageUsers,
  canMutateLeads,
  isCrmRole,
  toCrmUser,
  toPortalUser,
  type CrmRole,
  type CrmUser,
  type PortalUser,
} from "./rbac";
import { checkLoginRateLimit } from "./login-rate-limit";
import { notifyProposalStatusChange } from "../crm-notifications";
import {
  assignLeadWithActivity,
  createAdminSession,
  createAdminUser,
  createFollowUp,
  createLeadCrmNote,
  createProposalWithNextVersion,
  countActiveAdmins,
  countAdminUsers,
  findAdminByEmail,
  findAdminById,
  findSessionByTokenHash,
  getFollowUp,
  getLead,
  getProposal,
  listActiveCrmUsers,
  listCrmUserRows,
  listLeadActivities,
  listLeadFollowUps,
  listLeadProposals,
  recordLeadActivity,
  revokeSessionByTokenHash,
  revokeSessionsForUserId,
  touchAdminLogin,
  updateCrmUserRow,
  updateDraftProposalContent,
  updateFollowUp,
  updateLeadStatus,
  updateProposalStatusRow,
  type FollowUpWithRelations,
  type LeadActivityWithActor,
  type LeadNoteWithAuthor,
  type ProposalWithCreator,
} from "../repository";
import {
  LEAD_STATUSES,
  PROPOSAL_CURRENCIES,
  canProposalTransition,
  canTransition,
  computeProposalTotals,
  isProposalCurrency,
  isProposalStatus,
  isValidDateString,
  parseMoneyToMinor,
  type LeadPipelineStatus,
  type ProposalLine,
  type ProposalStatus,
} from "../domain";

/**
 * AuthenticationService — login, session lifecycle, CRM mutations.
 * Callers pass raw credentials; role always comes from the database row.
 */

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.string().regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, "Enter a valid email"))
  .transform((v) => v.toLowerCase());

const passwordSchema = z.string().min(1).max(200);

const noteBodySchema = z
  .string()
  .max(2000, "Note is too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Note cannot be empty").max(2000, "Note is too long"));

export type LoginErrorCode = "invalid_credentials" | "rate_limited" | "invalid_input";

export type LoginResult =
  | { ok: true; token: string; user: CrmUser; expiresAt: Date }
  | { ok: false; error: LoginErrorCode };

/** Generic failure — never distinguishes unknown email vs bad password. */
const LOGIN_FAILED: LoginResult = { ok: false, error: "invalid_credentials" };

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/** Fixed-shape work so a missing user costs about the same as a wrong password. */
let dummyHash: string | undefined;
function getDummyHash(): string {
  // Lazy: module-eval hashing breaks any client bundle that imports the
  // package barrel (labels → LEAD_STATUSES) before server-only call sites run.
  dummyHash ??= hashPassword("ibtatech-dummy-password-for-timing-only");
  return dummyHash;
}

export async function loginAdmin(
  rawEmail: unknown,
  rawPassword: unknown,
  ip: string,
): Promise<LoginResult> {
  const parsedEmail = emailSchema.safeParse(rawEmail);
  const parsedPassword = passwordSchema.safeParse(rawPassword);
  if (!parsedEmail.success || !parsedPassword.success) {
    return { ok: false, error: "invalid_input" };
  }

  try {
    checkLoginRateLimit(ip, parsedEmail.data);
  } catch {
    return { ok: false, error: "rate_limited" };
  }

  const user = await findAdminByEmail(parsedEmail.data);
  const passwordOk = user
    ? verifyPassword(parsedPassword.data, user.passwordHash)
    : verifyPassword(parsedPassword.data, getDummyHash());

  if (!user || !passwordOk || !user.active || !canAccessCrm(user.role)) {
    return LOGIN_FAILED;
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await createAdminSession({
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  await touchAdminLogin(user.id);

  return { ok: true, token, user: toCrmUser(user), expiresAt };
}

export async function resolveSession(token: string | undefined | null): Promise<CrmUser | null> {
  if (!token) return null;
  const session = await findSessionByTokenHash(hashSessionToken(token));
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.active || !canAccessCrm(session.user.role)) return null;
  return toCrmUser(session.user);
}

export async function logoutSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await revokeSessionByTokenHash(hashSessionToken(token));
}

// ── Client portal session ───────────────────────────────────────────────

export type PortalLoginResult =
  | { ok: true; token: string; user: PortalUser; expiresAt: Date }
  | { ok: false; error: LoginErrorCode };

/**
 * Client portal sign-in. Same credential/rate-limit machinery as
 * `loginAdmin`, but the gate is `canAccessPortal` + a linked Client row —
 * CRM operators (admin/staff) can never open a portal session, and a
 * client-role user without a Client link is not a usable principal.
 */
export async function loginPortal(
  rawEmail: unknown,
  rawPassword: unknown,
  ip: string,
): Promise<PortalLoginResult> {
  const parsedEmail = emailSchema.safeParse(rawEmail);
  const parsedPassword = passwordSchema.safeParse(rawPassword);
  if (!parsedEmail.success || !parsedPassword.success) {
    return { ok: false, error: "invalid_input" };
  }

  try {
    checkLoginRateLimit(ip, parsedEmail.data);
  } catch {
    return { ok: false, error: "rate_limited" };
  }

  const user = await findAdminByEmail(parsedEmail.data);
  const passwordOk = user
    ? verifyPassword(parsedPassword.data, user.passwordHash)
    : verifyPassword(parsedPassword.data, getDummyHash());

  const portalUser = user && passwordOk && user.active ? toPortalUser(user) : null;
  if (!portalUser) return { ok: false, error: "invalid_credentials" };

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await createAdminSession({
    userId: portalUser.id,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  await touchAdminLogin(portalUser.id);

  return { ok: true, token, user: portalUser, expiresAt };
}

/**
 * Resolve a portal session — same token-hash/expiry/revocation checks as
 * `resolveSession`, but gated by `canAccessPortal` so a CRM session cookie
 * is never accepted on portal routes (and vice versa).
 */
export async function resolvePortalSession(
  token: string | undefined | null,
): Promise<PortalUser | null> {
  if (!token) return null;
  const session = await findSessionByTokenHash(hashSessionToken(token));
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.active || !canAccessPortal(session.user.role)) return null;
  return toPortalUser(session.user);
}

// ── Bootstrap ───────────────────────────────────────────────────────────

export interface BootstrapResult {
  created: boolean;
  email?: string;
}

/**
 * Creates the first admin from environment credentials when the table is
 * empty. Never runs against an existing user set; never hardcodes a password.
 */
export async function ensureBootstrapAdmin(): Promise<BootstrapResult> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  if (!email || !password) return { created: false };
  if (password.length < PASSWORD_MIN_LENGTH) {
    console.warn("[auth] ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters — skipped");
    return { created: false };
  }
  if ((await countAdminUsers()) > 0) return { created: false };
  if (await findAdminByEmail(email)) return { created: false };
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Ibtatech Admin";
  try {
    await createAdminUser({
      email,
      name,
      passwordHash: hashPassword(password),
      role: "admin",
    });
  } catch (error) {
    // Parallel first requests (or a concurrent bootstrap) can race the empty-table
    // check — a unique-email collision means someone already created the admin.
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2002") return { created: false, email };
    throw error;
  }
  return { created: true, email };
}

// ── CRM mutations (server-side only) ────────────────────────────────────

export type StatusChangeErrorCode =
  "unauthorized" | "not_found" | "invalid_status" | "invalid_transition";

export type StatusChangeResult =
  { ok: true; status: string } | { ok: false; error: StatusChangeErrorCode };

function isPipelineStatus(value: string): value is LeadPipelineStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export async function changeLeadStatus(
  actor: CrmUser | null,
  leadId: string,
  toStatus: string,
): Promise<StatusChangeResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (!isPipelineStatus(toStatus)) return { ok: false, error: "invalid_status" };
  try {
    const lead = await getLead(leadId);
    if (!lead) return { ok: false, error: "not_found" };
    const fromStatus = lead.status;
    const updated = await updateLeadStatus(leadId, toStatus);
    // Append-only audit — failure is logged, never fails the status change
    // the operator already observed as successful.
    try {
      await recordLeadActivity({
        type: "status_change",
        leadId,
        actorId: actor.id,
        fromStatus,
        toStatus,
      });
    } catch (error) {
      console.error("[crm] failed to record status activity", error);
    }
    return { ok: true, status: updated.status };
  } catch (error) {
    if (error instanceof Error && error.name === "StatusTransitionError") {
      return { ok: false, error: "invalid_transition" };
    }
    if (error instanceof Error && error.message.startsWith("Lead not found")) {
      return { ok: false, error: "not_found" };
    }
    throw error;
  }
}

export type NoteErrorCode = "unauthorized" | "not_found" | "invalid";

export type NoteResult =
  { ok: true; note: LeadNoteWithAuthor } | { ok: false; error: NoteErrorCode; message?: string };

export async function addCrmNote(
  actor: CrmUser | null,
  leadId: string,
  rawBody: unknown,
): Promise<NoteResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const parsed = noteBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      message: parsed.error.issues[0]?.message ?? "Invalid note",
    };
  }
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };
  const note = await createLeadCrmNote({ leadId, authorId: actor.id, body: parsed.data });
  return { ok: true, note };
}

// ── Assignment (Phase 6) ────────────────────────────────────────────────

// Shared cuid-shaped id guard (Phase 5+). Declared once for the whole module.
const cuidLike = /^[c][a-z0-9]{20,}$/i;

export type AssignErrorCode = "unauthorized" | "not_found" | "invalid_assignee" | "invalid";

export type AssignResult =
  | {
      ok: true;
      assignedToId: string | null;
      assignedToName: string | null;
    }
  | { ok: false; error: AssignErrorCode; message?: string };

export async function assignLead(
  actor: CrmUser | null,
  leadId: string,
  rawAssigneeId: unknown,
): Promise<AssignResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (!cuidLike.test(leadId)) return { ok: false, error: "not_found" };

  let assigneeId: string | null = null;
  if (rawAssigneeId !== null && rawAssigneeId !== undefined && rawAssigneeId !== "") {
    if (typeof rawAssigneeId !== "string" || !cuidLike.test(rawAssigneeId)) {
      return { ok: false, error: "invalid_assignee", message: "Invalid assignee." };
    }
    assigneeId = rawAssigneeId;
  }

  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };

  if (assigneeId) {
    const users = await listActiveCrmUsers();
    if (!users.some((u) => u.id === assigneeId)) {
      return {
        ok: false,
        error: "invalid_assignee",
        message: "That person cannot receive lead assignments.",
      };
    }
  }

  const previousId = lead.assignedToId;
  if (previousId === assigneeId) {
    const current = assigneeId
      ? (await listActiveCrmUsers()).find((u) => u.id === assigneeId)
      : null;
    return {
      ok: true,
      assignedToId: assigneeId,
      assignedToName: current?.name ?? null,
    };
  }

  try {
    const updated = await assignLeadWithActivity({
      leadId,
      assignedToId: assigneeId,
      actorId: actor.id,
      type: assigneeId ? "assigned" : "unassigned",
      metadata: {
        previousAssigneeId: previousId,
        assigneeId,
        actorName: actor.name,
      },
    });
    return {
      ok: true,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name ?? null,
    };
  } catch (error) {
    console.error("[crm] assignment failed", error);
    return { ok: false, error: "invalid" };
  }
}

export async function listCrmAssignees(): Promise<
  Array<{ id: string; name: string; email: string; role: string }>
> {
  return listActiveCrmUsers();
}

export async function listActivities(
  actor: CrmUser | null,
  leadId: string,
): Promise<
  { ok: true; activities: LeadActivityWithActor[] } | { ok: false; error: AssignErrorCode }
> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };
  return { ok: true, activities: await listLeadActivities(leadId) };
}

// ── Follow-ups (Phase 6) ────────────────────────────────────────────────

export type FollowUpErrorCode =
  "unauthorized" | "not_found" | "invalid" | "invalid_assignee" | "invalid_due_date";

export type FollowUpResult =
  | { ok: true; followUp: FollowUpWithRelations }
  | { ok: false; error: FollowUpErrorCode; message?: string };

const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Invalid calendar date");

const followUpTitleSchema = z
  .string()
  .max(200, "Title is too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Title cannot be empty").max(200, "Title is too long"));

const followUpBodySchema = z
  .string()
  .max(2000, "Details are too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(2000))
  .optional()
  .nullable();

async function resolveAssigneeId(
  raw: unknown,
): Promise<{ ok: true; id: string | null } | { ok: false; message: string }> {
  if (raw === null || raw === undefined || raw === "") return { ok: true, id: null };
  if (typeof raw !== "string" || !cuidLike.test(raw)) {
    return { ok: false, message: "Invalid assignee." };
  }
  const users = await listActiveCrmUsers();
  if (!users.some((u) => u.id === raw)) {
    return { ok: false, message: "That person cannot receive follow-ups." };
  }
  return { ok: true, id: raw };
}

export async function createLeadFollowUp(
  actor: CrmUser | null,
  leadId: string,
  input: { title?: unknown; body?: unknown; dueDate?: unknown; assigneeId?: unknown },
): Promise<FollowUpResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };

  const title = followUpTitleSchema.safeParse(input.title ?? "");
  if (!title.success) {
    return {
      ok: false,
      error: "invalid",
      message: title.error.issues[0]?.message ?? "Invalid title",
    };
  }
  const body = followUpBodySchema.safeParse(input.body ?? null);
  if (!body.success) {
    return {
      ok: false,
      error: "invalid",
      message: body.error.issues[0]?.message ?? "Invalid details",
    };
  }
  const due = dueDateSchema.safeParse(input.dueDate ?? "");
  if (!due.success) {
    return {
      ok: false,
      error: "invalid_due_date",
      message: due.error.issues[0]?.message ?? "Invalid due date",
    };
  }
  const assignee = await resolveAssigneeId(input.assigneeId);
  if (!assignee.ok) {
    return { ok: false, error: "invalid_assignee", message: assignee.message };
  }
  // Empty assignee means "same as lead owner" per the form contract.
  const effectiveAssigneeId = assignee.id ?? lead.assignedToId;

  try {
    const followUp = await createFollowUp({
      leadId,
      creatorId: actor.id,
      assigneeId: effectiveAssigneeId,
      title: title.data,
      body: body.data ?? null,
      dueDate: due.data,
    });
    await recordLeadActivity({
      type: "follow_up_created",
      leadId,
      actorId: actor.id,
      metadata: {
        followUpId: followUp.id,
        title: followUp.title,
        dueDate: followUp.dueDate,
        assigneeId: followUp.assigneeId,
      },
    });
    return { ok: true, followUp };
  } catch (error) {
    console.error("[crm] follow-up create failed", error);
    return { ok: false, error: "invalid" };
  }
}

export async function editLeadFollowUp(
  actor: CrmUser | null,
  followUpId: string,
  input: { title?: unknown; body?: unknown; dueDate?: unknown; assigneeId?: unknown },
): Promise<FollowUpResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const existing = await getFollowUp(followUpId);
  if (!existing) return { ok: false, error: "not_found" };

  const patch: {
    title?: string;
    body?: string | null;
    dueDate?: string;
    assigneeId?: string | null;
  } = {};

  if (input.title !== undefined) {
    const title = followUpTitleSchema.safeParse(input.title);
    if (!title.success) {
      return {
        ok: false,
        error: "invalid",
        message: title.error.issues[0]?.message ?? "Invalid title",
      };
    }
    patch.title = title.data;
  }
  if (input.body !== undefined) {
    const body = followUpBodySchema.safeParse(input.body);
    if (!body.success) {
      return {
        ok: false,
        error: "invalid",
        message: body.error.issues[0]?.message ?? "Invalid details",
      };
    }
    patch.body = body.data ?? null;
  }
  if (input.dueDate !== undefined) {
    const due = dueDateSchema.safeParse(input.dueDate);
    if (!due.success) {
      return {
        ok: false,
        error: "invalid_due_date",
        message: due.error.issues[0]?.message ?? "Invalid due date",
      };
    }
    patch.dueDate = due.data;
  }
  if (input.assigneeId !== undefined) {
    const assignee = await resolveAssigneeId(input.assigneeId);
    if (!assignee.ok) {
      return { ok: false, error: "invalid_assignee", message: assignee.message };
    }
    patch.assigneeId = assignee.id;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, followUp: existing };
  }

  try {
    const followUp = await updateFollowUp(followUpId, patch);
    await recordLeadActivity({
      type: "follow_up_updated",
      leadId: existing.leadId,
      actorId: actor.id,
      metadata: {
        followUpId,
        title: followUp.title,
        dueDate: followUp.dueDate,
        assigneeId: followUp.assigneeId,
        fields: Object.keys(patch),
      },
    });
    return { ok: true, followUp };
  } catch (error) {
    console.error("[crm] follow-up update failed", error);
    return { ok: false, error: "invalid" };
  }
}

export async function completeLeadFollowUp(
  actor: CrmUser | null,
  followUpId: string,
  completed: boolean,
): Promise<FollowUpResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const existing = await getFollowUp(followUpId);
  if (!existing) return { ok: false, error: "not_found" };

  try {
    const followUp = await updateFollowUp(followUpId, {
      completedAt: completed ? new Date() : null,
    });
    await recordLeadActivity({
      type: completed ? "follow_up_completed" : "follow_up_updated",
      leadId: existing.leadId,
      actorId: actor.id,
      metadata: {
        followUpId,
        title: followUp.title,
        completed,
      },
    });
    return { ok: true, followUp };
  } catch (error) {
    console.error("[crm] follow-up complete failed", error);
    return { ok: false, error: "invalid" };
  }
}

export async function listFollowUps(
  actor: CrmUser | null,
  leadId: string,
): Promise<
  { ok: true; followUps: FollowUpWithRelations[] } | { ok: false; error: FollowUpErrorCode }
> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };
  return { ok: true, followUps: await listLeadFollowUps(leadId) };
}

// ── Proposals (Phase 7) ────────────────────────────────────────────────

export type ProposalErrorCode =
  "unauthorized" | "not_found" | "invalid" | "invalid_transition" | "immutable";

export type ProposalResult =
  | { ok: true; proposal: ProposalWithCreator }
  | { ok: false; error: ProposalErrorCode; message?: string };

export type ProposalListResult =
  | { ok: true; proposals: ProposalWithCreator[] }
  | { ok: false; error: ProposalErrorCode; message?: string };

export type WinFromProposalResult =
  | { ok: true; status: string; proposal: ProposalWithCreator }
  | { ok: false; error: ProposalErrorCode | "invalid_transition"; message?: string };

const proposalTitleSchema = z
  .string()
  .max(200, "Title is too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Title cannot be empty").max(200, "Title is too long"));

const proposalNotesSchema = z
  .string()
  .max(4000, "Notes are too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(4000))
  .optional()
  .nullable();

const proposalCurrencySchema = z
  .string()
  .refine((v) => isProposalCurrency(v), "Currency must be GBP, USD, or EUR");

const proposalValidUntilSchema = z
  .string()
  .refine(isValidDateString, "Due date must be a valid YYYY-MM-DD date");

const lineDescriptionSchema = z
  .string()
  .max(200, "Line description is too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Line description cannot be empty").max(200));

/** Quantity as integer string from form input. */
const lineQuantitySchema = z
  .string()
  .regex(/^\d{1,7}$/, "Quantity must be a whole number")
  .transform((v) => Number(v))
  .pipe(z.number().int().min(1).max(1_000_000));

/** Unit price as decimal major string — converted server-side to minor units. */
const lineUnitPriceSchema = z
  .string()
  .max(20, "Unit price is too long")
  .transform((raw, ctx) => {
    const minor = parseMoneyToMinor(raw);
    if (minor === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unit price must be a non-negative amount like 1234.56",
      });
      return z.NEVER;
    }
    return minor;
  });

export interface ProposalFormLineInput {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
}

function parseProposalContent(input: {
  title?: unknown;
  currency?: unknown;
  validUntil?: unknown;
  notes?: unknown;
  lines?: unknown;
}):
  | {
      ok: true;
      title: string;
      currency: string;
      validUntil: string;
      notes: string | null;
      lines: ProposalLine[];
      subtotalMinor: number;
      totalMinor: number;
    }
  | { ok: false; message: string } {
  const title = proposalTitleSchema.safeParse(input.title ?? "");
  if (!title.success) {
    return { ok: false, message: title.error.issues[0]?.message ?? "Invalid title" };
  }
  const currency = proposalCurrencySchema.safeParse(input.currency ?? "GBP");
  if (!currency.success) {
    return { ok: false, message: currency.error.issues[0]?.message ?? "Invalid currency" };
  }
  const validUntil = proposalValidUntilSchema.safeParse(input.validUntil ?? "");
  if (!validUntil.success) {
    return {
      ok: false,
      message: validUntil.error.issues[0]?.message ?? "Invalid valid-until date",
    };
  }
  const notes = proposalNotesSchema.safeParse(input.notes ?? null);
  if (!notes.success) {
    return { ok: false, message: notes.error.issues[0]?.message ?? "Invalid notes" };
  }

  if (!Array.isArray(input.lines)) {
    return { ok: false, message: "Line items are required." };
  }
  const rawLines = input.lines as ProposalFormLineInput[];
  if (rawLines.length === 0) {
    return { ok: false, message: "Add at least one line item." };
  }
  const lines: ProposalLine[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] ?? {};
    const description = lineDescriptionSchema.safeParse(raw.description ?? "");
    if (!description.success) {
      return {
        ok: false,
        message: `Line ${i + 1}: ${description.error.issues[0]?.message ?? "invalid description"}`,
      };
    }
    const quantity = lineQuantitySchema.safeParse(String(raw.quantity ?? ""));
    if (!quantity.success) {
      return {
        ok: false,
        message: `Line ${i + 1}: ${quantity.error.issues[0]?.message ?? "invalid quantity"}`,
      };
    }
    const unitPrice = lineUnitPriceSchema.safeParse(String(raw.unitPrice ?? ""));
    if (!unitPrice.success) {
      return {
        ok: false,
        message: `Line ${i + 1}: ${unitPrice.error.issues[0]?.message ?? "invalid unit price"}`,
      };
    }
    lines.push({
      description: description.data,
      quantity: quantity.data,
      unitPriceMinor: unitPrice.data,
    });
  }

  const totals = computeProposalTotals(lines);
  if (!totals.ok) {
    return { ok: false, message: totals.error };
  }

  return {
    ok: true,
    title: title.data,
    currency: currency.data,
    validUntil: validUntil.data,
    notes: notes.data ?? null,
    lines,
    subtotalMinor: totals.subtotalMinor,
    totalMinor: totals.totalMinor,
  };
}

function proposalActivityMetadata(proposal: ProposalWithCreator): Record<string, unknown> {
  return {
    proposalId: proposal.id,
    version: proposal.version,
    title: proposal.title,
    totalMinor: proposal.totalMinor,
    currency: proposal.currency,
  };
}

export async function createLeadProposal(
  actor: CrmUser | null,
  leadId: string,
  input: {
    title?: unknown;
    currency?: unknown;
    validUntil?: unknown;
    notes?: unknown;
    lines?: unknown;
  },
): Promise<ProposalResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (!cuidLike.test(leadId)) return { ok: false, error: "not_found" };
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };

  const content = parseProposalContent(input);
  if (!content.ok) return { ok: false, error: "invalid", message: content.message };

  try {
    const proposal = await createProposalWithNextVersion({
      leadId,
      createdById: actor.id,
      title: content.title,
      currency: content.currency,
      validUntil: content.validUntil,
      notes: content.notes,
      lines: content.lines,
      subtotalMinor: content.subtotalMinor,
      totalMinor: content.totalMinor,
    });
    await recordLeadActivity({
      type: "proposal_created",
      leadId,
      actorId: actor.id,
      metadata: proposalActivityMetadata(proposal),
    });
    return { ok: true, proposal };
  } catch (error) {
    console.error("[crm] proposal create failed", error);
    return { ok: false, error: "invalid", message: "Proposal could not be saved." };
  }
}

export async function editLeadProposal(
  actor: CrmUser | null,
  proposalId: string,
  input: {
    title?: unknown;
    currency?: unknown;
    validUntil?: unknown;
    notes?: unknown;
    lines?: unknown;
    /** Accepted and ignored — totals are always recomputed server-side. */
    totalMinor?: unknown;
    subtotalMinor?: unknown;
  },
): Promise<ProposalResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (!cuidLike.test(proposalId)) return { ok: false, error: "not_found" };
  const existing = await getProposal(proposalId);
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.status !== "draft") {
    return {
      ok: false,
      error: "immutable",
      message: "Sent proposals cannot be edited. Create a new version instead.",
    };
  }

  const content = parseProposalContent(input);
  if (!content.ok) return { ok: false, error: "invalid", message: content.message };

  try {
    const proposal = await updateDraftProposalContent(proposalId, {
      title: content.title,
      currency: content.currency,
      validUntil: content.validUntil,
      notes: content.notes,
      lines: content.lines,
      subtotalMinor: content.subtotalMinor,
      totalMinor: content.totalMinor,
    });
    await recordLeadActivity({
      type: "proposal_updated",
      leadId: existing.leadId,
      actorId: actor.id,
      metadata: proposalActivityMetadata(proposal),
    });
    return { ok: true, proposal };
  } catch (error) {
    console.error("[crm] proposal update failed", error);
    return { ok: false, error: "invalid", message: "Proposal could not be updated." };
  }
}

export async function changeProposalStatus(
  actor: CrmUser | null,
  proposalId: string,
  toStatus: string,
): Promise<ProposalResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (!cuidLike.test(proposalId)) return { ok: false, error: "not_found" };
  if (!isProposalStatus(toStatus)) {
    return { ok: false, error: "invalid", message: "Unknown proposal status." };
  }

  const existing = await getProposal(proposalId);
  if (!existing) return { ok: false, error: "not_found" };
  const from = existing.status as ProposalStatus;
  if (!canProposalTransition(from, toStatus)) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Cannot move proposal from ${from} to ${toStatus}.`,
    };
  }

  // Duplicate send/accept/decline is a no-op rejection (idempotent protection).
  if (existing.status === toStatus) {
    return { ok: false, error: "invalid_transition", message: "Proposal already has that status." };
  }

  try {
    const now = new Date();
    const proposal = await updateProposalStatusRow(
      proposalId,
      toStatus as "sent" | "accepted" | "declined",
      {
        sentAt: toStatus === "sent" ? now : undefined,
        acceptedAt: toStatus === "accepted" ? now : undefined,
        declinedAt: toStatus === "declined" ? now : undefined,
      },
    );

    const activityType =
      toStatus === "sent"
        ? "proposal_sent"
        : toStatus === "accepted"
          ? "proposal_accepted"
          : "proposal_declined";

    await recordLeadActivity({
      type: activityType,
      leadId: existing.leadId,
      actorId: actor.id,
      metadata: { ...proposalActivityMetadata(proposal), from, to: toStatus },
    });

    // The CRM row stays a state marker only — it never records that an
    // email reached anyone. The notification reports its own delivery
    // outcome and can never fail or roll back this transition.
    await notifyProposalStatusChange(proposal, existing.leadId, toStatus);

    // "Mark sent" therefore never claims an email was delivered.
    return { ok: true, proposal };
  } catch (error) {
    console.error("[crm] proposal status change failed", error);
    return { ok: false, error: "invalid", message: "Proposal status could not be updated." };
  }
}

/**
 * Explicit Accept & Win — converts the lead to `won` only when a proposal
 * is accepted AND the lead status can legally transition to won.
 * Never inferred from proposal acceptance alone.
 */
export async function winLeadFromAcceptedProposal(
  actor: CrmUser | null,
  leadId: string,
  proposalId: string,
): Promise<WinFromProposalResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (!cuidLike.test(leadId) || !cuidLike.test(proposalId)) {
    return { ok: false, error: "not_found" };
  }

  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };

  const proposal = await getProposal(proposalId);
  if (!proposal || proposal.leadId !== leadId) {
    return { ok: false, error: "not_found", message: "Proposal not found for this lead." };
  }
  if (proposal.status !== "accepted") {
    return {
      ok: false,
      error: "invalid_transition",
      message: "Only an accepted proposal can win this lead.",
    };
  }
  if (lead.status === "won") {
    return { ok: false, error: "invalid_transition", message: "Lead is already won." };
  }
  if (!canTransition(lead.status as LeadPipelineStatus, "won")) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Lead cannot move from ${lead.status} to won. Qualify the lead first.`,
    };
  }

  try {
    const fromStatus = lead.status;
    const updated = await updateLeadStatus(leadId, "won");
    try {
      await recordLeadActivity({
        type: "status_change",
        leadId,
        actorId: actor.id,
        fromStatus,
        toStatus: "won",
      });
      await recordLeadActivity({
        type: "proposal_won",
        leadId,
        actorId: actor.id,
        fromStatus,
        toStatus: "won",
        metadata: proposalActivityMetadata(proposal),
      });
    } catch (error) {
      console.error("[crm] failed to record win activity", error);
    }
    return { ok: true, status: updated.status, proposal };
  } catch (error) {
    if (error instanceof Error && error.name === "StatusTransitionError") {
      return {
        ok: false,
        error: "invalid_transition",
        message: "That status change is not allowed.",
      };
    }
    console.error("[crm] accept and win failed", error);
    return { ok: false, error: "invalid", message: "Could not mark lead as won." };
  }
}

export async function listLeadProposalsForActor(
  actor: CrmUser | null,
  leadId: string,
): Promise<ProposalListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };
  return { ok: true, proposals: await listLeadProposals(leadId) };
}

// ── CRM user management (admin-only) ────────────────────────────────────

/** Row shape for /admin/users — never includes passwordHash. */
export interface ManagedCrmUser {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type UserManagementErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_input"
  | "invalid_role"
  | "email_taken"
  | "self_target"
  | "last_admin"
  | "invalid";

export type CrmUserListResult =
  { ok: true; users: ManagedCrmUser[] } | { ok: false; error: "unauthorized" };

export type CrmUserResult =
  | { ok: true; user: ManagedCrmUser }
  | { ok: false; error: UserManagementErrorCode; message?: string };

const managedNameSchema = z
  .string()
  .trim()
  .max(120, "Name is too long")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Name is required").max(120, "Name is too long"));

/** Creation passwords carry a floor the login input never had. */
const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(200);

/**
 * Strip a row to the wire-safe shape. The repository returns full
 * `AdminUser` rows (passwordHash included) — that field never leaves this
 * module, no matter which call site returns the user.
 */
function toManagedUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}): ManagedCrmUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/**
 * Load a user-management target: cuid-shaped id, row exists, and the row is
 * a CRM login. Client-portal rows are invisible here — provisioning those
 * belongs to `portal.ts`, never to role/active toggles.
 */
async function getManagedUser(userId: unknown): Promise<ManagedCrmUser | null> {
  if (typeof userId !== "string" || !cuidLike.test(userId)) return null;
  const row = await findAdminById(userId);
  if (!row || !isCrmRole(row.role)) return null;
  return toManagedUser(row);
}

/** Every CRM login (active or not), for admins only. */
export async function listCrmUsersForActor(actor: CrmUser | null): Promise<CrmUserListResult> {
  if (!actor || !canManageUsers(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, users: await listCrmUserRows() };
}

/**
 * Create a CRM login (`admin` / `staff`) from raw form values. Role is
 * accepted only as a CRM role — a `client` portal row can never be minted
 * through this surface — and the password is hashed before it reaches the
 * row, never logged, never echoed back.
 */
export async function createCrmUser(
  actor: CrmUser | null,
  rawInput: { name?: unknown; email?: unknown; password?: unknown; role?: unknown },
): Promise<CrmUserResult> {
  if (!actor || !canManageUsers(actor.role)) return { ok: false, error: "unauthorized" };

  const role: CrmRole | null =
    typeof rawInput.role === "string" && isCrmRole(rawInput.role) ? rawInput.role : null;
  if (!role) {
    return { ok: false, error: "invalid_role", message: "Role must be admin or staff." };
  }

  const name = managedNameSchema.safeParse(rawInput.name ?? "");
  const email = emailSchema.safeParse(rawInput.email);
  const password = newPasswordSchema.safeParse(rawInput.password);
  if (!name.success || !email.success || !password.success) {
    const message = !name.success
      ? (name.error.issues[0]?.message ?? "Enter a name.")
      : !email.success
        ? (email.error.issues[0]?.message ?? "Enter a valid email.")
        : !password.success
          ? (password.error.issues[0]?.message ?? "Password is too short.")
          : "Enter a name, a valid email and a password.";
    return { ok: false, error: "invalid_input", message };
  }

  try {
    const collision = await findAdminByEmail(email.data);
    if (collision) {
      return {
        ok: false,
        error: "email_taken",
        message: "That email is already used by another account.",
      };
    }
    const created = await createAdminUser({
      email: email.data,
      name: name.data,
      passwordHash: hashPassword(password.data),
      role,
    });
    return { ok: true, user: toManagedUser(created) };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    // Unique race: someone claimed this email between our read and the write.
    if (code === "P2002") {
      return {
        ok: false,
        error: "email_taken",
        message: "That email is already used by another account.",
      };
    }
    console.error("[auth] CRM user create failed", error);
    return { ok: false, error: "invalid", message: "The account could not be created." };
  }
}

/**
 * Flip a CRM login between `admin` and `staff`. The invariant that at least
 * one active admin remains is enforced here: demoting the final active
 * admin would lock every future admin-only action out of the CRM.
 */
export async function changeCrmUserRole(
  actor: CrmUser | null,
  userId: unknown,
  rawRole: unknown,
): Promise<CrmUserResult> {
  if (!actor || !canManageUsers(actor.role)) return { ok: false, error: "unauthorized" };

  const target = await getManagedUser(userId);
  if (!target) return { ok: false, error: "not_found" };

  if (typeof rawRole !== "string" || !isCrmRole(rawRole)) {
    return { ok: false, error: "invalid_role", message: "Role must be admin or staff." };
  }
  if (target.role === rawRole) return { ok: true, user: target };

  const demotingAdmin = target.role === "admin" && rawRole !== "admin";
  if (demotingAdmin && target.active && (await countActiveAdmins()) <= 1) {
    return {
      ok: false,
      error: "last_admin",
      message: "There must always be at least one active admin.",
    };
  }

  try {
    const user = await updateCrmUserRow(target.id, { role: rawRole });
    return { ok: true, user: toManagedUser(user) };
  } catch (error) {
    console.error("[auth] CRM user role change failed", error);
    return { ok: false, error: "invalid", message: "The role could not be changed." };
  }
}

/**
 * Activate or deactivate a CRM login. Deactivation is the safe direction —
 * it never targets the acting admin (self lockout) and never removes the
 * final active admin, and it revokes every live session so the cookie dies
 * with the account. Reactivation is a plain row flip.
 */
export async function setCrmUserActive(
  actor: CrmUser | null,
  userId: unknown,
  active: unknown,
): Promise<CrmUserResult> {
  if (!actor || !canManageUsers(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof active !== "boolean") {
    return { ok: false, error: "invalid_input", message: "Active must be true or false." };
  }

  const target = await getManagedUser(userId);
  if (!target) return { ok: false, error: "not_found" };

  if (!active) {
    if (target.id === actor.id) {
      return {
        ok: false,
        error: "self_target",
        message: "You cannot deactivate your own account.",
      };
    }
    if (target.role === "admin" && target.active && (await countActiveAdmins()) <= 1) {
      return {
        ok: false,
        error: "last_admin",
        message: "There must always be at least one active admin.",
      };
    }
  }
  if (target.active === active) return { ok: true, user: target };

  try {
    const user = await updateCrmUserRow(target.id, { active });
    if (!active) await revokeSessionsForUserId(target.id);
    return { ok: true, user: toManagedUser(user) };
  } catch (error) {
    console.error("[auth] CRM user active change failed", error);
    return { ok: false, error: "invalid", message: "The account status could not be changed." };
  }
}

export { PROPOSAL_CURRENCIES };
