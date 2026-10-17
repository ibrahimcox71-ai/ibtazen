import type { Metadata } from "next";
import { canMutateLeads } from "@ibtatech/leads";
import { ErrorState } from "@ibtatech/ui";
import { requireUser } from "@/lib/admin/session";
import { TeamForm } from "../team-form";

export const metadata: Metadata = { title: "Add person", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage() {
  const user = await requireUser("/admin/team/new");
  if (!canMutateLeads(user.role))
    return <ErrorState title="Not authorized" description="You cannot change people profiles." />;
  return (
    <div className="gap-5 flex flex-col">
      <div>
        <h1 className="font-semibold font-display text-title">Add person</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Profiles stay off the homepage until published with a photo.
        </p>
      </div>
      <TeamForm />
    </div>
  );
}
