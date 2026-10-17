"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCrmNote,
  assignLead,
  changeContractStatus,
  changeCrmUserRole,
  changeInvoiceStatus,
  changeLeadStatus,
  changeProposalStatus,
  changeProjectStatus,
  completeLeadFollowUp,
  convertWonLeadToClient,
  createBlogPost,
  createContractFromProposal,
  createCrmUser,
  createInvoiceFromContract,
  createLeadFollowUp,
  createLeadProposal,
  createCaseStudy,
  createProjectFromContract,
  deleteBlogPost,
  deleteCaseStudy,
  editLeadProposal,
  editLeadFollowUp,
  loginAdmin,
  provisionPortalAccess,
  setCrmUserActive,
  setBlogPostImage,
  setCaseStudyImage,
  setSiteAsset,
  updateBlogPost,
  updateCaseStudy,
  winLeadFromAcceptedProposal,
  type AssignResult,
  type BlogDeleteResult,
  type BlogInput,
  type BlogResult,
  type CaseStudyInput,
  type CaseStudyResult,
  type CaseStudyDeleteResult,
  type ClientConversionResult,
  type ContractResult,
  type CrmUser,
  type FollowUpResult,
  type InvoiceResult,
  type LoginResult,
  type NoteResult,
  type ProjectResult,
  type ProposalResult,
  type SiteAssetSlot,
  type SiteSettings,
  type StatusChangeResult,
  type WinFromProposalResult,
} from "@ibtatech/leads";
import { getClientIp } from "@/lib/lead-action";
import {
  clearSessionCookie,
  endSession,
  getCurrentUser,
  requireUser,
  setSessionCookie,
} from "@/lib/admin/session";
import {
  prepareBlogImage,
  prepareBrandImage,
  prepareCaseStudyImage,
  removeBlogImage,
  removeBrandImage,
  removeCaseStudyImage,
  storeBlogImage,
  storeBrandImage,
  storeCaseStudyImage,
  type ImageFailure,
  type PreparedImage,
} from "@/lib/uploads";
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type TeamInput,
  type TeamResult,
} from "@ibtatech/leads";
import { canMutateLeads } from "@ibtatech/leads";
import { prepareTeamImage, removeTeamImage, storeTeamImage } from "@/lib/uploads";

export type {
  LoginResult,
  NoteResult,
  StatusChangeResult,
  AssignResult,
  FollowUpResult,
  ProposalResult,
  WinFromProposalResult,
  ClientConversionResult,
  ContractResult,
  ProjectResult,
  InvoiceResult,
  CaseStudyResult,
  BlogResult,
  TeamResult,
};

/** True for Next.js `redirect()` control-flow signals — must never be swallowed. */
function isRedirectSignal(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT;")
  );
}

export async function loginAction(
  _prev: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/admin/dashboard";

  let result: LoginResult;
  try {
    result = await loginAdmin(
      typeof email === "string" ? email : "",
      typeof password === "string" ? password : "",
      await getClientIp(),
    );
  } catch (error) {
    // Unexpected infrastructure failure — never leak details to the client.
    if (isRedirectSignal(error)) throw error;
    console.error("[admin] login failed unexpectedly", error);
    return { ok: false, error: "invalid_credentials" };
  }

  if (result.ok) {
    await setSessionCookie(result.token, result.expiresAt);
    // redirect() throws NEXT_REDIRECT — leave uncaught so App Router navigates.
    redirect(next);
  }
  return result;
}

export async function logoutAction(): Promise<void> {
  try {
    await endSession();
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    console.error("[admin] logout session error", error);
    await clearSessionCookie().catch(() => undefined);
  }
  redirect("/admin/login");
}

/** Serialisable result — Dates from the service are never sent to the client. */
export type ProvisionPortalResult =
  | {
      ok: true;
      email: string;
      active: boolean;
      /** Invite email the admin asked for, and the transport's real answer. */
      invite: { requested: boolean; delivered: boolean };
    }
  | { ok: false; error: string; message?: string };

/**
 * Create or reset the read-only portal login for a Client (admin-only in
 * the service). The password is handled server-side only — never logged.
 * The optional invite email is opt-in: without the checkbox nothing about
 * the login leaves the server.
 */
export async function provisionPortalAccessAction(
  clientId: string,
  formData: FormData,
): Promise<ProvisionPortalResult> {
  const user = await getCurrentUser();
  const result = await provisionPortalAccess(user, clientId, {
    email: formData.get("email"),
    password: formData.get("password"),
    sendInvite: formData.get("sendInvite"),
  });
  if (!result.ok) return { ok: false, error: result.error, message: result.message };
  revalidatePath(`/admin/clients/${clientId}`);
  return {
    ok: true,
    email: result.access.email ?? "",
    active: result.access.active ?? true,
    invite: result.invite ?? { requested: false, delivered: false },
  };
}

/** Serialisable result — Dates from the service are never sent to the client. */
export type ManageCrmUserResult = { ok: true } | { ok: false; error: string; message?: string };

/** Create a CRM login (admin/staff). Gated by `canManageUsers` in the service. */
export async function createCrmUserAction(formData: FormData): Promise<ManageCrmUserResult> {
  const actor = await getCurrentUser();
  const result = await createCrmUser(actor, {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!result.ok) return { ok: false, error: result.error, message: result.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Flip a CRM login between admin and staff — role never comes from the client. */
export async function changeCrmUserRoleAction(
  userId: string,
  formData: FormData,
): Promise<ManageCrmUserResult> {
  const actor = await getCurrentUser();
  const result = await changeCrmUserRole(actor, userId, formData.get("role"));
  if (!result.ok) return { ok: false, error: result.error, message: result.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Activate / deactivate a CRM login — deactivation revokes its sessions. */
export async function setCrmUserActiveAction(
  userId: string,
  active: boolean,
): Promise<ManageCrmUserResult> {
  const actor = await getCurrentUser();
  const result = await setCrmUserActive(actor, userId, active);
  if (!result.ok) return { ok: false, error: result.error, message: result.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateLeadStatusAction(
  leadId: string,
  toStatus: string,
): Promise<StatusChangeResult> {
  const user = await getCurrentUser();
  const result = await changeLeadStatus(user, leadId, toStatus);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

export async function addLeadNoteAction(leadId: string, body: string): Promise<NoteResult> {
  const user = await getCurrentUser();
  const result = await addCrmNote(user, leadId, body);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
  }
  return result;
}

export async function assignLeadAction(leadId: string, assigneeId: string): Promise<AssignResult> {
  const user = await getCurrentUser();
  const result = await assignLead(user, leadId, assigneeId);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

export async function createFollowUpAction(
  leadId: string,
  formData: FormData,
): Promise<FollowUpResult> {
  const user = await getCurrentUser();
  const result = await createLeadFollowUp(user, leadId, {
    title: formData.get("title"),
    body: formData.get("body"),
    dueDate: formData.get("dueDate"),
    assigneeId: formData.get("assigneeId"),
  });
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/dashboard");
  }
  return result;
}

export async function completeFollowUpAction(
  leadId: string,
  followUpId: string,
  completed: boolean,
): Promise<FollowUpResult> {
  const user = await getCurrentUser();
  const result = await completeLeadFollowUp(user, followUpId, completed);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/dashboard");
  }
  return result;
}

export async function editFollowUpAction(
  leadId: string,
  followUpId: string,
  formData: FormData,
): Promise<FollowUpResult> {
  const user = await getCurrentUser();
  const result = await editLeadFollowUp(user, followUpId, {
    title: formData.get("title"),
    body: formData.get("body"),
    dueDate: formData.get("dueDate"),
    assigneeId: formData.get("assigneeId"),
  });
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/dashboard");
  }
  return result;
}

function proposalFormPayload(formData: FormData): {
  title: unknown;
  currency: unknown;
  validUntil: unknown;
  notes: unknown;
  lines: Array<{ description: unknown; quantity: unknown; unitPrice: unknown }>;
} {
  const descriptions = formData.getAll("lineDescription");
  const quantities = formData.getAll("lineQuantity");
  const unitPrices = formData.getAll("lineUnitPrice");
  const length = Math.max(descriptions.length, quantities.length, unitPrices.length);
  const lines = Array.from({ length }, (_, i) => ({
    description: descriptions[i],
    quantity: quantities[i],
    unitPrice: unitPrices[i],
  }));
  return {
    title: formData.get("title"),
    currency: formData.get("currency"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    lines,
  };
}

export async function createProposalAction(
  leadId: string,
  formData: FormData,
): Promise<ProposalResult> {
  const user = await getCurrentUser();
  const result = await createLeadProposal(user, leadId, proposalFormPayload(formData));
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/dashboard");
  }
  return result;
}

export async function updateProposalAction(
  leadId: string,
  proposalId: string,
  formData: FormData,
): Promise<ProposalResult> {
  const user = await getCurrentUser();
  const result = await editLeadProposal(user, proposalId, proposalFormPayload(formData));
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
  }
  return result;
}

export async function changeProposalStatusAction(
  leadId: string,
  proposalId: string,
  toStatus: string,
): Promise<ProposalResult> {
  const user = await getCurrentUser();
  const result = await changeProposalStatus(user, proposalId, toStatus);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/dashboard");
  }
  return result;
}

export async function acceptAndWinAction(
  leadId: string,
  proposalId: string,
): Promise<WinFromProposalResult> {
  const user = await getCurrentUser();
  const result = await winLeadFromAcceptedProposal(user, leadId, proposalId);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

/**
 * Convert a won lead into a Client. Only the lead id crosses the wire —
 * profile fields are copied server-side from the Lead. Requires an
 * authenticated CRM actor with `canMutateLeads`.
 */
export async function convertWonLeadToClientAction(
  leadId: string,
): Promise<ClientConversionResult> {
  const user = await getCurrentUser();
  const result = await convertWonLeadToClient(user, leadId);
  if (result.ok) {
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

/**
 * Create an internal contract from an already-existing client + accepted
 * proposal. Only the two identifiers cross the wire — snapshot fields
 * (money, lines, client identity) are copied server-side. Requires
 * `canMutateLeads`.
 */
export async function createContractFromProposalAction(
  clientId: string,
  proposalId: string,
): Promise<ContractResult> {
  const user = await getCurrentUser();
  const result = await createContractFromProposal(user, clientId, proposalId);
  if (result.ok) {
    revalidatePath(`/admin/leads/${result.contract.proposal.leadId}`);
    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

/** Server-validated contract status transition only. */
export async function changeContractStatusAction(
  contractId: string,
  toStatus: string,
): Promise<ContractResult> {
  const user = await getCurrentUser();
  const result = await changeContractStatus(user, contractId, toStatus);
  if (result.ok) {
    revalidatePath(`/admin/leads/${result.contract.client.leadId}`);
    revalidatePath("/admin/clients");
  }
  return result;
}

/**
 * Create a delivery Project from an ACTIVE contract. Only ids + editable
 * presentation fields cross the wire — actor, status, and ownership are
 * server-authoritative.
 */
export async function createProjectFromContractAction(
  clientId: string,
  contractId: string,
  formData: FormData,
): Promise<ProjectResult> {
  const user = await getCurrentUser();
  const name = formData.get("name");
  const description = formData.get("description");
  const startDate = formData.get("startDate");
  const targetEndDate = formData.get("targetEndDate");
  const result = await createProjectFromContract(user, clientId, contractId, {
    name: typeof name === "string" ? name : "",
    description: typeof description === "string" && description.trim() ? description : null,
    startDate: typeof startDate === "string" && startDate.trim() ? startDate : null,
    targetEndDate: typeof targetEndDate === "string" && targetEndDate.trim() ? targetEndDate : null,
  });
  if (result.ok) {
    revalidatePath("/admin/projects");
    revalidatePath(`/admin/leads/${result.project.client.leadId}`);
    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

/** Server-validated project status transition only. */
export async function changeProjectStatusAction(
  projectId: string,
  toStatus: string,
): Promise<ProjectResult> {
  const user = await getCurrentUser();
  const result = await changeProjectStatus(user, projectId, toStatus);
  if (result.ok) {
    revalidatePath("/admin/projects");
    revalidatePath(`/admin/leads/${result.project.client.leadId}`);
  }
  return result;
}

/**
 * Create an invoice from an ACTIVE contract. Only the contract id crosses
 * the wire — money, lines, actor, and ownership are server-authoritative.
 */
export async function createInvoiceFromContractAction(contractId: string): Promise<InvoiceResult> {
  const user = await getCurrentUser();
  const result = await createInvoiceFromContract(user, contractId);
  if (result.ok) {
    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/leads/${result.invoice.contract.client.leadId}`);
    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
  }
  return result;
}

/** Server-validated invoice status transition only. "paid" is a manual mark. */
export async function changeInvoiceStatusAction(
  invoiceId: string,
  toStatus: string,
): Promise<InvoiceResult> {
  const user = await getCurrentUser();
  const result = await changeInvoiceStatus(user, invoiceId, toStatus);
  if (result.ok) {
    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${invoiceId}`);
    revalidatePath(`/admin/leads/${result.invoice.contract.client.leadId}`);
  }
  return result;
}

/** Raw case-study form fields — the service validates every value. */
function caseStudyFormPayload(formData: FormData): CaseStudyInput {
  const labels = formData.getAll("metricLabel");
  const values = formData.getAll("metricValue");
  const length = Math.max(labels.length, values.length);
  const metrics = Array.from({ length }, (_, i) => ({ label: labels[i], value: values[i] }));
  return {
    title: formData.get("title"),
    clientName: formData.get("clientName"),
    slug: formData.get("slug"),
    slotNumber: formData.get("slotNumber"),
    description: formData.get("description"),
    status: formData.get("status"),
    metrics,
    imageAlt: formData.get("imageAlt"),
    videoEmbedUrl: formData.get("videoEmbedUrl"),
    sortOrder: formData.get("sortOrder"),
  };
}

/** Registry, edit surface, and the public pages all read this row. */
function revalidateCaseStudyPaths(caseStudyId: string, slug: string): void {
  revalidatePath("/admin/case-studies");
  revalidatePath(`/admin/case-studies/${caseStudyId}`);
  revalidatePath("/");
  revalidatePath("/case-studies");
  revalidatePath(`/case-studies/${slug}`);
  revalidatePath("/sitemap.xml");
}

/** Rejected by validation before any row exists — nothing was written. */
function invalidImage(message: string): CaseStudyResult {
  return { ok: false, error: "invalid", message };
}

/**
 * The row already committed and only a later image step failed. Kept distinct
 * from `invalidImage` so the form never tells the operator "not saved" about a
 * save that actually landed — a re-submit would then come back `slug_taken`.
 */
function partialImage(detail?: string): CaseStudyResult {
  return {
    ok: false,
    error: "partial",
    message: detail
      ? `The case study was saved, but the image failed: ${detail}`
      : "The case study was saved, but the image could not be updated.",
  };
}

async function validateCaseStudyImageInput(
  formData: FormData,
): Promise<PreparedImage | ImageFailure | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  return prepareCaseStudyImage(file);
}

async function storeAndLinkImage(
  user: CrmUser | null,
  caseStudyId: string,
  currentImagePath: string | null,
  image: PreparedImage,
): Promise<CaseStudyResult> {
  const stored = await storeCaseStudyImage(caseStudyId, image);
  if (!stored.ok) {
    return partialImage(stored.message);
  }
  const linked = await setCaseStudyImage(user, caseStudyId, stored.key);
  if (!linked.ok) {
    await removeCaseStudyImage(stored.key);
    return partialImage(linked.message);
  }
  if (currentImagePath && currentImagePath !== stored.key) {
    await removeCaseStudyImage(currentImagePath);
  }
  return linked;
}

/**
 * Create a marketing case study for one landing slot. Raw form fields
 * cross the wire — text, slot, status and metrics are validated in the
 * service; actor and ownership are server-authoritative. An attached image
 * is validated before any row is written, then stored after the row exists.
 */
export async function createCaseStudyAction(formData: FormData): Promise<CaseStudyResult> {
  const user = await getCurrentUser();
  const image = await validateCaseStudyImageInput(formData);
  if (image && !image.ok) return invalidImage(image.message);
  const result = await createCaseStudy(user, caseStudyFormPayload(formData));
  if (!result.ok) return result;
  revalidateCaseStudyPaths(result.caseStudy.id, result.caseStudy.slug);
  if (!image) return result;
  const linked = await storeAndLinkImage(user, result.caseStudy.id, null, image);
  if (linked.ok) revalidateCaseStudyPaths(linked.caseStudy.id, linked.caseStudy.slug);
  return linked;
}

/** Update an existing case study — same validation and revalidation path. */
export async function updateCaseStudyAction(
  caseStudyId: string,
  formData: FormData,
): Promise<CaseStudyResult> {
  const user = await getCurrentUser();
  const image = await validateCaseStudyImageInput(formData);
  if (image && !image.ok) return invalidImage(image.message);
  const result = await updateCaseStudy(user, caseStudyId, caseStudyFormPayload(formData));
  if (!result.ok) return result;
  revalidateCaseStudyPaths(result.caseStudy.id, result.caseStudy.slug);
  if (image) {
    const linked = await storeAndLinkImage(user, caseStudyId, result.caseStudy.imagePath, image);
    if (linked.ok) revalidateCaseStudyPaths(linked.caseStudy.id, linked.caseStudy.slug);
    return linked;
  }
  if (formData.get("removeImage") === "on" && result.caseStudy.imagePath) {
    const cleared = await setCaseStudyImage(user, caseStudyId, null);
    if (!cleared.ok) return partialImage(cleared.message);
    await removeCaseStudyImage(result.caseStudy.imagePath);
    revalidateCaseStudyPaths(cleared.caseStudy.id, cleared.caseStudy.slug);
    return cleared;
  }
  return result;
}

/**
 * Delete a case study. The service decides (RBAC, existence), then the image
 * bytes it owned are dropped from disk and every surface the row fed — the
 * registry, the landing page and its public URL — is revalidated.
 */
export async function deleteCaseStudyAction(caseStudyId: string): Promise<CaseStudyDeleteResult> {
  const user = await getCurrentUser();
  const result = await deleteCaseStudy(user, caseStudyId);
  if (!result.ok) return result;
  if (result.imagePath) await removeCaseStudyImage(result.imagePath);
  revalidateCaseStudyPaths(caseStudyId, result.slug);
  return result;
}

/** Raw blog form fields — the service validates title, slug, body and tags. */
function blogFormPayload(formData: FormData): BlogInput {
  const rawTags = formData.get("tags");
  const tags =
    typeof rawTags === "string"
      ? rawTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    tags,
    status: formData.get("status"),
    imageAlt: formData.get("imageAlt"),
    videoEmbedUrl: formData.get("videoEmbedUrl"),
  };
}

function invalidBlogImage(message: string): BlogResult {
  return { ok: false, error: "invalid", message };
}

/** The post already committed and only a later cover step failed — see `partialImage`. */
function partialBlogImage(detail?: string): BlogResult {
  return {
    ok: false,
    error: "partial",
    message: detail
      ? `The post was saved, but the image failed: ${detail}`
      : "The post was saved, but the image could not be updated.",
  };
}

async function validateBlogImageInput(
  formData: FormData,
): Promise<PreparedImage | ImageFailure | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  return prepareBlogImage(file);
}

/** Store the cover on disk, then link its key — two separately fallible steps. */
async function storeAndLinkBlogImage(
  user: CrmUser | null,
  blogId: string,
  currentImagePath: string | null,
  image: PreparedImage,
): Promise<BlogResult> {
  const stored = await storeBlogImage(blogId, image);
  if (!stored.ok) {
    return partialBlogImage(stored.message);
  }
  const linked = await setBlogPostImage(user, blogId, stored.key);
  if (!linked.ok) {
    await removeBlogImage(stored.key);
    return partialBlogImage(linked.message);
  }
  if (currentImagePath && currentImagePath !== stored.key) {
    await removeBlogImage(currentImagePath);
  }
  return linked;
}

/** Registry, edit surface, feed, sitemap and the public pages read this row. */
function revalidateBlogPaths(blogId: string, slug: string): void {
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${blogId}`);
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog/rss.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

/**
 * Create a blog post. Raw form fields cross the wire — text, slug, status and
 * tags are validated in the service; actor and role are server-authoritative
 * (`getCurrentUser`), so a forged form cannot publish on someone else's
 * behalf. An attached cover is validated before any row is written, then
 * stored and linked once the row exists.
 */
export async function createBlogPostAction(formData: FormData): Promise<BlogResult> {
  const user = await getCurrentUser();
  const image = await validateBlogImageInput(formData);
  if (image && !image.ok) return invalidBlogImage(image.message);
  const result = await createBlogPost(user, blogFormPayload(formData));
  if (!result.ok) return result;
  revalidateBlogPaths(result.post.id, result.post.slug);
  if (!image) return result;
  const linked = await storeAndLinkBlogImage(user, result.post.id, null, image);
  if (linked.ok) revalidateBlogPaths(linked.post.id, linked.post.slug);
  return linked;
}

/** Update an existing post — same validation and revalidation path. */
export async function updateBlogPostAction(
  blogId: string,
  formData: FormData,
): Promise<BlogResult> {
  const user = await getCurrentUser();
  const image = await validateBlogImageInput(formData);
  if (image && !image.ok) return invalidBlogImage(image.message);
  const result = await updateBlogPost(user, blogId, blogFormPayload(formData));
  if (!result.ok) return result;
  revalidateBlogPaths(result.post.id, result.post.slug);
  if (image) {
    const linked = await storeAndLinkBlogImage(user, blogId, result.post.imagePath, image);
    if (linked.ok) revalidateBlogPaths(linked.post.id, linked.post.slug);
    return linked;
  }
  if (formData.get("removeImage") === "on" && result.post.imagePath) {
    const cleared = await setBlogPostImage(user, blogId, null);
    if (!cleared.ok) return partialBlogImage(cleared.message);
    await removeBlogImage(result.post.imagePath);
    revalidateBlogPaths(cleared.post.id, cleared.post.slug);
    return cleared;
  }
  return result;
}

/**
 * Delete a post. The service decides (RBAC, existence), then the cover bytes
 * it owned are dropped from disk and every surface the row fed — registry,
 * feed, sitemap and its public URL — is revalidated.
 */
export async function deleteBlogPostAction(blogId: string): Promise<BlogDeleteResult> {
  const user = await getCurrentUser();
  const result = await deleteBlogPost(user, blogId);
  if (!result.ok) return result;
  if (result.imagePath) await removeBlogImage(result.imagePath);
  revalidateBlogPaths(blogId, result.slug);
  return result;
}

/** Serialisable result — the settings row holds plain strings only. */
export type SiteAssetResult =
  | { ok: true; slot: SiteAssetSlot; settings: SiteSettings }
  | { ok: false; error: string; message?: string };

/**
 * The brand assets feed the public header chrome and the favicon alias, so
 * both caches go: the root layout revalidates every page beneath it, and the
 * settings page re-renders its own form.
 */
function revalidateSiteAssetPaths(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

/**
 * Save (or clear) one brand asset. Bytes are validated and written first and
 * linked only afterwards — a row the service rejects never leaves its file on
 * disk, and a replace drops the previous key's file exactly once. The actor
 * comes from the session, never from the form.
 */
async function saveSiteAsset(slot: SiteAssetSlot, formData: FormData): Promise<SiteAssetResult> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "unauthorized" };

  const file = formData.get("image");
  const removing = formData.get("remove") === "on";

  let image: PreparedImage | null = null;
  if (file instanceof File && file.size > 0) {
    const prepared = await prepareBrandImage(file);
    if (!prepared.ok) return { ok: false, error: "invalid", message: prepared.message };
    image = prepared;
  }
  if (!image && !removing) {
    return { ok: false, error: "invalid", message: "Choose an image to upload." };
  }

  if (image) {
    const stored = await storeBrandImage(slot, image);
    if (!stored.ok) return { ok: false, error: "invalid", message: stored.message };
    const linked = await setSiteAsset(actor, slot, stored.key);
    if (!linked.ok) {
      await removeBrandImage(stored.key);
      return { ok: false, error: linked.error, message: linked.message };
    }
    if (linked.previousKey && linked.previousKey !== stored.key) {
      await removeBrandImage(linked.previousKey);
    }
    revalidateSiteAssetPaths();
    return { ok: true, slot, settings: linked.settings };
  }

  const cleared = await setSiteAsset(actor, slot, null);
  if (!cleared.ok) return { ok: false, error: cleared.error, message: cleared.message };
  if (cleared.previousKey) await removeBrandImage(cleared.previousKey);
  revalidateSiteAssetPaths();
  return { ok: true, slot, settings: cleared.settings };
}

export async function uploadSiteLogoAction(formData: FormData): Promise<SiteAssetResult> {
  return saveSiteAsset("logo", formData);
}

export async function uploadSiteFaviconAction(formData: FormData): Promise<SiteAssetResult> {
  return saveSiteAsset("favicon", formData);
}

function teamFormPayload(formData: FormData, photoUrl?: string | null): TeamInput {
  const order = formData.get("sortOrder");
  return {
    name: formData.get("name"),
    role: formData.get("role"),
    bio: formData.get("bio"),
    linkedinUrl: formData.get("linkedinUrl"),
    published: formData.get("published") === "on",
    sortOrder: typeof order === "string" ? Number(order) : order,
    photoUrl: photoUrl === undefined ? formData.get("photoUrl") : photoUrl,
  };
}

async function teamImageFromForm(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  return prepareTeamImage(file);
}

function revalidateTeam(): void {
  revalidatePath("/admin/team");
  revalidatePath("/");
}

export async function createTeamMemberAction(formData: FormData): Promise<TeamResult> {
  const actor = await getCurrentUser();
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const image = await teamImageFromForm(formData);
  if (image && !image.ok) return { ok: false, error: "invalid", message: image.message };
  const created = await createTeamMember(actor, teamFormPayload(formData, null));
  if (!created.ok) return created;
  if (!image) {
    revalidateTeam();
    return created;
  }
  const stored = await storeTeamImage(image);
  if (!stored.ok) return { ok: false, error: "invalid", message: stored.message };
  const saved = await updateTeamMember(
    actor,
    created.member.id,
    teamFormPayload(formData, stored.key),
  );
  if (!saved.ok) await removeTeamImage(stored.key);
  else revalidateTeam();
  return saved;
}

export async function updateTeamMemberAction(id: string, formData: FormData): Promise<TeamResult> {
  const actor = await getCurrentUser();
  if (!actor || !canMutateLeads(actor.role)) return { ok: false, error: "unauthorized" };
  const image = await teamImageFromForm(formData);
  if (image && !image.ok) return { ok: false, error: "invalid", message: image.message };
  const result = await updateTeamMember(actor, id, teamFormPayload(formData));
  if (!result.ok) return result;
  let saved: TeamResult = result;
  if (image) {
    const stored = await storeTeamImage(image);
    if (!stored.ok) return { ok: false, error: "invalid", message: stored.message };
    saved = await updateTeamMember(actor, id, teamFormPayload(formData, stored.key));
    if (!saved.ok) await removeTeamImage(stored.key);
    else if (result.member.photoUrl) await removeTeamImage(result.member.photoUrl);
  }
  if (saved.ok && formData.get("removeImage") === "on" && result.member.photoUrl && !image) {
    saved = await updateTeamMember(actor, id, teamFormPayload(formData, null));
    if (saved.ok) await removeTeamImage(result.member.photoUrl);
  }
  if (saved.ok) revalidateTeam();
  return saved;
}

export async function deleteTeamMemberAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await getCurrentUser();
  const result = await deleteTeamMember(actor, id);
  if (!result.ok) return result;
  if (result.member.photoUrl) await removeTeamImage(result.member.photoUrl);
  revalidateTeam();
  return { ok: true };
}

export { requireUser };
