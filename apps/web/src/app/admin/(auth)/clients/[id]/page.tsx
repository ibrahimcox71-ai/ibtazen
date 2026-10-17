import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Inbox, FolderKanban, KeyRound, Receipt, Users } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
} from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  canAccessCrm,
  canContractTransition,
  canManageUsers,
  getPortalAccessForActor,
  getClientDetailForActor,
  type ClientDetail,
  type ContractStatus,
  type PortalAccess,
} from "@ibtatech/leads";
import {
  ACTIVITY_LABELS,
  ACTIVITY_TONES,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
  SOURCE_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
  describeActivity,
  formatDateTime,
  formatMoneyMinor,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { ContractCard } from "../../leads/[id]/contract-card";
import { PortalAccessForm } from "./portal-access-form";

export const metadata: Metadata = {
  title: "Client detail",
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
      <h1 className="font-semibold tracking-tight font-display text-title">Client</h1>
      <ErrorState title="Not authorized" description="Client detail requires CRM access." />
    </div>
  );
}

/** Server-authoritative next steps — mirrors the lead-detail contract card. */
function contractAllowedNext(status: string): ContractStatus[] {
  return (["out_for_signature", "active", "void"] as ContractStatus[]).filter((to) =>
    canContractTransition(status as ContractStatus, to),
  );
}

function OverviewTile({
  href,
  label,
  count,
  detail,
  icon,
  testId,
}: {
  href: string;
  label: string;
  count: number;
  detail: string;
  icon: React.ReactNode;
  testId: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "p-4 rounded-lg border border-border-subtle bg-surface transition-colors hover:bg-surface-sunken",
        focusRing,
      )}
      data-testid={testId}
    >
      <div className="gap-2 flex flex-col">
        <div className="gap-2 flex items-center justify-between">
          <span className="gap-2 text-sm font-medium flex items-center text-text">
            <span aria-hidden className="text-accent">
              {icon}
            </span>
            {label}
          </span>
          <Badge tone="neutral">{count}</Badge>
        </div>
        <p className="text-xs text-text-muted">{detail}</p>
      </div>
    </Link>
  );
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/admin/clients/${id}`);

  if (!/^[c][a-z0-9]{20,}$/i.test(id)) notFound();

  if (!canAccessCrm(user.role)) return <AccessDenied />;

  let detail: ClientDetail | null = null;
  let unauthorized = false;
  let missing = false;
  let failed = false;

  try {
    const result = await getClientDetailForActor(user, id);
    if (result.ok) detail = result.detail;
    else if (result.error === "unauthorized") unauthorized = true;
    else missing = true;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Client</h1>
        <ErrorState
          title="Could not load client"
          description="The database query failed. Try again."
        />
      </div>
    );
  }

  if (missing) notFound();

  if (unauthorized || !detail) return <AccessDenied />;

  const { client, contracts, projects, invoices, activities } = detail;
  const leadHref = `/admin/leads/${client.leadId}`;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const paidInvoices = invoices.filter((i) => i.status === "paid").length;
  const sourceLabel = SOURCE_LABELS[client.lead.source] ?? client.lead.source;

  // Portal provisioning is user management — admin-only, never shown to staff.
  let portalAccess: PortalAccess | null = null;
  if (canManageUsers(user.role)) {
    const access = await getPortalAccessForActor(user, client.id);
    portalAccess = access.ok ? access.access : null;
  }

  return (
    <div className="gap-6 flex flex-col" data-testid="client-detail">
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
            href="/admin/clients"
            className={cn("rounded-sm text-text-secondary hover:text-text", focusRing)}
          >
            Clients
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text" aria-current="page">
            {client.name}
          </span>
        </nav>
        <Link
          href="/admin/clients"
          className={cn(
            "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to clients
        </Link>
        <div className="gap-3 flex flex-wrap items-start justify-between">
          <div className="min-w-0 gap-1 flex flex-col">
            <h1 className="font-semibold tracking-tight font-display text-title break-words">
              {client.name}
            </h1>
            <p className="max-w-2xl text-sm text-text-secondary">
              {client.organizationName || client.email}
            </p>
          </div>
          <div className="gap-2 flex flex-wrap items-center">
            <Badge
              tone={STATUS_TONES[client.lead.status] ?? "neutral"}
              data-testid="client-lead-status"
            >
              {STATUS_LABELS[client.lead.status] ?? client.lead.status}
            </Badge>
            <Badge tone="neutral">{sourceLabel}</Badge>
            <Link
              href={leadHref}
              className={cn(
                "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex items-center rounded-md text-accent hover:underline",
                focusRing,
              )}
              data-testid="client-lead-link"
            >
              Open originating lead
            </Link>
          </div>
        </div>
      </div>

      <section aria-label="Commercial overview" className="gap-3 flex flex-col">
        <h2 className="text-sm font-semibold text-text-secondary">Commercial overview</h2>
        <div className="gap-3 sm:grid-cols-3 grid grid-cols-1">
          <OverviewTile
            testId="client-overview-contracts"
            href="#contracts"
            label="Contracts"
            count={contracts.length}
            detail="All contracts for this client"
            icon={<Inbox aria-hidden className="size-4" />}
          />
          <OverviewTile
            testId="client-overview-projects"
            href="#projects"
            label="Projects"
            count={projects.length}
            detail={`${activeProjects} active`}
            icon={<FolderKanban aria-hidden className="size-4" />}
          />
          <OverviewTile
            testId="client-overview-invoices"
            href="#invoices"
            label="Invoices"
            count={invoices.length}
            detail={`${paidInvoices} paid`}
            icon={<Receipt aria-hidden className="size-4" />}
          />
        </div>
      </section>

      <div className="gap-4 lg:grid-cols-3 grid">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="gap-2 text-base flex items-center">
              <Users aria-hidden className="size-4 text-accent" />
              Client profile
            </CardTitle>
            <CardDescription>Snapshot copied from the originating lead</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-border-subtle">
              <Row label="Name" value={client.name} />
              <Row
                label="Email"
                value={
                  <a
                    href={`mailto:${client.email}`}
                    className="break-all text-accent underline-offset-2 hover:underline"
                  >
                    {client.email}
                  </a>
                }
              />
              <Row
                label="Phone"
                value={
                  client.phone ? (
                    <a
                      href={`tel:${client.phone}`}
                      className="break-all text-accent underline-offset-2 hover:underline"
                    >
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )
                }
              />
              <Row
                label="Organization"
                value={client.organizationName || <span className="text-text-muted">—</span>}
              />
              <Row label="Source" value={sourceLabel} />
              <Row
                label="Lead status"
                value={STATUS_LABELS[client.lead.status] ?? client.lead.status}
              />
              <Row
                label="Converted from"
                value={
                  client.sourceStatus
                    ? (STATUS_LABELS[client.sourceStatus] ?? client.sourceStatus)
                    : "—"
                }
              />
              <Row label="Converted" value={formatDateTime(client.createdAt)} />
              <Row
                label="Converted by"
                value={
                  <span>
                    {client.createdBy.name}
                    <span className="text-xs block text-text-muted">{client.createdBy.email}</span>
                  </span>
                }
              />
              <Row
                label="Lead"
                value={
                  <Link
                    href={leadHref}
                    className="text-accent underline-offset-2 hover:underline"
                    data-testid="client-profile-lead-link"
                  >
                    {client.lead.name}
                  </Link>
                }
              />
              <Row
                label="Client ID"
                value={<code className="text-xs break-all text-text-muted">{client.id}</code>}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relationships</CardTitle>
            <CardDescription>One client, every contract</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border-subtle">
              <Row
                label="Contracts"
                value={<span data-testid="client-relationship-contracts">{contracts.length}</span>}
              />
              <Row
                label="Projects"
                value={<span data-testid="client-relationship-projects">{projects.length}</span>}
              />
              <Row
                label="Invoices"
                value={<span data-testid="client-relationship-invoices">{invoices.length}</span>}
              />
              <Row label="Created" value={formatDateTime(client.createdAt)} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {canManageUsers(user.role) && (
        <Card data-testid="portal-access-card">
          <CardHeader>
            <CardTitle className="gap-2 text-base flex items-center">
              <KeyRound aria-hidden className="size-4 text-accent" />
              Client portal access
            </CardTitle>
            <CardDescription>
              Read-only login for /portal — proposals, projects and invoices for this client
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-4 flex flex-col">
            <div className="gap-2 text-sm flex flex-wrap items-center">
              {portalAccess?.provisioned ? (
                <>
                  <Badge tone={portalAccess.active ? "success" : "warning"}>
                    {portalAccess.active ? "Active" : "Disabled"}
                  </Badge>
                  <span className="text-text-secondary">
                    {portalAccess.email}
                    {portalAccess.createdAt
                      ? ` · created ${formatDateTime(portalAccess.createdAt)}`
                      : ""}
                  </span>
                </>
              ) : (
                <Badge tone="neutral">No portal login yet</Badge>
              )}
            </div>
            <PortalAccessForm
              clientId={client.id}
              clientEmail={client.email}
              provisioned={Boolean(portalAccess?.provisioned)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contracts</CardTitle>
          <CardDescription>
            {contracts.length === 0
              ? "No contracts yet for this client"
              : `${contracts.length} contract${contracts.length === 1 ? "" : "s"} — every accepted proposal can carry its own`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No contracts yet"
              description="Accept a proposal and create a contract from the originating lead."
            />
          ) : (
            <ul className="gap-4 flex flex-col" data-testid="client-contract-list">
              {contracts.map((contract) => (
                <li
                  key={contract.id}
                  className="p-4 rounded-lg border border-border-subtle bg-surface-sunken"
                  data-testid="client-contract-item"
                  data-contract-id={contract.id}
                >
                  <div className="mb-3 gap-2 flex flex-wrap items-center justify-between">
                    <div className="gap-2 flex flex-wrap items-center">
                      <Badge
                        tone={CONTRACT_STATUS_TONES[contract.status] ?? "neutral"}
                        data-testid="client-contract-status"
                      >
                        {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                      </Badge>
                      <Badge tone="neutral">Proposal v{contract.proposalVersion}</Badge>
                    </div>
                    <code className="text-xs break-all text-text-muted">{contract.id}</code>
                  </div>
                  <ContractCard
                    clientId={client.id}
                    clientName={contract.clientName}
                    clientEmail={contract.clientEmail}
                    organizationName={contract.organizationName}
                    acceptedProposal={null}
                    contract={contract}
                    allowedNext={contractAllowedNext(contract.status)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
          <CardDescription>
            {projects.length === 0
              ? "No delivery projects yet"
              : `${projects.length} project${projects.length === 1 ? "" : "s"} across every contract`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Open a delivery project from an active contract on the lead page."
            />
          ) : (
            <ul className="gap-3 flex flex-col" data-testid="client-project-list">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="gap-2 p-4 sm:flex-row sm:items-center sm:justify-between flex flex-col rounded-lg border border-border-subtle bg-surface-sunken"
                  data-testid="client-project-item"
                  data-project-id={project.id}
                >
                  <div className="min-w-0 gap-1 flex flex-col">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className={cn(
                        "text-sm font-medium w-fit break-words text-accent underline-offset-2 hover:underline",
                        focusRing,
                      )}
                      data-testid="client-project-link"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs break-words text-text-muted">{project.contract.title}</p>
                  </div>
                  <div className="gap-x-4 gap-y-1 text-xs flex flex-wrap items-center text-text-secondary">
                    <Badge
                      tone={PROJECT_STATUS_TONES[project.status] ?? "neutral"}
                      data-testid="client-project-status"
                    >
                      {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                    </Badge>
                    <span>Start {project.startDate ?? "—"}</span>
                    <span>Target {project.targetEndDate ?? "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>
            {invoices.length === 0
              ? "No invoices yet"
              : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} resolved through contract`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Create an invoice from an active contract on the lead page."
            />
          ) : (
            <ul className="gap-3 flex flex-col" data-testid="client-invoice-list">
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="gap-2 p-4 sm:flex-row sm:items-center sm:justify-between flex flex-col rounded-lg border border-border-subtle bg-surface-sunken"
                  data-testid="client-invoice-item"
                  data-invoice-id={invoice.id}
                >
                  <div className="min-w-0 gap-1 flex flex-col">
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className={cn(
                        "text-sm font-medium w-fit break-words text-accent underline-offset-2 hover:underline",
                        focusRing,
                      )}
                      data-testid="client-invoice-link"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs break-words text-text-muted">{invoice.contract.title}</p>
                  </div>
                  <div className="gap-x-4 gap-y-1 text-xs flex flex-wrap items-center text-text-secondary">
                    <Badge
                      tone={INVOICE_STATUS_TONES[invoice.status] ?? "neutral"}
                      data-testid="client-invoice-status"
                    >
                      {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                    </Badge>
                    <span
                      className="whitespace-nowrap text-text"
                      data-testid="client-invoice-total"
                    >
                      {formatMoneyMinor(invoice.totalMinor, invoice.currency)}
                    </span>
                    <span>Issued {invoice.issueDate}</span>
                    <span>Due {invoice.dueDate ?? "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
          <CardDescription>
            Append-only commercial history from the originating lead, newest first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Status changes, contracts, projects, and invoices appear here."
            />
          ) : (
            <ol className="gap-3 flex flex-col" data-testid="client-timeline">
              {activities.map((activity) => (
                <li
                  key={activity.id}
                  className="p-3 rounded-lg border border-border-subtle bg-surface-sunken"
                  data-testid="client-timeline-item"
                  data-activity-type={activity.type}
                >
                  <div className="gap-2 text-xs flex flex-wrap items-center justify-between text-text-muted">
                    <Badge tone={ACTIVITY_TONES[activity.type] ?? "neutral"}>
                      {ACTIVITY_LABELS[activity.type] ?? activity.type}
                    </Badge>
                    <time dateTime={activity.createdAt.toISOString()}>
                      {formatDateTime(activity.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 text-sm text-text">{describeActivity(activity)}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    by {activity.actor.name} ({activity.actor.email})
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
