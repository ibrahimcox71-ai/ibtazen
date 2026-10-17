import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireUser } from "@/lib/admin/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Server-side guard for every authenticated CRM route. Unauthenticated →
 * login redirect (Next.js redirect() throws a control-flow signal that must
 * propagate uncaught); the session cookie alone is never trusted.
 */
export default async function AuthedAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </AdminShell>
  );
}
