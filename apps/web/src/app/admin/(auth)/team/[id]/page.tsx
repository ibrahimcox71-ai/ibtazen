import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canMutateLeads, getTeamMemberForActor } from "@ibtatech/leads";
import { ErrorState } from "@ibtatech/ui";
import { requireUser } from "@/lib/admin/session";
import { TeamForm } from "../team-form";

export const metadata: Metadata = { title: "Edit person", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/admin/team/${id}`);
  if (!canMutateLeads(user.role))
    return <ErrorState title="Not authorized" description="You cannot change people profiles." />;
  const result = await getTeamMemberForActor(user, id);
  if (!result.ok) notFound();
  const member = result.member;
  return (
    <div className="gap-5 flex flex-col">
      <div>
        <h1 className="font-semibold font-display text-title">Edit {member.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Changes appear on the homepage after saving.
        </p>
      </div>
      <TeamForm initial={member} />
    </div>
  );
}
