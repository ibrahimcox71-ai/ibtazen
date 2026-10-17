import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { listPortalProjects } from "@ibtatech/leads";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES } from "@/lib/admin/labels";
import { formatIsoDate } from "@/lib/portal/labels";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PortalProjectsPage() {
  const user = await requirePortalUser("/portal/projects");
  const result = await listPortalProjects(user);

  if (!result.ok) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Projects</h1>
        <ErrorState
          title="Could not load projects"
          description="Your portal session could not be matched to a client record."
        />
      </div>
    );
  }

  const { projects } = result;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Projects</h1>
        <p className="text-sm text-text-secondary">
          Delivery status for every project opened on your engagements.
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Projects appear once your engagement moves into delivery."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[720px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Project
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Engagement
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Start
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Target end
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-surface-sunken/60"
                      data-testid="project-row"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/portal/projects/${project.id}`}
                          className={cn(
                            "min-h-11 font-medium inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                            focusRing,
                          )}
                          data-testid="project-name"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={PROJECT_STATUS_TONES[project.status] ?? "neutral"}
                          data-testid="project-status"
                        >
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{project.contractTitle}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {project.startDate ? formatIsoDate(project.startDate) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {project.targetEndDate ? formatIsoDate(project.targetEndDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {projects.map((project) => (
              <li key={project.id} data-testid="project-row">
                <Card>
                  <div className="gap-3 p-4 flex flex-col">
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/portal/projects/${project.id}`}
                          className={cn(
                            "font-medium text-accent underline-offset-2 hover:underline",
                            focusRing,
                          )}
                          data-testid="project-name"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs truncate text-text-muted">{project.contractTitle}</p>
                      </div>
                      <Badge
                        tone={PROJECT_STATUS_TONES[project.status] ?? "neutral"}
                        data-testid="project-status"
                      >
                        {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {project.startDate
                        ? `Started ${formatIsoDate(project.startDate)}`
                        : "Not started"}
                      {project.targetEndDate
                        ? ` · target ${formatIsoDate(project.targetEndDate)}`
                        : ""}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
