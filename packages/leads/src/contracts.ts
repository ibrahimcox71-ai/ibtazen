import type { ContractWithRelations } from "./repository";
import {
  ContractAlreadyExistsError,
  createContractWithActivity,
  findContractByProposalId,
  getClient,
  getContract,
  getProposal,
  listContracts,
  updateContractStatusWithActivity,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";
import { canContractTransition, isContractStatus, type ContractStatus } from "./domain";
import { notifyContractStatusChange } from "./crm-notifications";

/**
 * Contract service — internal commercial snapshot from an accepted proposal
 * (Phase 11). Not an e-signature system. Authorization first, cuid guards,
 * server-side field copy from Client + Proposal, controlled discriminated
 * results. The browser never supplies money, lines, or client identity.
 *
 * Uniqueness rule: one Contract per accepted Proposal (`proposalId` unique).
 */

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export type ContractErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_status"
  | "already_exists"
  | "invalid_transition"
  | "invalid";

export type ContractResult =
  | { ok: true; contract: ContractWithRelations }
  | { ok: false; error: ContractErrorCode; message?: string };

export type ContractListResult =
  { ok: true; contracts: ContractWithRelations[] } | { ok: false; error: "unauthorized" };

/**
 * Create an internal contract snapshot from an accepted proposal for an
 * existing Client. Preconditions: authenticated CRM actor with
 * `canMutateLeads`, valid cuids, client exists, proposal exists and belongs
 * to the client's lead, proposal status is exactly `accepted`, and no
 * contract exists for that proposal yet.
 */
export async function createContractFromProposal(
  actor: CrmUser | null,
  clientId: string,
  proposalId: string,
): Promise<ContractResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (
    typeof clientId !== "string" ||
    typeof proposalId !== "string" ||
    !cuidLike.test(clientId) ||
    !cuidLike.test(proposalId)
  ) {
    return { ok: false, error: "not_found" };
  }

  const client = await getClient(clientId);
  if (!client) return { ok: false, error: "not_found" };

  const proposal = await getProposal(proposalId);
  if (!proposal || proposal.leadId !== client.leadId) {
    return {
      ok: false,
      error: "not_found",
      message: "Proposal not found for this client.",
    };
  }
  if (proposal.status !== "accepted") {
    return {
      ok: false,
      error: "invalid_status",
      message: "Only an accepted proposal can become a contract.",
    };
  }

  const existing = await findContractByProposalId(proposalId);
  if (existing) {
    return {
      ok: false,
      error: "already_exists",
      message: "A contract already exists for this proposal.",
    };
  }

  try {
    const contract = await createContractWithActivity({
      clientId,
      proposalId,
      createdById: actor.id,
      leadId: client.leadId,
      proposalVersion: proposal.version,
      title: proposal.title,
      currency: proposal.currency,
      validUntil: proposal.validUntil,
      clientName: client.name,
      clientEmail: client.email,
      organizationName: client.organizationName,
      // Snapshot the accepted proposal's commercial payload byte-for-byte.
      lines: proposal.lines,
      subtotalMinor: proposal.subtotalMinor,
      totalMinor: proposal.totalMinor,
      activityMetadata: {
        title: proposal.title,
        currency: proposal.currency,
        totalMinor: proposal.totalMinor,
        proposalVersion: proposal.version,
      },
    });
    return { ok: true, contract };
  } catch (error) {
    if (error instanceof ContractAlreadyExistsError) {
      return {
        ok: false,
        error: "already_exists",
        message: "A contract already exists for this proposal.",
      };
    }
    console.error("[contracts] creation failed", error);
    return { ok: false, error: "invalid", message: "Could not create this contract." };
  }
}

/** Contract listing — CRM actors only (`canAccessCrm`). */
export async function listContractsForActor(actor: CrmUser | null): Promise<ContractListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, contracts: await listContracts() };
}

/**
 * Apply a server-validated contract status transition. Only the explicit
 * transition map is allowed — no arbitrary status mutation, no auto-activation.
 */
export async function changeContractStatus(
  actor: CrmUser | null,
  contractId: string,
  toStatus: string,
): Promise<ContractResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof contractId !== "string" || !cuidLike.test(contractId)) {
    return { ok: false, error: "not_found" };
  }
  if (!isContractStatus(toStatus)) {
    return { ok: false, error: "invalid", message: "Unknown contract status." };
  }

  const existing = await getContract(contractId);
  if (!existing) return { ok: false, error: "not_found" };

  const from = existing.status as ContractStatus;
  if (from === toStatus) {
    return {
      ok: false,
      error: "invalid_transition",
      message: "Contract already has that status.",
    };
  }
  if (!canContractTransition(from, toStatus)) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Cannot move contract from ${from} to ${toStatus}.`,
    };
  }

  try {
    const contract = await updateContractStatusWithActivity({
      id: contractId,
      from,
      to: toStatus,
      leadId: existing.client.leadId,
      actorId: actor.id,
      metadata: { title: existing.title },
    });
    // Notification is fire-safe: a failed email never fails the transition.
    await notifyContractStatusChange(contract, toStatus);
    return { ok: true, contract };
  } catch (error) {
    console.error("[contracts] status change failed", error);
    return {
      ok: false,
      error: "invalid_transition",
      message: "Contract status could not be updated.",
    };
  }
}
