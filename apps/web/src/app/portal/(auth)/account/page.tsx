import type { Metadata } from "next";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ibtatech/ui";
import { requirePortalUser } from "@/lib/portal/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The only place a portal principal can write anything: their own password.
 * `requirePortalUser` resolves and role-gates the session before render; the
 * form posts back to an action that re-resolves it — no id in the browser.
 */
export default async function PortalAccountPage() {
  const user = await requirePortalUser("/portal/account");

  return (
    <div className="max-w-xl gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Account</h1>
        <p className="text-sm text-text-secondary">Signed in as {user.email}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>
            Your portal password is stored as a salted hash — Ibtatech cannot read it back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <p className="text-xs gap-2 flex items-center text-text-muted">
        <Badge tone="neutral">Read-only</Badge>
        Changing your password does not edit any client record. Need something changed? Reply to
        your Ibtatech contact.
      </p>
    </div>
  );
}
