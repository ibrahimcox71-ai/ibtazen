import "server-only";
import { redirect } from "next/navigation";
import { logoutSession, resolvePortalSession, type PortalUser } from "@ibtatech/leads";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "@/lib/admin/session";

/**
 * Client Portal session helpers. Cookie primitives are shared with the
 * admin session module (one `ibtatech_session` cookie), but resolution is
 * role-specific: `resolvePortalSession` only ever accepts a portal-role
 * user linked to a Client, so an admin session never opens portal routes
 * and vice versa.
 */

/** Server-side session validation — never trusts the cookie alone. */
export async function getCurrentPortalUser(): Promise<PortalUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return resolvePortalSession(token);
}

/**
 * Layout/page guard: unauthenticated visitors go to portal login. Invalid
 * cookies are left in place here (Server Components may only read cookies)
 * and simply show the login form — no proxy bounce loop.
 */
export async function requirePortalUser(nextPath?: string): Promise<PortalUser> {
  const token = await getSessionToken();
  const user = token ? await resolvePortalSession(token) : null;
  if (!user) {
    const params =
      nextPath && nextPath !== "/portal" ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/portal/login${params}`);
  }
  return user;
}

export async function endPortalSession(): Promise<void> {
  const token = await getSessionToken();
  await logoutSession(token);
  await clearSessionCookie();
}

export { setSessionCookie };
