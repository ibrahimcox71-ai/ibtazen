import { getClient } from "@ibtatech/leads";
import { PortalShell } from "@/components/portal/portal-shell";
import { requirePortalUser } from "@/lib/portal/session";

/**
 * Authenticated portal chrome. `requirePortalUser` resolves the session
 * server-side and role-gates it (portal role + linked Client only) before
 * anything inside renders. Redirect must propagate uncaught.
 */
export default async function AuthedPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalUser();
  const client = await getClient(user.clientId);

  return (
    <PortalShell
      user={{
        name: user.name,
        email: user.email,
        organizationName: client?.organizationName ?? null,
      }}
    >
      {children}
    </PortalShell>
  );
}
