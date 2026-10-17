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
} from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { getPortalInvoice } from "@ibtatech/leads";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES, formatMoneyMinor } from "@/lib/admin/labels";
import { LineItems } from "@/components/portal/line-items";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser("/portal/invoices");
  const { id } = await params;
  if (!cuidLike.test(id)) notFound();

  const result = await getPortalInvoice(user, id);
  if (!result.ok) notFound();
  const invoice = result.invoice;

  const meta = [
    { label: "Status", value: INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status },
    { label: "Issued", value: invoice.issueDate },
    { label: "Due", value: invoice.dueDate ?? "—" },
    { label: "Engagement", value: invoice.contractTitle },
  ];

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-4 flex flex-col">
        <Link
          href="/portal/invoices"
          className={cn(
            "min-h-11 gap-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          All invoices
        </Link>
        <div className="gap-3 sm:flex-row sm:items-start sm:justify-between flex flex-col">
          <div className="gap-1.5 flex flex-col">
            <h1
              className="font-semibold tracking-tight font-display text-title"
              data-testid="invoice-number"
            >
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-text-secondary">{invoice.title}</p>
          </div>
          <div className="gap-2 flex flex-wrap items-center">
            <ButtonLink
              href={`/portal/invoices/${invoice.id}/pdf`}
              variant="secondary"
              size="sm"
              data-testid="invoice-download-pdf"
            >
              <Download aria-hidden className="size-4" />
              Download PDF
            </ButtonLink>
            <Badge
              tone={INVOICE_STATUS_TONES[invoice.status] ?? "neutral"}
              data-testid="invoice-status"
            >
              {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
            </Badge>
          </div>
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
          <CardTitle className="text-base">Charges</CardTitle>
          <CardDescription>As issued by Ibtatech</CardDescription>
        </CardHeader>
        <CardContent className="gap-5 flex flex-col">
          <LineItems lines={invoice.lines} currency={invoice.currency} />
          <dl className="gap-2 text-sm max-w-xs ml-auto flex w-full flex-col">
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="text-text tabular-nums">
                {formatMoneyMinor(invoice.subtotalMinor, invoice.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-text">Total</dt>
              <dd className="font-semibold text-text tabular-nums" data-testid="invoice-total">
                {formatMoneyMinor(invoice.totalMinor, invoice.currency)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
