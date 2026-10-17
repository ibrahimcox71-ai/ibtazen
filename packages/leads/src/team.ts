import type { TeamMember, TeamMemberInput } from "./repository";
import {
  createTeamMemberRow,
  deleteTeamMemberRow,
  getTeamMember,
  listPublishedTeamMemberRows,
  listTeamMembers,
  updateTeamMemberRow,
} from "./repository";
import { canAccessCrm, canMutateLeads, type CrmUser } from "./auth/rbac";

export const TEAM_NAME_MAX = 100;
export const TEAM_ROLE_MAX = 100;
export const TEAM_BIO_MAX = 800;
export const TEAM_LINKEDIN_MAX = 250;
const cuidLike = /^c[a-z0-9]{20,}$/i;
const photoKeyPattern = /^[a-f0-9]{40}\.(?:jpg|png|webp)$/i;

export type TeamInput = {
  name: unknown;
  role: unknown;
  bio?: unknown;
  photoUrl?: unknown;
  linkedinUrl?: unknown;
  published: unknown;
  sortOrder: unknown;
};

export type TeamResult =
  | { ok: true; member: TeamMember }
  | { ok: false; error: "unauthorized" | "not_found" | "invalid"; message?: string };

function normalise(input: TeamInput): { value?: TeamMemberInput; message?: string } {
  if (typeof input.name !== "string" || !input.name.trim()) return { message: "Name is required." };
  if (typeof input.role !== "string" || !input.role.trim()) return { message: "Role is required." };
  const name = input.name.trim();
  const role = input.role.trim();
  if (name.length > TEAM_NAME_MAX)
    return { message: `Name must be ${TEAM_NAME_MAX} characters or fewer.` };
  if (role.length > TEAM_ROLE_MAX)
    return { message: `Role must be ${TEAM_ROLE_MAX} characters or fewer.` };
  if (input.bio !== undefined && input.bio !== null && typeof input.bio !== "string")
    return { message: "Bio must be text." };
  const bio = typeof input.bio === "string" && input.bio.trim() ? input.bio.trim() : null;
  if (bio && bio.length > TEAM_BIO_MAX)
    return { message: `Bio must be ${TEAM_BIO_MAX} characters or fewer.` };
  if (
    input.linkedinUrl !== undefined &&
    input.linkedinUrl !== null &&
    typeof input.linkedinUrl !== "string"
  )
    return { message: "LinkedIn URL must be text." };
  const linkedinUrl =
    typeof input.linkedinUrl === "string" && input.linkedinUrl.trim()
      ? input.linkedinUrl.trim()
      : null;
  if (linkedinUrl) {
    try {
      const url = new URL(linkedinUrl);
      if (
        url.protocol !== "https:" ||
        !/^([a-z0-9-]+\.)?linkedin\.com$/i.test(url.hostname) ||
        url.username ||
        url.password ||
        linkedinUrl.length > TEAM_LINKEDIN_MAX
      )
        throw new Error();
    } catch {
      return { message: "LinkedIn URL must be a valid https://linkedin.com URL." };
    }
  }
  const photoUrl =
    typeof input.photoUrl === "string" && input.photoUrl.trim() ? input.photoUrl.trim() : null;
  if (photoUrl && !photoKeyPattern.test(photoUrl))
    return { message: "Unsupported photo reference." };
  if (typeof input.published !== "boolean") return { message: "Published must be true or false." };
  const sortOrder = typeof input.sortOrder === "number" ? input.sortOrder : Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000)
    return { message: "Order must be a whole number from 0 to 10000." };
  return {
    value: { name, role, bio, photoUrl, linkedinUrl, published: input.published, sortOrder },
  };
}

export function isCompleteTeamMember(
  member: Pick<TeamMember, "name" | "role" | "photoUrl">,
): boolean {
  return Boolean(member.name.trim() && member.role.trim() && member.photoUrl);
}

export function isVisibleTeamMember(
  member: Pick<TeamMember, "name" | "role" | "photoUrl" | "published">,
): boolean {
  return member.published && isCompleteTeamMember(member);
}

export async function listTeamMembersForActor(actor: CrmUser | null) {
  if (!actor || !canAccessCrm(actor.role))
    return { ok: false as const, error: "unauthorized" as const };
  return { ok: true as const, members: await listTeamMembers() };
}

export async function getTeamMemberForActor(actor: CrmUser | null, id: string) {
  if (!actor || !canAccessCrm(actor.role))
    return { ok: false as const, error: "unauthorized" as const };
  if (typeof id !== "string" || !cuidLike.test(id))
    return { ok: false as const, error: "not_found" as const };
  const member = await getTeamMember(id);
  return member
    ? { ok: true as const, member }
    : { ok: false as const, error: "not_found" as const };
}

export async function createTeamMember(
  actor: CrmUser | null,
  input: TeamInput,
): Promise<TeamResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const parsed = normalise(input);
  if (!parsed.value) return { ok: false, error: "invalid", message: parsed.message };
  try {
    return { ok: true, member: await createTeamMemberRow(parsed.value) };
  } catch (error) {
    console.error("[team] create failed", error);
    return { ok: false, error: "invalid", message: "Team member could not be saved." };
  }
}

export async function updateTeamMember(
  actor: CrmUser | null,
  id: string,
  input: TeamInput,
): Promise<TeamResult> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof id !== "string" || !cuidLike.test(id)) return { ok: false, error: "not_found" };
  if (!(await getTeamMember(id))) return { ok: false, error: "not_found" };
  const parsed = normalise(input);
  if (!parsed.value) return { ok: false, error: "invalid", message: parsed.message };
  try {
    return { ok: true, member: await updateTeamMemberRow(id, parsed.value) };
  } catch (error) {
    console.error("[team] update failed", error);
    return { ok: false, error: "invalid", message: "Team member could not be saved." };
  }
}

export async function deleteTeamMember(
  actor: CrmUser | null,
  id: string,
): Promise<{ ok: true; member: TeamMember } | { ok: false; error: "unauthorized" | "not_found" }> {
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  if (typeof id !== "string" || !cuidLike.test(id)) return { ok: false, error: "not_found" };
  const member = await getTeamMember(id);
  if (!member) return { ok: false, error: "not_found" };
  await deleteTeamMemberRow(id);
  return { ok: true, member };
}

export async function listPublishedTeamMembers(): Promise<TeamMember[]> {
  try {
    return (await listPublishedTeamMemberRows()).filter(isVisibleTeamMember);
  } catch (error) {
    console.error("[team] public list failed", error);
    return [];
  }
}
