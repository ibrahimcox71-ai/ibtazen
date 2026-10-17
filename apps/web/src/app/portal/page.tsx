import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PortalIndexPage() {
  await requirePortalUser("/portal");
  redirect("/portal/overview");
}
