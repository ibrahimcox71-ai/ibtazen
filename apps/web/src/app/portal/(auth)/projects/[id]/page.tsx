import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { getPortalProject } from "@ibtatech/leads";
import {
  CONTRACT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
} from "@/lib/admin/labels";
import { formatIsoDate } from "@/lib/portal/labels";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser("/portal/projects");
  const { id } = await params;
  if (!cuidLike.test(id)) notFound();

  const result = await getPortalProject(user, id);
  if (!result.ok) notFound();
  const project = result.project;

  const meta = [
    { label: "Status", value: PROJECT_STATUS_LABELS[project.status] ?? project.status },
    { label: "Engagement", value: project.contractTitle },
    {
      label: "Contract",
      value: CONTRACT_STATUS_LABELS[project.contractStatus] ?? project.contractStatus,
    },
    {
      label: "Target end",
      value: project.targetEndDate ? formatIsoDate(project.targetEndDate) : "—",
    },
  ];

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-4 flex flex-col">
        <Link
          href="/portal/projects"
          className={cn(
            "min-h-11 gap-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          All projects
        </Link>
        <div className="gap-3 sm:flex-row sm:items-start sm:justify-between flex flex-col">
          <div className="gap-1.5 flex flex-col">
            <h1
              className="font-semibold tracking-tight font-display text-title"
              data-testid="project-name"
            >
              {project.name}
            </h1>
            <p className="text-sm text-text-secondary">
              Started {project.startDate ? formatIsoDate(project.startDate) : "—"}
            </p>
          </div>
          <Badge
            tone={PROJECT_STATUS_TONES[project.status] ?? "neutral"}
            data-testid="project-status"
          >
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </Badge>
        </div>
      </div>

      <div className="gap-3 sm:grid-cols-2 xl:grid-cols-4 grid grid-cols-2">
        {meta.map((row) => (
          <Card key={row.label} className="p-4">
            <div className="gap-2 flex flex-col">
              <span className="text-xs tracking-wide text-text-muted uppercase">{row.label}</span>
              <p className="text-sm font-medium text-text">{row.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About this project</CardTitle>
          <CardDescription>Scope as agreed with Ibtatech</CardDescription>
        </CardHeader>
        <CardContent>
          {project.description ? (
            <p className="text-sm whitespace-pre-wrap text-text-secondary">{project.description}</p>
          ) : (
            <p className="text-sm text-text-muted">
              No description recorded yet — your Ibtatech contact will add scope details here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
