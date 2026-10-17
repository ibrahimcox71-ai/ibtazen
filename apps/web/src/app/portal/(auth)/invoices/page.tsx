import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { listPortalInvoices } from "@ibtatech/leads";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES, formatMoneyMinor } from "@/lib/admin/labels";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Invoices",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PortalInvoicesPage() {
  const user = await requirePortalUser("/portal/invoices");
  const result = await listPortalInvoices(user);

  if (!result.ok) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Invoices</h1>
        <ErrorState
          title="Could not load invoices"
          description="Your portal session could not be matched to a client record."
        />
      </div>
    );
  }

  const { invoices } = result;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Invoices</h1>
        <p className="text-sm text-text-secondary">
          Invoices issued to you — drafts stay internal until they are sent.
        </p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Issued invoices appear here with amounts, dates and payment status."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[800px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Invoice
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Engagement
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Issued
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Due
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Amount
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
                      <td className="px-4 py-3">
                        <div className="gap-0.5 flex flex-col">
                          <Link
                            href={`/portal/invoices/${invoice.id}`}
                            className={cn(
                              "min-h-11 font-medium inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
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
                      <td className="px-4 py-3 text-text-secondary">{invoice.contractTitle}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {invoice.issueDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {invoice.dueDate ?? "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap text-text"
                        data-testid="invoice-total"
                      >
                        {formatMoneyMinor(invoice.totalMinor, invoice.currency)}
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
                          href={`/portal/invoices/${invoice.id}`}
                          className={cn(
                            "font-medium text-accent underline-offset-2 hover:underline",
                            focusRing,
                          )}
                          data-testid="invoice-number"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-xs truncate text-text-muted">{invoice.contractTitle}</p>
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
                    <p className="text-xs text-text-secondary">
                      Issued {invoice.issueDate}
                      {invoice.dueDate ? ` · due ${invoice.dueDate}` : ""}
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
