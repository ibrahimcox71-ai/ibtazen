import { z } from "zod";
import {
  hashPassword,
  hashSessionToken,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
} from "./auth/password";
import { checkLoginRateLimit } from "./auth/login-rate-limit";
import { canAccessPortal, canManageUsers, type CrmUser, type PortalUser } from "./auth/rbac";
import { notifyPortalAccessProvisioned, notifyProposalStatusChange } from "./crm-notifications";
import {
  answerProposalStatusRow,
  createAdminUser,
  findAdminByEmail,
  findAdminById,
  findPortalUserByClientId,
  getClient,
  getInvoice,
  getProject,
  getProposal,
  listInvoicesByClientId,
  listLeadProposals,
  listProjectsByClientId,
  parseProposalLines,
  recordLeadActivity,
  revokeOtherSessionsForUser,
  revokeSessionsForUserId,
  setAdminUserPassword,
  updatePortalUserCredentials,
  type Client,
  type InvoiceWithRelations,
  type ProjectWithRelations,
  type ProposalWithCreator,
} from "./repository";
import type { ProposalLine } from "./domain";

/**
 * Client Portal service — the read-only, client-scoped counterpart to the
 * CRM services. Three halves:
 *
 * 1. Provisioning (admin-only): create/reset the `role = "client"` login
 *    linked to a Client row. Never exposed to the portal principal itself.
 * 2. Portal reads: every query is scoped by `actor.clientId` resolved from
 *    the session on the server — nothing about ownership comes from the
 *    browser. Internal-only material (draft proposals/invoices, CRM
 *    activity, internal notes, actor identities) is never projected.
 * 3. Self-service: the signed-in portal user may change their own password
 *    and answer a **sent** proposal (`respondToPortalProposal`). Those are the
 *    only mutations a portal principal can perform — neither writes client
 *    profile data, and the proposal answer is scoped to the session's Client.
 */

// Same cuid-shaped guard as clients.ts / auth service.
const cuidLike = /^[c][a-z0-9]{20,}$/i;

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.string().regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, "Enter a valid email"))
  .transform((v) => v.toLowerCase());

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(200);

// ── Portal access provisioning (admin side) ─────────────────────────────

export interface PortalAccess {
  provisioned: boolean;
  email?: string;
  active?: boolean;
  createdAt?: Date;
}

export type PortalAccessErrorCode =
  "unauthorized" | "not_found" | "invalid_input" | "email_taken" | "invalid";

/**
 * Result of the optional invite email. `requested` mirrors what the admin
 * asked for; `delivered` is the transport's honest answer — a console
 * transport reports `false`, never a pretend send.
 */
export interface PortalInviteResult {
  requested: boolean;
  delivered: boolean;
}

export type PortalAccessResult =
  | { ok: true; access: PortalAccess; invite?: PortalInviteResult }
  | { ok: false; error: PortalAccessErrorCode; message?: string };

/** Opt-in flag from the admin form — only an explicit true sends anything. */
function wantsInvite(value: unknown): boolean {
  return value === true || value === "on" || value === "true" || value === "yes";
}

function toAccess(user: { email: string; active: boolean; createdAt: Date }): PortalAccess {
  return { provisioned: true, email: user.email, active: user.active, createdAt: user.createdAt };
}

/** Current portal login state for a Client — CRM actors with user-management rights. */
export async function getPortalAccessForActor(
  actor: CrmUser | null,
  clientId: string,
): Promise<PortalAccessResult> {
  if (!actor || !canManageUsers(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof clientId !== "string" || !cuidLike.test(clientId)) {
    return { ok: false, error: "not_found" };
  }
  const client = await getClient(clientId);
  if (!client) return { ok: false, error: "not_found" };
  const existing = await findPortalUserByClientId(clientId);
  return { ok: true, access: existing ? toAccess(existing) : { provisioned: false } };
}

/**
 * Create or reset the portal login for a Client. Admin-only
 * (`canManageUsers`): provisioning is user management, not a CRM everyday
 * action. A password reset revokes every live session of that login.
 * The `clientId` unique constraint guarantees one login per Client; a
 * colliding email (owned by any other user) is rejected as `email_taken`.
 */
export async function provisionPortalAccess(
  actor: CrmUser | null,
  clientId: string,
  rawInput: { email?: unknown; password?: unknown; sendInvite?: unknown },
): Promise<PortalAccessResult> {
  if (!actor || !canManageUsers(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof clientId !== "string" || !cuidLike.test(clientId)) {
    return { ok: false, error: "not_found" };
  }

  const parsedEmail = emailSchema.safeParse(rawInput.email);
  const parsedPassword = passwordSchema.safeParse(rawInput.password);
  if (!parsedEmail.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsedPassword.success
        ? (parsedEmail.error.issues[0]?.message ?? "Enter a valid email.")
        : "Enter a valid email and a password of at least 12 characters.",
    };
  }
  if (!parsedPassword.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsedPassword.error.issues[0]?.message ?? "Password is too short.",
    };
  }

  const client = await getClient(clientId);
  if (!client) return { ok: false, error: "not_found" };

  const passwordHash = hashPassword(parsedPassword.data);
  const existing = await findPortalUserByClientId(clientId);
  const inviteRequested = wantsInvite(rawInput.sendInvite);

  /** Invite is opt-in; the password only leaves the server when asked for. */
  const sendInvite = async (email: string): Promise<PortalInviteResult> => {
    if (!inviteRequested) return { requested: false, delivered: false };
    const result = await notifyPortalAccessProvisioned({
      name: client.name,
      email,
      password: parsedPassword.data,
    });
    return { requested: true, delivered: result.delivered };
  };

  try {
    if (existing) {
      await revokeSessionsForUserId(existing.id);
      const updated = await updatePortalUserCredentials(existing.id, {
        email: parsedEmail.data,
        passwordHash,
        active: true,
      });
      return {
        ok: true,
        access: toAccess(updated),
        invite: await sendInvite(parsedEmail.data),
      };
    }

    const collision = await findAdminByEmail(parsedEmail.data);
    if (collision) {
      return {
        ok: false,
        error: "email_taken",
        message: "That email is already in use by another account.",
      };
    }

    const created = await createAdminUser({
      email: parsedEmail.data,
      name: client.name,
      passwordHash,
      role: "client",
      clientId,
    });
    return { ok: true, access: toAccess(created), invite: await sendInvite(parsedEmail.data) };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    // Unique race: another admin provisioned this client (clientId) or
    // claimed this email between our reads and the write.
    if (code === "P2002") {
      return {
        ok: false,
        error: "email_taken",
        message: "That email is already in use by another account.",
      };
    }
    console.error("[portal] provisioning failed", error);
    return { ok: false, error: "invalid", message: "Could not save portal access." };
  }
}

// ── Self-service password change (portal side) ──────────────────────────

const currentPasswordSchema = z.string().min(1, "Enter your current password.").max(200);

export type ChangePasswordErrorCode =
  "unauthorized" | "invalid_input" | "invalid_password" | "rate_limited" | "invalid";

export type ChangePasswordResult =
  { ok: true } | { ok: false; error: ChangePasswordErrorCode; message?: string };

/**
 * Change the signed-in portal user's own password. The principal comes from
 * the session (never the form), the current password is verified against
 * the stored hash before anything is written, and every *other* session of
 * that login is revoked so a stolen cookie dies with the old password — the
 * session making the change stays alive. Failed attempts run through the
 * same IP+email login throttle as `loginPortal`.
 */
export async function changePortalPassword(
  actor: PortalUser | null,
  rawInput: { currentPassword?: unknown; newPassword?: unknown },
  context: { ip: string; currentSessionToken?: string | null },
): Promise<ChangePasswordResult> {
  if (!actor || !canAccessPortal(actor.role) || !actor.clientId) {
    return { ok: false, error: "unauthorized" };
  }

  const parsedCurrent = currentPasswordSchema.safeParse(rawInput.currentPassword);
  const parsedNew = passwordSchema.safeParse(rawInput.newPassword);
  if (!parsedCurrent.success || !parsedNew.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: !parsedCurrent.success
        ? (parsedCurrent.error.issues[0]?.message ?? "Enter your current password.")
        : (parsedNew.error?.issues[0]?.message ?? `Use at least ${PASSWORD_MIN_LENGTH} characters`),
    };
  }
  if (parsedNew.data === parsedCurrent.data) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Choose a password you are not currently using.",
    };
  }

  try {
    checkLoginRateLimit(context.ip, actor.email);
  } catch {
    return {
      ok: false,
      error: "rate_limited",
      message: "Too many attempts. Try again in a few minutes.",
    };
  }

  try {
    const user = await findAdminById(actor.id);
    if (!user || !user.active || !user.clientId || user.clientId !== actor.clientId) {
      return { ok: false, error: "unauthorized" };
    }
    if (!verifyPassword(parsedCurrent.data, user.passwordHash)) {
      return {
        ok: false,
        error: "invalid_password",
        message: "That current password is not correct.",
      };
    }

    await setAdminUserPassword(user.id, hashPassword(parsedNew.data));
    const keep = context.currentSessionToken
      ? hashSessionToken(context.currentSessionToken)
      : undefined;
    await revokeOtherSessionsForUser(user.id, keep);
    return { ok: true };
  } catch (error) {
    console.error("[portal] password change failed", error);
    return { ok: false, error: "invalid", message: "The new password could not be saved." };
  }
}

// ── Portal reads (client side) ──────────────────────────────────────────

export type PortalErrorCode = "unauthorized" | "not_found";

/**
 * Load the Client the session is scoped to. Authorization first, then a
 * server-side re-read: a deleted Client (or a non-portal role) yields
 * `unauthorized`, never a partial principal.
 */
async function loadScopedClient(actor: PortalUser | null): Promise<Client | null> {
  if (!actor || !canAccessPortal(actor.role) || !actor.clientId) return null;
  const client = await getClient(actor.clientId);
  if (!client || client.id !== actor.clientId) return null;
  return client;
}

// Projected DTOs — safe for the portal wire. Internal actors, lead
// pipeline data, notes and activities are deliberately absent.

export interface PortalProposal {
  id: string;
  version: number;
  status: string;
  title: string;
  currency: string;
  validUntil: string;
  notes: string | null;
  lines: ProposalLine[];
  subtotalMinor: number;
  totalMinor: number;
  sentAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
}

export interface PortalProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  targetEndDate: string | null;
  contractTitle: string;
  contractStatus: string;
  createdAt: Date;
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  title: string;
  lines: ProposalLine[];
  subtotalMinor: number;
  totalMinor: number;
  contractTitle: string;
  createdAt: Date;
}

export interface PortalClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organizationName: string | null;
  createdAt: Date;
}

export interface PortalOverview {
  client: PortalClientProfile;
  counts: { proposals: number; projects: number; invoices: number };
  /** Sum of issued-but-unpaid invoices, grouped by currency (minor units). */
  outstanding: Array<{ currency: string; minor: number }>;
}

function toProfile(client: Client): PortalClientProfile {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    organizationName: client.organizationName,
    createdAt: client.createdAt,
  };
}

function toProposal(row: ProposalWithCreator): PortalProposal {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    title: row.title,
    currency: row.currency,
    validUntil: row.validUntil,
    notes: row.notes,
    lines: parseProposalLines(row.lines),
    subtotalMinor: row.subtotalMinor,
    totalMinor: row.totalMinor,
    sentAt: row.sentAt,
    acceptedAt: row.acceptedAt,
    declinedAt: row.declinedAt,
    createdAt: row.createdAt,
  };
}

function toProject(row: ProjectWithRelations): PortalProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.startDate,
    targetEndDate: row.targetEndDate,
    contractTitle: row.contract.title,
    contractStatus: row.contract.status,
    createdAt: row.createdAt,
  };
}

function toInvoice(row: InvoiceWithRelations): PortalInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    currency: row.currency,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    title: row.title,
    lines: parseProposalLines(row.lines),
    subtotalMinor: row.subtotalMinor,
    totalMinor: row.totalMinor,
    contractTitle: row.contract.title,
    createdAt: row.createdAt,
  };
}

/** Drafts are internal work-in-progress — a client never sees them. */
const isClientVisibleProposal = (row: ProposalWithCreator) => row.status !== "draft";
const isClientVisibleInvoice = (row: InvoiceWithRelations) => row.status !== "draft";

export type PortalOverviewResult =
  { ok: true; overview: PortalOverview } | { ok: false; error: PortalErrorCode };

export async function getPortalOverview(actor: PortalUser | null): Promise<PortalOverviewResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };

  const [proposals, projects, invoices] = await Promise.all([
    listLeadProposals(client.leadId),
    listProjectsByClientId(client.id),
    listInvoicesByClientId(client.id),
  ]);

  const outstandingByCurrency = new Map<string, number>();
  for (const invoice of invoices) {
    if (!isClientVisibleInvoice(invoice) || invoice.status !== "sent") continue;
    outstandingByCurrency.set(
      invoice.currency,
      (outstandingByCurrency.get(invoice.currency) ?? 0) + invoice.totalMinor,
    );
  }

  return {
    ok: true,
    overview: {
      client: toProfile(client),
      counts: {
        proposals: proposals.filter(isClientVisibleProposal).length,
        projects: projects.length,
        invoices: invoices.filter(isClientVisibleInvoice).length,
      },
      outstanding: [...outstandingByCurrency]
        .map(([currency, minor]) => ({ currency, minor }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
    },
  };
}

export type PortalProposalListResult =
  { ok: true; proposals: PortalProposal[] } | { ok: false; error: PortalErrorCode };

export async function listPortalProposals(
  actor: PortalUser | null,
): Promise<PortalProposalListResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };
  const rows = await listLeadProposals(client.leadId);
  return { ok: true, proposals: rows.filter(isClientVisibleProposal).map(toProposal) };
}

export type PortalProposalResult =
  { ok: true; proposal: PortalProposal } | { ok: false; error: PortalErrorCode };

/** Single proposal, ownership-checked against the session's Client. */
export async function getPortalProposal(
  actor: PortalUser | null,
  proposalId: string,
): Promise<PortalProposalResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };
  if (typeof proposalId !== "string" || !cuidLike.test(proposalId)) {
    return { ok: false, error: "not_found" };
  }
  const row = await getProposal(proposalId);
  // Proposals hang off the Client's originating Lead — that link is the
  // ownership boundary (IDOR guard), checked after the fetch.
  if (!row || row.leadId !== client.leadId || !isClientVisibleProposal(row)) {
    return { ok: false, error: "not_found" };
  }
  return { ok: true, proposal: toProposal(row) };
}

// ── Portal-side proposal response (Phase 21) ────────────────────────────

const responseSchema = z.enum(["accept", "decline"]);

export type PortalProposalResponseErrorCode =
  "unauthorized" | "not_found" | "invalid_input" | "invalid_transition" | "invalid";

export type PortalProposalResponseResult =
  | { ok: true; proposal: PortalProposal }
  | { ok: false; error: PortalProposalResponseErrorCode; message?: string };

/**
 * Accept or decline a **sent** proposal — the second portal-side write (after
 * `changePortalPassword`). The principal comes from the session, the proposal
 * is re-read and ownership-checked against the session's Client (via `leadId`,
 * the IDOR guard), and only a `sent` row can move: drafts are never visible
 * here and an answered proposal is terminal. The write is a compare-and-swap
 * on `status = "sent"`, so two racing responses cannot both win.
 *
 * Accepting marks the proposal, records the activity under the portal user,
 * and notifies the CRM inbox. It never wins the lead, opens a contract, or
 * emails a password — those stay explicit CRM actions.
 */
export async function respondToPortalProposal(
  actor: PortalUser | null,
  proposalId: string,
  rawDecision: unknown,
): Promise<PortalProposalResponseResult> {
  const client = await loadScopedClient(actor);
  if (!client || !actor) return { ok: false, error: "unauthorized" };

  const decision = responseSchema.safeParse(rawDecision);
  if (!decision.success) {
    return { ok: false, error: "invalid_input", message: "Choose accept or decline." };
  }
  if (typeof proposalId !== "string" || !cuidLike.test(proposalId)) {
    return { ok: false, error: "not_found" };
  }

  const existing = await getProposal(proposalId);
  if (!existing || existing.leadId !== client.leadId || !isClientVisibleProposal(existing)) {
    return { ok: false, error: "not_found" };
  }
  if (existing.status !== "sent") {
    return {
      ok: false,
      error: "invalid_transition",
      message: "This proposal has already been answered.",
    };
  }

  const toStatus: "accepted" | "declined" = decision.data === "accept" ? "accepted" : "declined";

  try {
    const now = new Date();
    const proposal = await answerProposalStatusRow(proposalId, toStatus, {
      acceptedAt: toStatus === "accepted" ? now : undefined,
      declinedAt: toStatus === "declined" ? now : undefined,
    });
    if (!proposal) {
      // Lost the race: someone else answered it between our read and write.
      return {
        ok: false,
        error: "invalid_transition",
        message: "This proposal has already been answered.",
      };
    }

    await recordLeadActivity({
      type: toStatus === "accepted" ? "proposal_accepted" : "proposal_declined",
      leadId: client.leadId,
      actorId: actor.id,
      metadata: {
        proposalId: proposal.id,
        version: proposal.version,
        title: proposal.title,
        totalMinor: proposal.totalMinor,
        currency: proposal.currency,
        from: "sent",
        to: toStatus,
        source: "portal",
      },
    });

    // Fire-safe: a failed email never rolls back the recorded response.
    await notifyProposalStatusChange(proposal, client.leadId, toStatus);

    return { ok: true, proposal: toProposal(proposal) };
  } catch (error) {
    console.error("[portal] proposal response failed", error);
    return {
      ok: false,
      error: "invalid",
      message: "Your response could not be recorded.",
    };
  }
}

export type PortalProjectListResult =
  { ok: true; projects: PortalProject[] } | { ok: false; error: PortalErrorCode };

export async function listPortalProjects(
  actor: PortalUser | null,
): Promise<PortalProjectListResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };
  const rows = await listProjectsByClientId(client.id);
  return { ok: true, projects: rows.map(toProject) };
}

export type PortalProjectResult =
  { ok: true; project: PortalProject } | { ok: false; error: PortalErrorCode };

export async function getPortalProject(
  actor: PortalUser | null,
  projectId: string,
): Promise<PortalProjectResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };
  if (typeof projectId !== "string" || !cuidLike.test(projectId)) {
    return { ok: false, error: "not_found" };
  }
  const row = await getProject(projectId);
  if (!row || row.clientId !== client.id) return { ok: false, error: "not_found" };
  return { ok: true, project: toProject(row) };
}

export type PortalInvoiceListResult =
  { ok: true; invoices: PortalInvoice[] } | { ok: false; error: PortalErrorCode };

export async function listPortalInvoices(
  actor: PortalUser | null,
): Promise<PortalInvoiceListResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };
  const rows = await listInvoicesByClientId(client.id);
  return { ok: true, invoices: rows.filter(isClientVisibleInvoice).map(toInvoice) };
}

export type PortalInvoiceResult =
  { ok: true; invoice: PortalInvoice } | { ok: false; error: PortalErrorCode };

export async function getPortalInvoice(
  actor: PortalUser | null,
  invoiceId: string,
): Promise<PortalInvoiceResult> {
  const client = await loadScopedClient(actor);
  if (!client) return { ok: false, error: "unauthorized" };
  if (typeof invoiceId !== "string" || !cuidLike.test(invoiceId)) {
    return { ok: false, error: "not_found" };
  }
  const row = await getInvoice(invoiceId);
  // Invoice → Contract → Client is the ownership chain (IDOR guard).
  if (!row || row.contract.clientId !== client.id || !isClientVisibleInvoice(row)) {
    return { ok: false, error: "not_found" };
  }
  return { ok: true, invoice: toInvoice(row) };
}
