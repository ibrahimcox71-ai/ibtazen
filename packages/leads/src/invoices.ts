import type { InvoiceWithRelations } from "./repository";
import {
  createInvoiceWithActivity,
  findInvoiceByContractId,
  getContract,
  getInvoice,
  InvoiceAlreadyExistsError,
  listInvoices,
  updateInvoiceStatusWithActivity,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";
import { canInvoiceTransition, isInvoiceStatus, type InvoiceStatus } from "./domain";
import { notifyInvoiceStatusChange } from "./crm-notifications";

/**
 * Invoice service — internal invoice opened from an ACTIVE Contract
 * (Phase 14). Financial fields are snapshotted server-side from the Contract
 * at creation; the browser never supplies money, lines, actor, or ownership.
 * "paid" is a manual internal CRM mark — not a payment-gateway confirmation.
 * Uniqueness rule: one Invoice per Contract (`contractId` unique).
 */

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export type InvoiceErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_status"
  | "already_exists"
  | "invalid_transition"
  | "invalid";

export type InvoiceResult =
  | { ok: true; invoice: InvoiceWithRelations }
  | { ok: false; error: InvoiceErrorCode; message?: string };

export type InvoiceListResult =
  { ok: true; invoices: InvoiceWithRelations[] } | { ok: false; error: "unauthorized" };

export type InvoiceDetailErrorCode = "unauthorized" | "not_found";

export type InvoiceDetailResult =
  { ok: true; invoice: InvoiceWithRelations } | { ok: false; error: InvoiceDetailErrorCode };

function issueDateFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Operational due date: issue + 30 days, display only (no overdue state). */
function defaultDueDate(issue: Date): string {
  const due = new Date(issue);
  due.setUTCDate(due.getUTCDate() + 30);
  return issueDateFromDate(due);
}

/**
 * Create an invoice from an existing ACTIVE Contract. Only `contractId`
 * crosses the wire — currency, lines, totals, title, actor, and ownership
 * are resolved and snapshotted server-side. Preconditions: authenticated
 * CRM actor with `canMutateLeads`, valid cuid, contract exists, status is
 * exactly `active`, and no invoice exists for that contract yet.
 */
export async function createInvoiceFromContract(
  actor: CrmUser | null,
  contractId: string,
): Promise<InvoiceResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof contractId !== "string" || !cuidLike.test(contractId)) {
    return { ok: false, error: "not_found" };
  }

  const contract = await getContract(contractId);
  if (!contract) return { ok: false, error: "not_found" };
  if (contract.status !== "active") {
    return {
      ok: false,
      error: "invalid_status",
      message: "Only an active contract can be invoiced.",
    };
  }

  const existing = await findInvoiceByContractId(contractId);
  if (existing) {
    return {
      ok: false,
      error: "already_exists",
      message: "An invoice already exists for this contract.",
    };
  }

  const now = new Date();
  try {
    const invoice = await createInvoiceWithActivity({
      contractId,
      createdById: actor.id,
      status: "draft",
      // Snapshot the contract's commercial payload — never browser input.
      currency: contract.currency,
      issueDate: issueDateFromDate(now),
      dueDate: defaultDueDate(now),
      title: contract.title,
      lines: contract.lines,
      subtotalMinor: contract.subtotalMinor,
      totalMinor: contract.totalMinor,
      leadId: contract.client.leadId,
      activityMetadata: {
        title: contract.title,
        currency: contract.currency,
        totalMinor: contract.totalMinor,
        clientId: contract.clientId,
        clientName: contract.clientName,
      },
    });
    return { ok: true, invoice };
  } catch (error) {
    if (error instanceof InvoiceAlreadyExistsError) {
      return {
        ok: false,
        error: "already_exists",
        message: "An invoice already exists for this contract.",
      };
    }
    console.error("[invoices] creation failed", error);
    return { ok: false, error: "invalid", message: "Could not create this invoice." };
  }
}

/** Invoice listing — CRM actors only (`canAccessCrm`). */
export async function listInvoicesForActor(actor: CrmUser | null): Promise<InvoiceListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, invoices: await listInvoices() };
}

/**
 * Load one invoice for the detail surface — CRM actors only
 * (`canAccessCrm`). Malformed and missing ids both return `not_found`.
 */
export async function getInvoiceForActor(
  actor: CrmUser | null,
  invoiceId: string,
): Promise<InvoiceDetailResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof invoiceId !== "string" || !cuidLike.test(invoiceId)) {
    return { ok: false, error: "not_found" };
  }
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return { ok: false, error: "not_found" };
  return { ok: true, invoice };
}

/**
 * Apply a server-validated invoice status transition with atomic activity.
 * Loads current status from the database — never trusts the browser.
 * "paid" is a manual internal mark by an authorized CRM actor.
 */
export async function changeInvoiceStatus(
  actor: CrmUser | null,
  invoiceId: string,
  toStatus: string,
): Promise<InvoiceResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof invoiceId !== "string" || !cuidLike.test(invoiceId)) {
    return { ok: false, error: "not_found" };
  }
  if (!isInvoiceStatus(toStatus)) {
    return { ok: false, error: "invalid", message: "Unknown invoice status." };
  }

  const existing = await getInvoice(invoiceId);
  if (!existing) return { ok: false, error: "not_found" };

  const from = existing.status as InvoiceStatus;
  if (from === toStatus) {
    return {
      ok: false,
      error: "invalid_transition",
      message: "Invoice already has that status.",
    };
  }
  if (!canInvoiceTransition(from, toStatus)) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Cannot move invoice from ${from} to ${toStatus}.`,
    };
  }

  try {
    const invoice = await updateInvoiceStatusWithActivity({
      id: invoiceId,
      from,
      to: toStatus,
      leadId: existing.contract.client.leadId,
      actorId: actor.id,
      metadata: {
        invoiceNumber: existing.invoiceNumber,
        totalMinor: existing.totalMinor,
        currency: existing.currency,
      },
    });
    // Notification is fire-safe: a failed email never fails the transition.
    await notifyInvoiceStatusChange(invoice, toStatus);
    return { ok: true, invoice };
  } catch (error) {
    console.error("[invoices] status change failed", error);
    return {
      ok: false,
      error: "invalid_transition",
      message: "Invoice status could not be updated.",
    };
  }
}
