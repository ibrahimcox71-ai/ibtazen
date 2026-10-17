import type {
  ClientWithRelations,
  ClientListItem,
  ContractWithRelations,
  InvoiceWithRelations,
  LeadActivityWithActor,
  ProjectWithRelations,
} from "./repository";
import {
  createClientWithActivity,
  findClientByLeadId,
  getClient,
  getLead,
  listClients,
  listContractsByClientId,
  listInvoicesByClientId,
  listLeadActivities,
  listProjectsByClientId,
  ClientAlreadyExistsError,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";

/**
 * Client service — converts a won Lead into a first-class Client and lists
 * the internal registry (Phase 9). Follows the CRM service conventions:
 * authorization first, cuid guard, server-side field copy, controlled
 * discriminated-result errors. The browser never supplies client profile
 * fields — they are copied from the Lead on the server.
 */

// Shared cuid-shaped id guard — same pattern as auth/service.ts and the
// admin pages (validated before any existence check).
const cuidLike = /^[c][a-z0-9]{20,}$/i;

export type ClientConversionErrorCode =
  "unauthorized" | "not_found" | "invalid_status" | "already_converted" | "invalid";

export type ClientConversionResult =
  | { ok: true; client: ClientWithRelations }
  | { ok: false; error: ClientConversionErrorCode; message?: string };

export type ClientListResult =
  { ok: true; clients: ClientListItem[] } | { ok: false; error: "unauthorized" };

/**
 * Convert a `won` lead into a Client. Preconditions: authenticated CRM
 * actor with `canMutateLeads`, valid cuid, lead exists, lead status is
 * exactly `won`, and the lead has no Client yet. The unique `leadId`
 * constraint plus transactional activity write make duplicates impossible.
 * The lead status remains `won` — conversion never mutates the pipeline.
 */
export async function convertWonLeadToClient(
  actor: CrmUser | null,
  leadId: string,
): Promise<ClientConversionResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof leadId !== "string" || !cuidLike.test(leadId)) {
    return { ok: false, error: "not_found" };
  }

  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "not_found" };
  if (lead.status !== "won") {
    return {
      ok: false,
      error: "invalid_status",
      message: "Only a won lead can be converted to a client.",
    };
  }

  const existing = await findClientByLeadId(leadId);
  if (existing) {
    return {
      ok: false,
      error: "already_converted",
      message: "This lead has already been converted to a client.",
    };
  }

  try {
    const client = await createClientWithActivity({
      leadId,
      createdById: actor.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      organizationName: lead.company,
      sourceStatus: "won",
      activityMetadata: { leadName: lead.name },
    });
    return { ok: true, client };
  } catch (error) {
    if (error instanceof ClientAlreadyExistsError) {
      return {
        ok: false,
        error: "already_converted",
        message: "This lead has already been converted to a client.",
      };
    }
    console.error("[clients] conversion failed", error);
    return { ok: false, error: "invalid", message: "Could not convert this lead." };
  }
}

/** Registry listing — CRM actors only (`canAccessCrm`). */
export async function listClientsForActor(actor: CrmUser | null): Promise<ClientListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, clients: await listClients() };
}

export type ClientResultErrorCode = "unauthorized" | "not_found";

export type ClientResult =
  { ok: true; client: ClientWithRelations } | { ok: false; error: ClientResultErrorCode };

/**
 * Load one Client — CRM actors only (`canAccessCrm`). Malformed and missing
 * ids both return `not_found` so callers cannot probe existence with invalid
 * shapes. Ownership is never taken from the browser: the id is only ever used
 * to look the row up, and every caller has already passed `requireUser`.
 */
export async function getClientForActor(
  actor: CrmUser | null,
  clientId: string,
): Promise<ClientResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof clientId !== "string" || !cuidLike.test(clientId)) {
    return { ok: false, error: "not_found" };
  }
  const client = await getClient(clientId);
  if (!client) return { ok: false, error: "not_found" };
  return { ok: true, client };
}

/** Aggregated commercial context for the internal Client Detail surface. */
export interface ClientDetail {
  client: ClientWithRelations;
  /** ALL contracts for this client — never truncated to the first one. */
  contracts: ContractWithRelations[];
  projects: ProjectWithRelations[];
  /** Resolved through Invoice → Contract → Client. */
  invoices: InvoiceWithRelations[];
  /** The originating Lead's append-only activity history, newest first. */
  activities: LeadActivityWithActor[];
}

export type ClientDetailResult =
  { ok: true; detail: ClientDetail } | { ok: false; error: ClientDetailErrorCode };

export type ClientDetailErrorCode = ClientResultErrorCode;

/**
 * Client Detail aggregate — one authorization gate, then read-only fetches
 * scoped strictly by the resolved client id. Nothing from the browser is
 * trusted as ownership; every list is derived from `client.id` /
 * `client.leadId` on the server. Multi-contract clients return every
 * contract, and projects/invoices are aggregated across all of them.
 */
export async function getClientDetailForActor(
  actor: CrmUser | null,
  clientId: string,
): Promise<ClientDetailResult> {
  const single = await getClientForActor(actor, clientId);
  if (!single.ok) return single;

  const client = single.client;
  const [contracts, projects, invoices, activities] = await Promise.all([
    listContractsByClientId(client.id),
    listProjectsByClientId(client.id),
    listInvoicesByClientId(client.id),
    listLeadActivities(client.leadId),
  ]);

  return {
    ok: true,
    detail: { client, contracts, projects, invoices, activities },
  };
}
