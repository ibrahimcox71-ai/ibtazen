import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { canAccessCrm, listProjectsForActor, type ProjectWithRelations } from "@ibtatech/leads";
import {
  CONTRACT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  canProjectStatusNext,
  formatDateTime,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { ProjectStatusActions } from "./project-actions";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function LeadLink({ project }: { project: ProjectWithRelations }) {
  return (
    <Link
      href={`/admin/leads/${project.client.leadId}`}
      className={cn(
        "min-h-11 gap-1 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
        focusRing,
      )}
    >
      {project.client.name}
    </Link>
  );
}

export default async function AdminProjectsPage() {
  const user = await requireUser("/admin/projects");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Projects</h1>
        <ErrorState
          title="Not authorized"
          description="The project registry requires CRM access."
        />
      </div>
    );
  }

  let projects: ProjectWithRelations[] | null = null;
  let unauthorized = false;
  let failed = false;
  try {
    const result = await listProjectsForActor(user);
    if (result.ok) projects = result.projects;
    else unauthorized = true;
  } catch {
    failed = true;
  }

  if (unauthorized || !projects) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Projects</h1>
        {failed ? (
          <ErrorState
            title="Could not load projects"
            description="The database query failed. Try again."
          />
        ) : (
          <ErrorState
            title="Not authorized"
            description="The project registry requires CRM access."
          />
        )}
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Projects</h1>
        <p className="text-sm text-text-secondary">
          {projects.length} delivery project{projects.length === 1 ? "" : "s"} opened from active
          contracts
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Open a project from an active contract on the lead detail page."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[960px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Project
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Client
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Contract
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Start
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Target end
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
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
                      <td className="px-4 py-3 font-medium text-text">
                        <div className="gap-0.5 flex flex-col">
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className={cn(
                              "min-h-11 inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                              focusRing,
                            )}
                            data-testid="project-name"
                          >
                            {project.name}
                          </Link>
                          {project.description && (
                            <span className="text-xs line-clamp-2 text-text-muted">
                              {project.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={PROJECT_STATUS_TONES[project.status] ?? "neutral"}
                          data-testid="project-status"
                        >
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <LeadLink project={project} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="gap-0.5 flex flex-col">
                          <span data-testid="project-contract-title">{project.contract.title}</span>
                          <span className="text-xs text-text-muted">
                            {CONTRACT_STATUS_LABELS[project.contract.status] ??
                              project.contract.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {formatDateTime(project.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {project.startDate ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {project.targetEndDate ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ProjectStatusActions
                          projectId={project.id}
                          currentStatus={project.status}
                          allowedNext={canProjectStatusNext(project.status)}
                        />
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
                          href={`/admin/projects/${project.id}`}
                          className={cn(
                            "font-medium text-accent underline-offset-2 hover:underline",
                            focusRing,
                          )}
                          data-testid="project-name"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs truncate text-text-muted">{project.contract.title}</p>
                      </div>
                      <Badge
                        tone={PROJECT_STATUS_TONES[project.status] ?? "neutral"}
                        data-testid="project-status"
                      >
                        {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                      </Badge>
                    </div>
                    <div className="gap-x-3 gap-y-1 text-xs flex flex-wrap items-center justify-between text-text-secondary">
                      <span>{formatDateTime(project.createdAt)}</span>
                      <LeadLink project={project} />
                    </div>
                    {(project.startDate || project.targetEndDate) && (
                      <p className="text-xs text-text-muted">
                        {project.startDate ?? "—"} → {project.targetEndDate ?? "—"}
                      </p>
                    )}
                    <ProjectStatusActions
                      projectId={project.id}
                      currentStatus={project.status}
                      allowedNext={canProjectStatusNext(project.status)}
                    />
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
