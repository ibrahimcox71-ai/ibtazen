import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { canAccessCrm, listInvoicesForActor, type InvoiceWithRelations } from "@ibtatech/leads";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  canInvoiceStatusNext,
  formatMoneyMinor,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { InvoiceStatusActions } from "./invoice-actions";

export const metadata: Metadata = {
  title: "Invoices",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function LeadLink({ invoice }: { invoice: InvoiceWithRelations }) {
  return (
    <Link
      href={`/admin/leads/${invoice.contract.client.leadId}`}
      className={cn(
        "min-h-11 gap-1 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
        focusRing,
      )}
    >
      {invoice.contract.client.name}
    </Link>
  );
}

export default async function AdminInvoicesPage() {
  const user = await requireUser("/admin/invoices");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Invoices</h1>
        <ErrorState
          title="Not authorized"
          description="The invoice registry requires CRM access."
        />
      </div>
    );
  }

  let invoices: InvoiceWithRelations[] | null = null;
  let unauthorized = false;
  let failed = false;
  try {
    const result = await listInvoicesForActor(user);
    if (result.ok) invoices = result.invoices;
    else unauthorized = true;
  } catch {
    failed = true;
  }

  if (unauthorized || !invoices) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Invoices</h1>
        {failed ? (
          <ErrorState
            title="Could not load invoices"
            description="The database query failed. Try again."
          />
        ) : (
          <ErrorState
            title="Not authorized"
            description="The invoice registry requires CRM access."
          />
        )}
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Invoices</h1>
        <p className="text-sm text-text-secondary">
          {invoices.length} invoice{invoices.length === 1 ? "" : "s"} created from active contracts
          {" · "}paid is a manual internal mark
        </p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create an invoice from an active contract on the lead detail page."
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
                      Invoice
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
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Issued
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Due
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-surface-sunken/60"
                      data-testid="invoice-row"
                    >
                      <td className="px-4 py-3 font-medium text-text">
                        <div className="gap-0.5 flex flex-col">
                          <Link
                            href={`/admin/invoices/${invoice.id}`}
                            className={cn(
                              "min-h-11 inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                              focusRing,
                            )}
                            data-testid="invoice-number"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <span className="text-xs line-clamp-2 text-text-muted">
                            {invoice.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={INVOICE_STATUS_TONES[invoice.status] ?? "neutral"}
                          data-testid="invoice-status"
                        >
                          {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <LeadLink invoice={invoice} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="gap-0.5 flex flex-col">
                          <span data-testid="invoice-contract-title">{invoice.contract.title}</span>
                          <span className="text-xs text-text-muted">
                            {invoice.contract.client.organizationName ||
                              invoice.contract.client.email}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-text"
                        data-testid="invoice-total"
                      >
                        {formatMoneyMinor(invoice.totalMinor, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {invoice.issueDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {invoice.dueDate ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusActions
                          invoiceId={invoice.id}
                          currentStatus={invoice.status}
                          allowedNext={canInvoiceStatusNext(invoice.status)}
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
            {invoices.map((invoice) => (
              <li key={invoice.id} data-testid="invoice-row">
                <Card>
                  <div className="gap-3 p-4 flex flex-col">
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className={cn(
                            "font-medium text-accent underline-offset-2 hover:underline",
                            focusRing,
                          )}
                          data-testid="invoice-number"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-xs truncate text-text-muted">{invoice.contract.title}</p>
                      </div>
                      <Badge
                        tone={INVOICE_STATUS_TONES[invoice.status] ?? "neutral"}
                        data-testid="invoice-status"
                      >
                        {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-text" data-testid="invoice-total">
                      {formatMoneyMinor(invoice.totalMinor, invoice.currency)}
                    </p>
                    <div className="gap-x-3 gap-y-1 text-xs flex flex-wrap items-center justify-between text-text-secondary">
                      <span>
                        {invoice.issueDate}
                        {invoice.dueDate ? ` → due ${invoice.dueDate}` : ""}
                      </span>
                      <LeadLink invoice={invoice} />
                    </div>
                    <InvoiceStatusActions
                      invoiceId={invoice.id}
                      currentStatus={invoice.status}
                      allowedNext={canInvoiceStatusNext(invoice.status)}
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
