import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { canAccessCrm, canMutateLeads, listTeamMembersForActor } from "@ibtatech/leads";
import { requireUser } from "@/lib/admin/session";
import { DeleteTeamMemberButton } from "./team-list-actions";

export const metadata: Metadata = { title: "People", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const user = await requireUser("/admin/team");
  if (!canAccessCrm(user.role))
    return (
      <ErrorState title="Not authorized" description="People management requires CRM access." />
    );
  const result = await listTeamMembersForActor(user);
  if (!result.ok)
    return (
      <ErrorState title="Could not load people" description="The registry requires CRM access." />
    );
  const canEdit = canMutateLeads(user.role);
  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">People</h1>
        <p className="text-sm text-text-secondary">
          Manage founder and team profiles shown on the homepage.
        </p>
      </div>
      {canEdit && (
        <div>
          <ButtonLink href="/admin/team/new">
            <Plus aria-hidden className="size-4" />
            Add person
          </ButtonLink>
        </div>
      )}
      {result.members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No people added"
          description="Create a profile when you are ready to publish one."
        />
      ) : (
        <ul className="gap-3 sm:grid-cols-2 xl:grid-cols-3 grid">
          {result.members.map((member) => (
            <li key={member.id}>
              <Card className="gap-3 p-4 flex h-full flex-col">
                <div className="gap-3 flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-text">{member.name}</h2>
                    <p className="text-sm text-text-secondary">{member.role}</p>
                  </div>
                  <Badge tone={member.published && member.photoUrl ? "success" : "neutral"}>
                    {member.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted">
                  Order {member.sortOrder}
                  {!member.photoUrl ? " · Photo required for homepage" : ""}
                </p>
                {canEdit && (
                  <div className="gap-4 mt-auto flex items-center">
                    <Link
                      className="min-h-11 text-sm inline-flex items-center text-accent underline"
                      href={`/admin/team/${member.id}`}
                    >
                      Edit
                    </Link>
                    <DeleteTeamMemberButton id={member.id} name={member.name} />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
