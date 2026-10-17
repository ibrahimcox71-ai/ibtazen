import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ensureBootstrapAdmin,
  logoutSession,
  resolveSession,
  SESSION_TTL_SECONDS,
  type CrmUser,
} from "@ibtatech/leads";

export const SESSION_COOKIE = "ibtatech_session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: Math.min(SESSION_TTL_SECONDS, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/** Server-side session validation — never trusts the cookie alone. */
export async function getCurrentUser(): Promise<CrmUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return resolveSession(token);
}

/**
 * Layout/page guard: unauthenticated users go to login. The session cookie
 * alone is never trusted. Cookie *clearing* cannot run here — Server
 * Components may only read cookies; invalid cookies are overwritten on the
 * next successful login (or by logoutAction).
 * Always pair with an authorization check inside privileged mutations.
 */
export async function requireUser(nextPath?: string): Promise<CrmUser> {
  await ensureBootstrapAdmin();
  const token = await getSessionToken();
  const user = token ? await resolveSession(token) : null;
  if (!user) {
    const params =
      nextPath && nextPath !== "/admin/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/admin/login${params}`);
  }
  return user;
}

export async function endSession(): Promise<void> {
  const token = await getSessionToken();
  await logoutSession(token);
  await clearSessionCookie();
}
