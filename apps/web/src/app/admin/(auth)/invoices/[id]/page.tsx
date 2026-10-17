import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import {
  Badge,
  ButtonLink,
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
  getInvoiceForActor,
  parseProposalLines,
  type InvoiceWithRelations,
} from "@ibtatech/leads";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  PROJECT_STATUS_LABELS,
  canInvoiceStatusNext,
  formatDateTime,
  formatMoneyMinor,
  invoiceActionLabel,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { InvoiceStatusActions } from "../invoice-actions";

export const metadata: Metadata = {
  title: "Invoice detail",
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
      <h1 className="font-semibold tracking-tight font-display text-title">Invoice</h1>
      <ErrorState title="Not authorized" description="Invoice detail requires CRM access." />
    </div>
  );
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/admin/invoices/${id}`);

  if (!/^[c][a-z0-9]{20,}$/i.test(id)) notFound();

  if (!canAccessCrm(user.role)) return <AccessDenied />;

  let invoice: InvoiceWithRelations | null = null;
  let unauthorized = false;
  let missing = false;
  let failed = false;

  try {
    const result = await getInvoiceForActor(user, id);
    if (result.ok) invoice = result.invoice;
    else if (result.error === "unauthorized") unauthorized = true;
    else missing = true;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Invoice</h1>
        <ErrorState
          title="Could not load invoice"
          description="The database query failed. Try again."
        />
      </div>
    );
  }

  if (missing) notFound();

  if (unauthorized || !invoice) return <AccessDenied />;

  const lines = parseProposalLines(invoice.lines);
  const status = invoice.status;
  const allowedNext = canInvoiceStatusNext(status);
  const leadHref = `/admin/leads/${invoice.contract.client.leadId}`;
  const project = invoice.contract.projects[0] ?? null;

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
            href="/admin/invoices"
            className={cn("rounded-sm text-text-secondary hover:text-text", focusRing)}
          >
            Invoices
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text" aria-current="page">
            {invoice.invoiceNumber}
          </span>
        </nav>
        <Link
          href="/admin/invoices"
          className={cn(
            "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to invoices
        </Link>
        <div className="gap-3 flex flex-wrap items-start justify-between">
          <div className="min-w-0 gap-1 flex flex-col">
            <h1 className="font-semibold tracking-tight font-display text-title break-words">
              {invoice.invoiceNumber}
            </h1>
            <p className="max-w-2xl text-sm text-text-secondary">{invoice.title}</p>
          </div>
          <div className="gap-2 flex flex-wrap items-center">
            <ButtonLink
              href={`/admin/invoices/${invoice.id}/pdf`}
              variant="secondary"
              size="sm"
              data-testid="invoice-download-pdf"
            >
              <Download aria-hidden className="size-4" />
              Download PDF
            </ButtonLink>
            <Badge tone={INVOICE_STATUS_TONES[status] ?? "neutral"} data-testid="invoice-status">
              {INVOICE_STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
        </div>
        {status === "paid" && (
          <p className="text-xs text-text-muted" data-testid="invoice-paid-disclaimer">
            Paid was marked manually by a CRM actor. This is not a payment-gateway confirmation.
          </p>
        )}
      </div>

      <div className="gap-4 lg:grid-cols-3 grid">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Financial snapshot</CardTitle>
            <CardDescription>
              Copied from the contract at creation — integer minor units, no tax or discount
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-border-subtle">
              <Row
                label="Status"
                value={
                  <Badge tone={INVOICE_STATUS_TONES[status] ?? "neutral"}>
                    {INVOICE_STATUS_LABELS[status] ?? status}
                  </Badge>
                }
              />
              <Row label="Currency" value={invoice.currency} />
              <Row label="Issue date" value={invoice.issueDate} />
              <Row
                label="Due date"
                value={invoice.dueDate ?? <span className="text-text-muted">Not set</span>}
              />
              <Row label="Created" value={formatDateTime(invoice.createdAt)} />
              <Row label="Updated" value={formatDateTime(invoice.updatedAt)} />
              <Row
                label="Created by"
                value={
                  <span>
                    {invoice.createdBy.name}
                    <span className="text-xs block text-text-muted">{invoice.createdBy.email}</span>
                  </span>
                }
              />
              <Row
                label="Invoice ID"
                value={<code className="text-xs break-all text-text-muted">{invoice.id}</code>}
              />
            </dl>

            <div className="mt-4 overflow-x-auto" data-testid="invoice-lines">
              <table className="text-sm w-full min-w-[480px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Description
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Qty
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Unit price
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {lines.map((line, index) => (
                    <tr key={`line-${index}`}>
                      <td className="py-2 pr-4 text-text">{line.description}</td>
                      <td className="py-2 pr-4 text-text-secondary">{line.quantity}</td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {formatMoneyMinor(line.unitPriceMinor, invoice.currency)}
                      </td>
                      <td className="py-2 text-text">
                        {formatMoneyMinor(line.quantity * line.unitPriceMinor, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-default">
                    <td
                      colSpan={3}
                      className="py-2 pr-4 text-xs tracking-wide text-right text-text-muted uppercase"
                    >
                      Subtotal
                    </td>
                    <td className="py-2 text-text-secondary" data-testid="invoice-subtotal">
                      {formatMoneyMinor(invoice.subtotalMinor, invoice.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={3}
                      className="py-2 pr-4 text-xs font-semibold tracking-wide text-right text-text uppercase"
                    >
                      Total
                    </td>
                    <td className="py-2 font-semibold text-text" data-testid="invoice-total">
                      {formatMoneyMinor(invoice.totalMinor, invoice.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="gap-4 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>
                Server-validated transitions · paid is a manual internal mark
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceStatusActions
                invoiceId={invoice.id}
                currentStatus={status}
                allowedNext={allowedNext}
              />
              {allowedNext.length > 0 && (
                <ul className="mt-3 gap-1 text-xs flex flex-col text-text-muted">
                  {allowedNext.map((to) => (
                    <li key={to}>{invoiceActionLabel(to)}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div data-testid="invoice-client-card">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
                <CardDescription>Resolved from the contract server-side</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border-subtle">
                  <Row label="Name" value={invoice.contract.client.name} />
                  <Row
                    label="Organization"
                    value={invoice.contract.client.organizationName || "—"}
                  />
                  <Row
                    label="Email"
                    value={
                      invoice.contract.client.email ? (
                        <a
                          href={`mailto:${invoice.contract.client.email}`}
                          className="break-all text-accent underline-offset-2 hover:underline"
                        >
                          {invoice.contract.client.email}
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
                        href={`/admin/clients/${invoice.contract.client.id}`}
                        className="text-accent underline-offset-2 hover:underline"
                        data-testid="invoice-client-detail-link"
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
                        data-testid="invoice-lead-link"
                      >
                        Open originating lead
                      </Link>
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>

          <div data-testid="invoice-contract-card">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contract</CardTitle>
                <CardDescription>Source of the financial snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border-subtle">
                  <Row label="Title" value={invoice.contract.title} />
                  <Row
                    label="Status"
                    value={
                      <Badge
                        tone={CONTRACT_STATUS_TONES[invoice.contract.status] ?? "neutral"}
                        data-testid="invoice-contract-status"
                      >
                        {CONTRACT_STATUS_LABELS[invoice.contract.status] ?? invoice.contract.status}
                      </Badge>
                    }
                  />
                  <Row
                    label="Contract total"
                    value={formatMoneyMinor(invoice.contract.totalMinor, invoice.contract.currency)}
                  />
                  <Row
                    label="Project"
                    value={
                      project ? (
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="text-accent underline-offset-2 hover:underline"
                          data-testid="invoice-project-link"
                        >
                          {project.name}
                          <span className="ml-2 text-xs text-text-muted">
                            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-text-muted">No project yet</span>
                      )
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
