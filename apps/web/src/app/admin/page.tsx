import { redirect } from "next/navigation";
import { requireUser } from "@/lib/admin/session";

/** Cookie/session dependent — never statically prerendered. */
export const dynamic = "force-dynamic";

/** Protected entry: unauthenticated → login; authenticated → dashboard. */
export default async function AdminIndex() {
  await requireUser("/admin");
  redirect("/admin/dashboard");
}
