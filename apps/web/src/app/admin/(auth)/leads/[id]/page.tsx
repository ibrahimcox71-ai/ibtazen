import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  LEAD_STATUSES,
  canContractTransition,
  canTransition,
  findAcceptedProposal,
  findClientByLeadId,
  findInvoiceByContractId,
  findProjectByContractId,
  followUpState,
  getLead,
  listContractsByClientId,
  listCrmAssignees,
  listLeadActivities,
  listLeadCrmNotes,
  listLeadFollowUps,
  listLeadProposals,
  type ContractStatus,
  type LeadPipelineStatus,
} from "@ibtatech/leads";
import {
  STATUS_LABELS,
  STATUS_TONES,
  SOURCE_LABELS,
  TIMELINE_LABELS,
  BUDGET_LABELS,
  SERVICE_SLUG_LABELS,
  AUDIT_KIND_LABELS,
  AD_PLATFORM_LABELS,
  AD_SPEND_LABELS,
  ACTIVITY_LABELS,
  ACTIVITY_TONES,
  FOLLOW_UP_TONES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  PROJECT_STATUS_LABELS,
  describeActivity,
  formatDateTime,
  formatMoneyMinor,
  parseDetail,
  detailLabel,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { StatusForm } from "./status-form";
import { NotesForm } from "./notes-form";
import { AssignForm } from "./assign-form";
import { FollowUpForm } from "./follow-up-form";
import { FollowUpCompleteButton } from "./follow-up-complete";
import { ProposalList } from "./proposal-list";
import { ConvertToClientCard } from "./convert-to-client";
import { ContractCard } from "./contract-card";
import { CreateProjectCard } from "../../projects/project-actions";
import { CreateInvoiceButton } from "../../invoices/invoice-actions";

export const metadata: Metadata = {
  title: "Lead detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function statusSelectOptions(current: string) {
  return LEAD_STATUSES.map((status) => ({
    value: status,
    label:
      status === current
        ? `${STATUS_LABELS[status] ?? status} (current)`
        : (STATUS_LABELS[status] ?? status),
  }));
}

function allowedTransitions(current: string) {
  if (!(LEAD_STATUSES as readonly string[]).includes(current)) return [];
  return LEAD_STATUSES.filter((to) => canTransition(current as LeadPipelineStatus, to)).map(
    (status) => ({
      value: status,
      label: STATUS_LABELS[status] ?? status,
    }),
  );
}

function specializeDetailValue(key: string, value: string): string {
  if (key === "auditKind") return AUDIT_KIND_LABELS[value] ?? value;
  if (key === "adPlatform") return AD_PLATFORM_LABELS[value] ?? value;
  if (key === "monthlyAdSpend") return AD_SPEND_LABELS[value] ?? value;
  if (key === "budgetBand") return BUDGET_LABELS[value] ?? value;
  if (key === "timeline") return TIMELINE_LABELS[value] ?? value;
  return value;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="gap-0.5 py-2 sm:grid sm:grid-cols-[160px_1fr] sm:gap-4 flex flex-col">
      <dt className="text-xs font-medium tracking-wide text-text-muted uppercase">{label}</dt>
      <dd className="text-sm break-words text-text">{value}</dd>
    </div>
  );
}

/** Only http(s) URLs become links — blocks javascript:/data: even if legacy rows exist. */
function safeExternalUrl(raw: string | null): React.ReactNode {
  if (!raw) return "—";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return raw;
  return (
    <a
      href={parsed.toString()}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="break-all text-accent underline-offset-2 hover:underline"
    >
      {raw}
    </a>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/admin/leads/${id}`);

  // Reject non-cuid-ish ids early without leaking existence details to clients
  // that cannot hold a real id anyway (cuid format check).
  if (!/^[c][a-z0-9]{20,}$/i.test(id)) notFound();

  const [lead, notes, assignees, activities, followUps, proposals, client] = await Promise.all([
    getLead(id),
    listLeadCrmNotes(id),
    listCrmAssignees(),
    listLeadActivities(id),
    listLeadFollowUps(id),
    listLeadProposals(id),
    findClientByLeadId(id),
  ]);
  if (!lead) notFound();

  const [acceptedProposal, contracts] = await Promise.all([
    findAcceptedProposal(id),
    client ? listContractsByClientId(client.id) : Promise.resolve([]),
  ]);
  const contract = contracts[0] ?? null;
  const existingProject = contract ? await findProjectByContractId(contract.id) : null;
  const existingInvoice = contract ? await findInvoiceByContractId(contract.id) : null;

  const assignedToName = lead.assignedTo?.name ?? null;
  const status = lead.status;
  const allowedNext = allowedTransitions(status);
  const detailRows = parseDetail(lead.detail);
  const serviceFromDetail =
    detailRows.find((row) => row.key === "service")?.value ??
    detailRows.find((row) => row.key === "services")?.value ??
    null;
  const canWinLead =
    (LEAD_STATUSES as readonly string[]).includes(status) &&
    canTransition(status as LeadPipelineStatus, "won");

  const contractAllowedNext = contract
    ? (["out_for_signature", "active", "void"] as ContractStatus[]).filter((to) =>
        canContractTransition(contract.status as ContractStatus, to),
      )
    : [];

  const now = new Date();
  const openFollowUps = followUps.filter((f) => !f.completedAt);
  const completedFollowUps = followUps.filter((f) => f.completedAt);

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-3 flex flex-col">
        <Link
          href="/admin/leads"
          className={cn(
            "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to leads
        </Link>
        <div className="gap-3 flex flex-wrap items-start justify-between">
          <div className="gap-1 flex flex-col">
            <h1 className="font-semibold tracking-tight font-display text-title break-words">
              {lead.name}
            </h1>
            <p className="text-sm text-text-secondary">{lead.email}</p>
          </div>
          <div className="gap-2 flex flex-wrap items-center">
            <Badge tone={STATUS_TONES[status] ?? "neutral"}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
            <Badge tone="neutral">{SOURCE_LABELS[lead.source] ?? lead.source}</Badge>
            {assignedToName ? (
              <Badge tone="accent">Owner: {assignedToName}</Badge>
            ) : (
              <Badge tone="warning">Unassigned</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="gap-4 lg:grid-cols-3 grid">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lead information</CardTitle>
            <CardDescription>Contact, scope, and submission metadata</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-border-subtle">
              <Row
                label="Email"
                value={
                  <a
                    className="text-accent underline-offset-2 hover:underline"
                    href={`mailto:${lead.email}`}
                  >
                    {lead.email}
                  </a>
                }
              />
              <Row label="Phone" value={lead.phone || "—"} />
              <Row label="Company" value={lead.company || "—"} />
              <Row label="Website" value={safeExternalUrl(lead.website)} />
              <Row label="Country" value={lead.country || "—"} />
              <Row label="Source" value={SOURCE_LABELS[lead.source] ?? lead.source} />
              <Row
                label="Service"
                value={
                  serviceFromDetail
                    ? (SERVICE_SLUG_LABELS[serviceFromDetail] ?? serviceFromDetail)
                    : "—"
                }
              />
              <Row
                label="Budget"
                value={lead.budgetBand ? (BUDGET_LABELS[lead.budgetBand] ?? lead.budgetBand) : "—"}
              />
              <Row
                label="Timeline"
                value={lead.timeline ? (TIMELINE_LABELS[lead.timeline] ?? lead.timeline) : "—"}
              />
              <Row label="Assigned to" value={assignedToName ?? "Unassigned"} />
              <Row label="Consent" value={lead.consent ? "Given" : "Not given"} />
              <Row
                label="Marketing consent"
                value={lead.marketingConsent ? "Opted in" : "Opted out"}
              />
              <Row label="Created" value={formatDateTime(lead.createdAt)} />
              <Row label="Updated" value={formatDateTime(lead.updatedAt)} />
              <Row
                label="Lead ID"
                value={<code className="text-xs break-all text-text-muted">{lead.id}</code>}
              />
            </dl>
          </CardContent>
        </Card>

        <div className="gap-4 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Server-validated pipeline transitions only</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusForm
                leadId={lead.id}
                currentStatus={status}
                allowedNext={allowedNext}
                statusOptions={statusSelectOptions(status)}
              />
            </CardContent>
          </Card>

          {status === "won" && (
            <div data-testid="client-conversion-card">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client</CardTitle>
                  <CardDescription>
                    {client
                      ? "Converted from this won lead"
                      : "Won leads can become first-class clients"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConvertToClientCard
                    leadId={lead.id}
                    client={client ? { id: client.id, name: client.name } : null}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {client && (
            <div data-testid="contract-card">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contract</CardTitle>
                  <CardDescription>
                    {contract
                      ? "Internal commercial snapshot — not an e-sign system"
                      : "Create from the accepted proposal once this lead is a client"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContractCard
                    clientId={client.id}
                    clientName={client.name}
                    clientEmail={client.email}
                    organizationName={client.organizationName}
                    acceptedProposal={
                      acceptedProposal
                        ? {
                            id: acceptedProposal.id,
                            version: acceptedProposal.version,
                            title: acceptedProposal.title,
                            currency: acceptedProposal.currency,
                            totalMinor: acceptedProposal.totalMinor,
                            validUntil: acceptedProposal.validUntil,
                          }
                        : null
                    }
                    contract={
                      contract
                        ? {
                            id: contract.id,
                            status: contract.status,
                            proposalVersion: contract.proposalVersion,
                            title: contract.title,
                            currency: contract.currency,
                            totalMinor: contract.totalMinor,
                            subtotalMinor: contract.subtotalMinor,
                            validUntil: contract.validUntil,
                            clientName: contract.clientName,
                            clientEmail: contract.clientEmail,
                            organizationName: contract.organizationName,
                            lines: contract.lines,
                          }
                        : null
                    }
                    allowedNext={contractAllowedNext}
                  />
                  {contract?.status === "active" && (
                    <div
                      className="mt-4 pt-4 border-t border-border-subtle"
                      data-testid="project-panel"
                    >
                      <h2 className="mb-1 text-sm font-semibold text-text">Project</h2>
                      {existingProject ? (
                        <p className="text-sm text-text-secondary" data-testid="project-exists">
                          This contract already has project{" "}
                          <Link
                            href={`/admin/projects/${existingProject.id}`}
                            className="font-medium text-accent underline-offset-2 hover:underline"
                            data-testid="project-detail-link"
                          >
                            {existingProject.name}
                          </Link>{" "}
                          ({PROJECT_STATUS_LABELS[existingProject.status] ?? existingProject.status}
                          ). Manage it from{" "}
                          <Link
                            href={`/admin/projects/${existingProject.id}`}
                            className="text-accent underline-offset-2 hover:underline"
                          >
                            Projects
                          </Link>
                          .
                        </p>
                      ) : (
                        <CreateProjectCard
                          clientId={client.id}
                          contractId={contract.id}
                          contractTitle={contract.title}
                        />
                      )}
                    </div>
                  )}

                  {contract?.status === "active" && (
                    <div
                      className="mt-4 pt-4 border-t border-border-subtle"
                      data-testid="invoice-panel"
                    >
                      <h2 className="mb-1 text-sm font-semibold text-text">Invoice</h2>
                      {existingInvoice ? (
                        <p className="text-sm text-text-secondary" data-testid="invoice-exists">
                          This contract already has invoice{" "}
                          <Link
                            href={`/admin/invoices/${existingInvoice.id}`}
                            className="font-medium text-accent underline-offset-2 hover:underline"
                            data-testid="invoice-detail-link"
                          >
                            {existingInvoice.invoiceNumber}
                          </Link>{" "}
                          <Badge
                            tone={INVOICE_STATUS_TONES[existingInvoice.status] ?? "neutral"}
                            data-testid="invoice-status"
                          >
                            {INVOICE_STATUS_LABELS[existingInvoice.status] ??
                              existingInvoice.status}
                          </Badge>{" "}
                          · {formatMoneyMinor(existingInvoice.totalMinor, existingInvoice.currency)}
                          . Manage it from{" "}
                          <Link
                            href="/admin/invoices"
                            className="text-accent underline-offset-2 hover:underline"
                          >
                            Invoices
                          </Link>
                          .
                        </p>
                      ) : (
                        <CreateInvoiceButton contractId={contract.id} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment</CardTitle>
              <CardDescription>Own this lead across the CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignForm
                leadId={lead.id}
                assignees={assignees}
                currentAssigneeId={lead.assignedToId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm break-words whitespace-pre-wrap text-text-secondary">
                {lead.message}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="gap-4 lg:grid-cols-2 grid">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposals</CardTitle>
            <CardDescription>
              {proposals.length === 0
                ? "Create a draft to formalize commercial terms"
                : `${proposals.length} version${proposals.length === 1 ? "" : "s"} · totals server-computed`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProposalList
              leadId={lead.id}
              leadStatus={status}
              proposals={proposals}
              canWinLead={canWinLead}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-ups</CardTitle>
            <CardDescription>
              {openFollowUps.length} open · {completedFollowUps.length} completed
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-6 flex flex-col">
            <FollowUpForm
              leadId={lead.id}
              assignees={assignees}
              defaultAssigneeId={lead.assignedToId}
            />
            {followUps.length === 0 ? (
              <EmptyState title="No follow-ups yet" description="Schedule the next touch above." />
            ) : (
              <ul className="gap-3 flex flex-col">
                {[...openFollowUps, ...completedFollowUps].map((fu) => {
                  const state = followUpState(fu.dueDate, fu.completedAt, now);
                  return (
                    <li
                      key={fu.id}
                      className="p-4 rounded-lg border border-border-subtle bg-surface-sunken"
                    >
                      <div className="mb-2 gap-2 flex flex-wrap items-center justify-between">
                        <div className="min-w-0 gap-1 flex flex-col">
                          <p
                            className={cn(
                              "text-sm font-medium text-text",
                              state === "completed" && "text-text-muted line-through",
                            )}
                          >
                            {fu.title}
                          </p>
                          <div className="gap-2 text-xs flex flex-wrap items-center text-text-muted">
                            <Badge tone={FOLLOW_UP_TONES[state] ?? "neutral"}>{state}</Badge>
                            <span>Due {fu.dueDate}</span>
                            <span>
                              {fu.assignee?.name ?? fu.creator.name}
                              {fu.body ? ` · ${fu.body}` : ""}
                            </span>
                          </div>
                        </div>
                        <FollowUpCompleteButton
                          leadId={lead.id}
                          followUpId={fu.id}
                          completed={Boolean(fu.completedAt)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              Append-only audit of status, assignment, follow-ups, and proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Status changes and assignments appear here."
              />
            ) : (
              <ol className="gap-3 flex flex-col">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="p-3 rounded-lg border border-border-subtle bg-surface-sunken"
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

      {detailRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flow detail</CardTitle>
            <CardDescription>Structured metadata captured with this submission</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-border-subtle">
              {detailRows.map((row) => (
                <Row
                  key={row.key}
                  label={detailLabel(row.key)}
                  value={specializeDetailValue(row.key, row.value)}
                />
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3 flex-row items-start justify-between">
          <div className="gap-1.5 flex flex-col">
            <CardTitle className="gap-2 text-base flex items-center">
              <ShieldCheck aria-hidden className="size-4 text-accent" />
              Internal notes
            </CardTitle>
            <CardDescription>Never shown on public lead surfaces</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="gap-6 flex flex-col">
          <NotesForm leadId={lead.id} />
          {notes.length === 0 ? (
            <EmptyState title="No notes yet" description="Add the first internal note above." />
          ) : (
            <ul className="gap-3 flex flex-col">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="p-4 rounded-lg border border-border-subtle bg-surface-sunken"
                >
                  <div className="mb-2 gap-2 text-xs flex flex-wrap items-center justify-between text-text-muted">
                    <span className="font-medium text-text-secondary">
                      {note.author.name}
                      <span className="ml-1.5 font-normal">({note.author.email})</span>
                    </span>
                    <time dateTime={note.createdAt.toISOString()}>
                      {formatDateTime(note.createdAt)}
                    </time>
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap text-text">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
