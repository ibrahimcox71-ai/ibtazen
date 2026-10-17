import type { ProjectWithRelations } from "./repository";
import {
  createProjectWithActivity,
  findProjectByContractId,
  getClient,
  getContract,
  getProject,
  listProjects,
  ProjectAlreadyExistsError,
  updateProjectStatusWithActivity,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";
import { canProjectTransition, isProjectStatus, type ProjectStatus } from "./domain";

/**
 * Project service — internal delivery registry opened from an ACTIVE
 * Contract (Phase 12). Not a project-management system. Authorization
 * first, cuid guards, server-side ownership/status checks, controlled
 * discriminated results. The browser never supplies actor, status default,
 * or ownership.
 */

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export type ProjectErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_status"
  | "already_exists"
  | "invalid_transition"
  | "invalid";

export type ProjectResult =
  | { ok: true; project: ProjectWithRelations }
  | { ok: false; error: ProjectErrorCode; message?: string };

export type ProjectListResult =
  { ok: true; projects: ProjectWithRelations[] } | { ok: false; error: "unauthorized" };

/**
 * Create a delivery Project from an existing ACTIVE Contract for an
 * existing Client. Preconditions: authenticated CRM actor with
 * `canMutateLeads`, valid cuids, client exists, contract exists and
 * belongs to the client, contract status is exactly `active`, and no
 * project exists for that contract yet.
 */
export async function createProjectFromContract(
  actor: CrmUser | null,
  clientId: string,
  contractId: string,
  fields: {
    name: string;
    description?: string | null;
    startDate?: string | null;
    targetEndDate?: string | null;
  },
): Promise<ProjectResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (
    typeof clientId !== "string" ||
    typeof contractId !== "string" ||
    !cuidLike.test(clientId) ||
    !cuidLike.test(contractId)
  ) {
    return { ok: false, error: "not_found" };
  }

  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  if (!name) {
    return { ok: false, error: "invalid", message: "Project name is required." };
  }

  const client = await getClient(clientId);
  if (!client) return { ok: false, error: "not_found" };

  const contract = await getContract(contractId);
  if (!contract || contract.clientId !== clientId) {
    return { ok: false, error: "not_found", message: "Contract not found for this client." };
  }
  if (contract.status !== "active") {
    return {
      ok: false,
      error: "invalid_status",
      message: "Only an active contract can open a project.",
    };
  }

  const existing = await findProjectByContractId(contractId);
  if (existing) {
    return {
      ok: false,
      error: "already_exists",
      message: "A project already exists for this contract.",
    };
  }

  try {
    const project = await createProjectWithActivity({
      clientId,
      contractId,
      createdById: actor.id,
      name,
      description: fields.description ?? null,
      status: "planning",
      startDate: fields.startDate ?? null,
      targetEndDate: fields.targetEndDate ?? null,
      leadId: client.leadId,
      activityMetadata: {
        name,
        contractTitle: contract.title,
      },
    });
    return { ok: true, project };
  } catch (error) {
    if (error instanceof ProjectAlreadyExistsError) {
      return {
        ok: false,
        error: "already_exists",
        message: "A project already exists for this contract.",
      };
    }
    console.error("[projects] creation failed", error);
    return { ok: false, error: "invalid", message: "Could not create this project." };
  }
}

/** Project listing — CRM actors only (`canAccessCrm`). */
export async function listProjectsForActor(actor: CrmUser | null): Promise<ProjectListResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  return { ok: true, projects: await listProjects() };
}

export type ProjectDetailErrorCode = "unauthorized" | "not_found";

export type ProjectDetailResult =
  { ok: true; project: ProjectWithRelations } | { ok: false; error: ProjectDetailErrorCode };

/**
 * Load one project for the detail surface — CRM actors only
 * (`canAccessCrm`). Malformed and missing ids both return `not_found`
 * so callers cannot probe existence with invalid shapes.
 */
export async function getProjectForActor(
  actor: CrmUser | null,
  projectId: string,
): Promise<ProjectDetailResult> {
  if (!actor || !canAccessCrm(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof projectId !== "string" || !cuidLike.test(projectId)) {
    return { ok: false, error: "not_found" };
  }
  const project = await getProject(projectId);
  if (!project) return { ok: false, error: "not_found" };
  return { ok: true, project };
}

/**
 * Apply a server-validated project status transition with atomic activity.
 * Loads current status from the database — never trusts the browser.
 */
export async function changeProjectStatus(
  actor: CrmUser | null,
  projectId: string,
  toStatus: string,
): Promise<ProjectResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof projectId !== "string" || !cuidLike.test(projectId)) {
    return { ok: false, error: "not_found" };
  }
  if (!isProjectStatus(toStatus)) {
    return { ok: false, error: "invalid", message: "Unknown project status." };
  }

  const existing = await getProject(projectId);
  if (!existing) return { ok: false, error: "not_found" };

  const from = existing.status as ProjectStatus;
  if (from === toStatus) {
    return {
      ok: false,
      error: "invalid_transition",
      message: "Project already has that status.",
    };
  }
  if (!canProjectTransition(from, toStatus)) {
    return {
      ok: false,
      error: "invalid_transition",
      message: `Cannot move project from ${from} to ${toStatus}.`,
    };
  }

  try {
    const project = await updateProjectStatusWithActivity({
      id: projectId,
      from,
      to: toStatus,
      leadId: existing.client.leadId,
      actorId: actor.id,
      metadata: { name: existing.name },
    });
    return { ok: true, project };
  } catch (error) {
    console.error("[projects] status change failed", error);
    return {
      ok: false,
      error: "invalid_transition",
      message: "Project status could not be updated.",
    };
  }
}
