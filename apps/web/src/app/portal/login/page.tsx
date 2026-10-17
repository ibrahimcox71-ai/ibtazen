import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@ibtatech/ui";
import { getCurrentPortalUser } from "@/lib/portal/session";
import { PortalLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Client portal sign in",
  robots: { index: false, follow: false },
};

/** Cookie handling — must not be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Valid session → leave login. Invalid/forged cookies stay put (RSC cannot
  // delete cookies) but simply show the form — no proxy bounce loop.
  const user = await getCurrentPortalUser();
  if (user) {
    const { next } = await searchParams;
    const dest =
      typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/portal";
    redirect(dest);
  }

  const { next } = await searchParams;

  return (
    <div className="px-4 py-12 flex min-h-dvh flex-col items-center justify-center bg-surface-sunken">
      <div className="max-w-md w-full">
        <div className="mb-6 gap-2 flex flex-col items-center text-center">
          <p className="font-semibold tracking-tight font-display text-title">Ibtatech</p>
          <p className="text-sm text-text-secondary">
            Client portal — proposals, projects and invoices for your organisation
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <PortalLoginForm next={typeof next === "string" ? next : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
