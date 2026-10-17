"use client";

import { useCallback, useActionState, useEffect, useId, useRef, useState } from "react";
import { Alert, Button, Field, FieldSelect } from "@ibtatech/ui";
import {
  createProposalAction,
  updateProposalAction,
  type ProposalResult,
} from "@/lib/admin/actions";

type Line = { description: string; quantity: string; unitPrice: string };

const emptyLine = (): Line => ({ description: "", quantity: "1", unitPrice: "" });

const PROPOSAL_MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage proposals.",
  not_found: "That lead or proposal no longer exists.",
  invalid: "Proposal could not be saved.",
  invalid_transition: "That proposal status change is not allowed.",
  immutable: "Sent proposals cannot be edited. Create a new version instead.",
};

const CURRENCY_OPTIONS = [
  { value: "GBP", label: "GBP (£)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
];

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

/** Client-side major-unit preview only — server is the source of truth. */
function previewTotal(lines: Line[]): string | null {
  let minor = 0;
  for (const line of lines) {
    const qty = Number(line.quantity);
    const priceRaw = line.unitPrice.trim();
    if (!/^\d{1,15}(\.\d{1,2})?$/.test(priceRaw)) return null;
    if (!Number.isInteger(qty) || qty < 1) return null;
    const dot = priceRaw.indexOf(".");
    const whole = Number(dot === -1 ? priceRaw : priceRaw.slice(0, dot));
    const frac = Number((dot === -1 ? "00" : (priceRaw.slice(dot + 1) + "00").slice(0, 2)) || "00");
    const unitMinor = whole * 100 + frac;
    const lineMinor = qty * unitMinor;
    if (!Number.isSafeInteger(lineMinor)) return null;
    minor += lineMinor;
    if (!Number.isSafeInteger(minor)) return null;
  }
  if (minor === 0 && lines.every((l) => !l.unitPrice.trim())) return null;
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

export function ProposalForm({
  leadId,
  mode,
  proposalId,
  initial,
}: {
  leadId: string;
  mode: "create" | "edit";
  proposalId?: string;
  initial?: {
    title: string;
    currency: string;
    validUntil: string;
    notes: string;
    lines: Array<{ description: string; quantity: number; unitPriceMinor: number }>;
  };
}) {
  const formId = useId();
  const [lines, setLines] = useState<Line[]>(
    initial && initial.lines.length > 0
      ? initial.lines.map((l) => ({
          description: l.description,
          quantity: String(l.quantity),
          unitPrice: `${Math.floor(l.unitPriceMinor / 100)}.${String(l.unitPriceMinor % 100).padStart(2, "0")}`,
        }))
      : [emptyLine()],
  );
  const [state, formAction, pending] = useActionState<ProposalResult | null, FormData>(
    async (_prev, formData) =>
      mode === "edit" && proposalId
        ? updateProposalAction(leadId, proposalId, formData)
        : createProposalAction(leadId, formData),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const lastSuccessKey = useRef<unknown>(null);

  useEffect(() => {
    if (!state?.ok || mode !== "create") return;
    if (lastSuccessKey.current === state) return;
    lastSuccessKey.current = state;
    formRef.current?.reset();
    // Reset line rows after a successful create (local form state only).
    setLines([emptyLine()]);
  }, [state, mode]);

  const addLine = useCallback(() => {
    setLines((prev) => (prev.length >= 50 ? prev : [...prev, emptyLine()]));
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const updateLine = useCallback((index: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const errorMessage =
    state && !state.ok
      ? (state.message ?? PROPOSAL_MESSAGES[state.error] ?? "Could not save proposal.")
      : null;
  const totalPreview = previewTotal(lines);

  return (
    <form ref={formRef} action={formAction} className="gap-4 flex flex-col">
      <div className="gap-3 sm:grid-cols-2 grid">
        <Field
          label="Title"
          name="title"
          maxLength={200}
          defaultValue={initial?.title ?? ""}
          placeholder="Website redesign proposal"
          required
        />
        <FieldSelect
          label="Currency"
          name="currency"
          options={CURRENCY_OPTIONS}
          defaultValue={initial?.currency ?? "GBP"}
          required
        />
      </div>
      <div className="gap-3 sm:grid-cols-2 grid">
        <Field
          label="Valid until"
          name="validUntil"
          type="date"
          defaultValue={initial?.validUntil ?? defaultValidUntil()}
          required
        />
        <Field
          label="Version note"
          name="notes"
          maxLength={4000}
          defaultValue={initial?.notes ?? ""}
          placeholder="Optional internal/client notes"
          labelSuffix="(optional)"
        />
      </div>

      <fieldset className="gap-3 p-4 flex flex-col rounded-lg border border-border-subtle bg-surface-sunken">
        <legend className="px-1 text-sm font-medium text-text">Line items</legend>
        <p className="text-xs text-text-muted" id={`${formId}-lines-hint`}>
          Quantity must be a whole number. Unit price uses major units (e.g. 1250.00). Totals are
          recalculated on the server.
        </p>
        {lines.map((line, index) => (
          <div
            key={`${formId}-line-${index}`}
            className="gap-3 p-3 sm:grid-cols-[1fr_100px_140px_auto] grid rounded-md border border-border-subtle bg-surface"
          >
            <Field
              label={`Line ${index + 1} description`}
              name="lineDescription"
              value={line.description}
              onChange={(e) => updateLine(index, { description: e.target.value })}
              maxLength={200}
              placeholder="Discovery workshop"
              required
            />
            <Field
              label="Qty"
              name="lineQuantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={line.quantity}
              onChange={(e) => updateLine(index, { quantity: e.target.value })}
              required
            />
            <Field
              label="Unit price"
              name="lineUnitPrice"
              inputMode="decimal"
              value={line.unitPrice}
              onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
              placeholder="0.00"
              required
            />
            <div className="pb-1 flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLine(index)}
                disabled={lines.length <= 1}
                aria-label={`Remove line ${index + 1}`}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <div className="gap-3 flex flex-wrap items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addLine}
            disabled={lines.length >= 50}
          >
            Add line
          </Button>
          <p className="text-sm text-text-secondary" aria-live="polite">
            {totalPreview ? `Preview total: ${totalPreview}` : "Enter line prices to preview total"}
          </p>
        </div>
      </fieldset>

      {errorMessage && (
        <Alert
          tone="danger"
          title={mode === "edit" ? "Proposal not updated" : "Proposal not saved"}
        >
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <Alert tone="success" title={mode === "edit" ? "Draft updated" : "Proposal created"}>
          Version {state.proposal.version} saved as {state.proposal.status}. Totals are
          server-computed.
        </Alert>
      )}
      <Button type="submit" loading={pending} className="self-start">
        {mode === "edit" ? "Save draft" : "Create draft proposal"}
      </Button>
    </form>
  );
}
