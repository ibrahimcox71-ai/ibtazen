import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge-level gate: presence check only (no DB on the edge). The real
 * session validation — token hash, expiry, revocation, active user, role —
 * runs server-side in the admin/portal layouts and every privileged action.
 *
 * Login is intentionally NOT bounced away just because a cookie exists:
 * a forged/invalid cookie would then loop (login → dashboard → login).
 * Already-authenticated visitors are redirected from the login page in
 * RSC via `getCurrentUser()` / `getCurrentPortalUser()`, which can
 * actually validate the session.
 *
 * Admin (`/admin`) and Client Portal (`/portal`) share the same cookie
 * name but never the same principal: each layout resolves its own role.
 */
const GATED_AREAS = [
  { prefix: "/admin", publicRoutes: ["/admin/login"], login: "/admin/login" },
  { prefix: "/portal", publicRoutes: ["/portal/login"], login: "/portal/login" },
] as const;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = GATED_AREAS.find(
    (a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`),
  );
  if (!area) return NextResponse.next();

  const isPublic = area.publicRoutes.some(
    (route) => pathname === route || pathname === `${route}/`,
  );
  if (isPublic) return NextResponse.next();

  const session = request.cookies.get("ibtatech_session")?.value;
  if (!session) {
    const login = new URL(area.login, request.url);
    if (pathname !== area.prefix) login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
