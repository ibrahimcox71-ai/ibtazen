/**
 * CRM roles and authorization helpers. Roles are never accepted from client
 * input — the server loads them from the authenticated AdminUser row.
 */

export const CRM_ROLES = ["admin", "staff"] as const;

export type CrmRole = (typeof CRM_ROLES)[number];

export function isCrmRole(value: string): value is CrmRole {
  return (CRM_ROLES as readonly string[]).includes(value);
}

/** Roles allowed into the admin CRM at all. */
export function canAccessCrm(role: string): boolean {
  return isCrmRole(role);
}

/** Privileged operations reserved for admins (user management, future). */
export function canManageUsers(role: string): boolean {
  return role === "admin";
}

/**
 * Site-wide presentation (brand logo, favicon) — like user management this is
 * an admin-only surface, so a staff account can never re-brand the site.
 */
export function canManageSiteSettings(role: string): boolean {
  return canManageUsers(role);
}

/** Status changes and notes — both CRM roles may act. */
export function canMutateLeads(role: string): boolean {
  return canAccessCrm(role);
}

/** Shape safe to return across the wire — never includes passwordHash. */
export interface CrmUser {
  id: string;
  email: string;
  name: string;
  role: CrmRole;
}

export function toCrmUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): CrmUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: isCrmRole(user.role) ? user.role : "staff",
  };
}

// ── Client portal roles ─────────────────────────────────────────────────

/**
 * Roles allowed into the read-only Client Portal. Deliberately disjoint
 * from `CRM_ROLES`: a portal principal can never pass a CRM gate, and a
 * CRM operator never resolves as a portal user.
 */
export const PORTAL_ROLES = ["client"] as const;

export type PortalRole = (typeof PORTAL_ROLES)[number];

export function isPortalRole(value: string): value is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(value);
}

/** Roles allowed into the client portal at all. */
export function canAccessPortal(role: string): boolean {
  return isPortalRole(role);
}

/**
 * Shape safe to return across the wire — never includes passwordHash.
 * `clientId` is mandatory: a portal user without a linked Client row can
 * be neither authorized nor scoped, so it never becomes a principal.
 */
export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: PortalRole;
  clientId: string;
}

/** Returns null unless the row is a portal role *and* linked to a Client. */
export function toPortalUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  clientId?: string | null;
}): PortalUser | null {
  if (!isPortalRole(user.role) || !user.clientId) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
  };
}
