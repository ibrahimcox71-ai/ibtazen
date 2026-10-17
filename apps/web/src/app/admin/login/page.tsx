import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ensureBootstrapAdmin } from "@ibtatech/leads";
import { Card, CardContent, CardHeader, CardTitle } from "@ibtatech/ui";
import { getCurrentUser } from "@/lib/admin/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

/** Bootstrap + cookie handling — must not be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Safe first-run helper: only creates a user when the table is empty and
  // bootstrap credentials are present in the environment.
  await ensureBootstrapAdmin();

  // Valid session → leave login. Invalid/forged cookies stay put (RSC cannot
  // delete cookies) but simply show the form — no proxy bounce loop.
  const user = await getCurrentUser();
  if (user) {
    const { next } = await searchParams;
    const dest =
      typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/admin/dashboard";
    redirect(dest);
  }

  const { next } = await searchParams;

  return (
    <div className="px-4 py-12 flex min-h-dvh flex-col items-center justify-center bg-surface-sunken">
      <div className="max-w-md w-full">
        <div className="mb-6 gap-2 flex flex-col items-center text-center">
          <p className="font-semibold tracking-tight font-display text-title">Ibtatech</p>
          <p className="text-sm text-text-secondary">Internal CRM — authorised personnel only</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
