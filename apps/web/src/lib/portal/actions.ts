"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  changePortalPassword,
  loginPortal,
  respondToPortalProposal,
  type ChangePasswordResult,
  type PortalLoginResult,
  type PortalProposalResponseResult,
} from "@ibtatech/leads";
import { getSessionToken } from "@/lib/admin/session";
import { getClientIp } from "@/lib/lead-action";
import { endPortalSession, getCurrentPortalUser, setSessionCookie } from "@/lib/portal/session";

export type { ChangePasswordResult, PortalLoginResult, PortalProposalResponseResult };

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

export async function loginPortalAction(
  _prev: PortalLoginResult | null,
  formData: FormData,
): Promise<PortalLoginResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/portal";

  let result: PortalLoginResult;
  try {
    result = await loginPortal(
      typeof email === "string" ? email : "",
      typeof password === "string" ? password : "",
      await getClientIp(),
    );
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    console.error("[portal] login failed unexpectedly", error);
    return { ok: false, error: "invalid_credentials" };
  }

  if (result.ok) {
    await setSessionCookie(result.token, result.expiresAt);
    // redirect() throws NEXT_REDIRECT — leave uncaught so App Router navigates.
    redirect(next);
  }
  return result;
}

export async function logoutPortalAction(): Promise<void> {
  try {
    await endPortalSession();
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    console.error("[portal] logout session error", error);
  }
  redirect("/portal/login");
}

/**
 * Self-service password change. The principal and the session token both
 * come from the cookie server-side — the form only ever carries the two
 * passwords, never an id.
 */
export async function changePortalPasswordAction(
  _prev: ChangePasswordResult | null,
  formData: FormData,
): Promise<ChangePasswordResult> {
  const actor = await getCurrentPortalUser();
  if (!actor) {
    return { ok: false, error: "unauthorized", message: "Your session expired — sign in again." };
  }

  try {
    return await changePortalPassword(
      actor,
      {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
      },
      { ip: await getClientIp(), currentSessionToken: await getSessionToken() },
    );
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    console.error("[portal] password change failed unexpectedly", error);
    return { ok: false, error: "invalid", message: "The new password could not be saved." };
  }
}

/**
 * Accept or decline a proposal from the portal. The proposal id and the
 * decision are the only form inputs — the principal, the Client scope and
 * the `sent`-only guard are all resolved server-side from the session.
 */
export async function respondToPortalProposalAction(
  proposalId: string,
  decision: "accept" | "decline",
): Promise<PortalProposalResponseResult> {
  const actor = await getCurrentPortalUser();
  if (!actor) {
    return { ok: false, error: "unauthorized", message: "Your session expired — sign in again." };
  }

  try {
    const result = await respondToPortalProposal(actor, proposalId, decision);
    if (result.ok) {
      revalidatePath(`/portal/proposals/${proposalId}`);
      revalidatePath("/portal/proposals");
      revalidatePath("/portal/overview");
    }
    return result;
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    console.error("[portal] proposal response failed unexpectedly", error);
    return { ok: false, error: "invalid", message: "Your response could not be recorded." };
  }
}
