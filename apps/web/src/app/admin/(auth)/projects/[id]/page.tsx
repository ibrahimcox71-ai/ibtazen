import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
} from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  canAccessCrm,
  findInvoiceByContractId,
  getContract,
  getProjectForActor,
  type ProjectWithRelations,
} from "@ibtatech/leads";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  INVOICE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  canProjectStatusNext,
  formatDateTime,
  formatMoneyMinor,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { ProjectStatusActions } from "../project-actions";

export const metadata: Metadata = {
  title: "Project detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="gap-0.5 py-2 sm:grid sm:grid-cols-[160px_1fr] sm:gap-4 flex flex-col">
      <dt className="text-xs font-medium tracking-wide text-text-muted uppercase">{label}</dt>
      <dd className="text-sm break-words text-text">{value}</dd>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="gap-4 flex flex-col">
      <h1 className="font-semibold tracking-tight font-display text-title">Project</h1>
      <ErrorState title="Not authorized" description="Project detail requires CRM access." />
    </div>
  );
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/admin/projects/${id}`);

  if (!/^[c][a-z0-9]{20,}$/i.test(id)) notFound();

  if (!canAccessCrm(user.role)) return <AccessDenied />;

  let project: ProjectWithRelations | null = null;
  let unauthorized = false;
  let missing = false;
  let failed = false;

  try {
    const result = await getProjectForActor(user, id);
    if (result.ok) project = result.project;
    else if (result.error === "unauthorized") unauthorized = true;
    else missing = true;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Project</h1>
        <ErrorState
          title="Could not load project"
          description="The database query failed. Try again."
        />
      </div>
    );
  }

  if (missing) notFound();

  if (unauthorized || !project) return <AccessDenied />;

  const contract = await getContract(project.contractId);
  const invoice = await findInvoiceByContractId(project.contractId);
  const status = project.status;
  const allowedNext = canProjectStatusNext(status);
  const leadHref = `/admin/leads/${project.client.leadId}`;
  const clientHref = `/admin/clients/${project.client.id}`;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-3 flex flex-col">
        <nav
          aria-label="Breadcrumb"
          className="gap-1 text-xs flex flex-wrap items-center text-text-muted"
        >
          <Link
            href="/admin/dashboard"
            className={cn("rounded-sm text-text-secondary hover:text-text", focusRing)}
          >
            Admin
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/admin/projects"
            className={cn("rounded-sm text-text-secondary hover:text-text", focusRing)}
          >
            Projects
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text" aria-current="page">
            {project.name}
          </span>
        </nav>
        <Link
          href="/admin/projects"
          className={cn(
            "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to projects
        </Link>
        <div className="gap-3 flex flex-wrap items-start justify-between">
          <div className="min-w-0 gap-1 flex flex-col">
            <h1 className="font-semibold tracking-tight font-display text-title break-words">
              {project.name}
            </h1>
            {project.description && (
              <p className="max-w-2xl text-sm whitespace-pre-wrap text-text-secondary">
                {project.description}
              </p>
            )}
          </div>
          <Badge tone={PROJECT_STATUS_TONES[status] ?? "neutral"} data-testid="project-status">
            {PROJECT_STATUS_LABELS[status] ?? status}
          </Badge>
        </div>
      </div>

      <div className="gap-4 lg:grid-cols-3 grid">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
            <CardDescription>Identity, schedule, and ownership</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-border-subtle">
              <Row
                label="Status"
                value={
                  <Badge tone={PROJECT_STATUS_TONES[status] ?? "neutral"}>
                    {PROJECT_STATUS_LABELS[status] ?? status}
                  </Badge>
                }
              />
              <Row
                label="Start date"
                value={project.startDate ?? <span className="text-text-muted">Not set</span>}
              />
              <Row
                label="Target end"
                value={project.targetEndDate ?? <span className="text-text-muted">Not set</span>}
              />
              <Row label="Created" value={formatDateTime(project.createdAt)} />
              <Row label="Updated" value={formatDateTime(project.updatedAt)} />
              <Row
                label="Created by"
                value={
                  <span>
                    {project.createdBy.name}
                    <span className="text-xs block text-text-muted">{project.createdBy.email}</span>
                  </span>
                }
              />
              <Row
                label="Project ID"
                value={<code className="text-xs break-all text-text-muted">{project.id}</code>}
              />
            </dl>
          </CardContent>
        </Card>

        <div className="gap-4 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Server-validated project transitions only</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectStatusActions
                projectId={project.id}
                currentStatus={status}
                allowedNext={allowedNext}
              />
            </CardContent>
          </Card>

          <div data-testid="project-client-card">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
                <CardDescription>Delivery relationship from conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border-subtle">
                  <Row label="Name" value={project.client.name} />
                  <Row label="Organization" value={project.client.organizationName || "—"} />
                  <Row
                    label="Email"
                    value={
                      project.client.email ? (
                        <a
                          href={`mailto:${project.client.email}`}
                          className="break-all text-accent underline-offset-2 hover:underline"
                        >
                          {project.client.email}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Row
                    label="Client"
                    value={
                      <Link
                        href={clientHref}
                        className="text-accent underline-offset-2 hover:underline"
                        data-testid="project-client-detail-link"
                      >
                        Open client detail
                      </Link>
                    }
                  />
                  <Row
                    label="Lead"
                    value={
                      <Link
                        href={leadHref}
                        className="text-accent underline-offset-2 hover:underline"
                        data-testid="project-lead-link"
                      >
                        Open originating lead
                      </Link>
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>

          <div data-testid="project-contract-card">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contract</CardTitle>
                <CardDescription>
                  Internal commercial snapshot — not project financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border-subtle">
                  <Row label="Title" value={project.contract.title} />
                  <Row
                    label="Status"
                    value={
                      <Badge tone={CONTRACT_STATUS_TONES[project.contract.status] ?? "neutral"}>
                        {CONTRACT_STATUS_LABELS[project.contract.status] ?? project.contract.status}
                      </Badge>
                    }
                  />
                  <Row
                    label="Proposal"
                    value={contract ? `Version ${contract.proposalVersion}` : "—"}
                  />
                  <Row
                    label="Contract total"
                    value={
                      contract ? (
                        <span data-testid="contract-total">
                          {formatMoneyMinor(contract.totalMinor, contract.currency)}
                          <span className="ml-2 text-xs text-text-muted">(contract snapshot)</span>
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Row
                    label="Invoice"
                    value={
                      invoice ? (
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="text-accent underline-offset-2 hover:underline"
                          data-testid="project-invoice-link"
                        >
                          {invoice.invoiceNumber}
                          <span className="ml-2 text-xs text-text-muted">
                            {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-text-muted" data-testid="project-invoice-none">
                          No invoice yet
                        </span>
                      )
                    }
                  />
                  <Row
                    label="Lead"
                    value={
                      <Link
                        href={leadHref}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {project.client.name}
                      </Link>
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
