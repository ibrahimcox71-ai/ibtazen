"use client";

import { useState, useTransition } from "react";
import { Alert, Badge, Button } from "@ibtatech/ui";
import {
  changeInvoiceStatusAction,
  createInvoiceFromContractAction,
  type InvoiceResult,
} from "@/lib/admin/actions";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  invoiceActionLabel,
} from "@/lib/admin/labels";

const MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage invoices.",
  not_found: "That contract or invoice no longer exists.",
  invalid_status: "Only an active contract can be invoiced.",
  already_exists: "An invoice already exists for this contract.",
  invalid_transition: "That invoice status change is not allowed.",
  invalid: "Could not complete this invoice action.",
};

/**
 * Create-invoice control shown only when the contract is active and has no
 * invoice yet. Submits the contract id only — actor, money, and ownership
 * are server-authoritative.
 */
export function CreateInvoiceButton({ contractId }: { contractId: string }) {
  const [state, setState] = useState<InvoiceResult | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not complete this action.")
      : null;

  if (state?.ok) {
    return (
      <Alert tone="success" title="Invoice created" data-testid="invoice-created">
        {state.invoice.invoiceNumber} is ready as{" "}
        {INVOICE_STATUS_LABELS[state.invoice.status] ?? state.invoice.status}.
      </Alert>
    );
  }

  const submit = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await createInvoiceFromContractAction(contractId);
      setState(result);
    });
  };

  return (
    <div className="gap-2 flex flex-col" data-testid="create-invoice-panel">
      <p className="text-sm text-text-secondary">
        Create an internal invoice from this active contract. Currency, lines, and totals are
        snapshotted on the server — this does not send email or process payment.
      </p>
      {errorMessage && (
        <Alert tone="danger" title="Not created" data-testid="invoice-error">
          {errorMessage}
        </Alert>
      )}
      <Button
        type="button"
        loading={pending}
        disabled={pending}
        onClick={submit}
        className="self-start"
        data-testid="create-invoice"
      >
        Create Invoice
      </Button>
    </div>
  );
}

/**
 * Explicit status actions for an invoice. Only valid next transitions are
 * offered; the server remains authoritative. "Mark Paid" is a manual
 * internal action — not a payment-gateway confirmation.
 */
export function InvoiceStatusActions({
  invoiceId,
  currentStatus,
  allowedNext,
}: {
  invoiceId: string;
  currentStatus: string;
  allowedNext: readonly string[];
}) {
  const [state, setState] = useState<InvoiceResult | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not complete this action.")
      : null;

  const transition = (to: string) => {
    if (pending) return;
    startTransition(async () => {
      const result = await changeInvoiceStatusAction(invoiceId, to);
      setState(result);
    });
  };

  const shownStatus = state?.ok ? state.invoice.status : currentStatus;

  return (
    <div className="gap-2 flex flex-col" data-testid="invoice-status-actions">
      {errorMessage && (
        <Alert tone="danger" title="Status change failed" data-testid="invoice-status-error">
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <p className="text-xs text-text-success" data-testid="invoice-status-ok">
          Status is now {INVOICE_STATUS_LABELS[state.invoice.status] ?? state.invoice.status}.
          {state.invoice.status === "paid" &&
            " Recorded as a manual internal mark — not a payment-gateway confirmation."}
        </p>
      )}
      {shownStatus === "paid" && (
        <p className="text-xs text-text-muted" data-testid="invoice-paid-note">
          Paid was marked manually by a CRM actor. No payment processor is connected.
        </p>
      )}
      <div className="gap-2 flex flex-wrap">
        <Badge
          tone={INVOICE_STATUS_TONES[shownStatus] ?? "neutral"}
          data-testid="invoice-current-status"
        >
          {INVOICE_STATUS_LABELS[shownStatus] ?? shownStatus}
        </Badge>
        {allowedNext.map((to) => (
          <Button
            key={to}
            type="button"
            variant={to === "void" ? "ghost" : "secondary"}
            size="sm"
            loading={pending}
            disabled={pending}
            onClick={() => transition(to)}
            data-testid={`invoice-status-${to}`}
          >
            {invoiceActionLabel(to)}
          </Button>
        ))}
      </div>
      {allowedNext.length === 0 && (
        <p className="text-xs text-text-muted" data-testid="invoice-terminal">
          Terminal state — no further transitions.
        </p>
      )}
    </div>
  );
}
