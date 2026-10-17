"use client";

import { useState, useTransition } from "react";
import { Alert, Badge, Button } from "@ibtatech/ui";
import {
  changeContractStatusAction,
  createContractFromProposalAction,
  type ContractResult,
} from "@/lib/admin/actions";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
  formatDateTime,
  formatMoneyMinor,
} from "@/lib/admin/labels";
import { parseProposalLines, type ContractStatus } from "@ibtatech/leads";

const MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage contracts.",
  not_found: "That client or proposal no longer exists.",
  invalid_status: "Only an accepted proposal can become a contract.",
  already_exists: "A contract already exists for this proposal.",
  invalid_transition: "That contract status change is not allowed.",
  invalid: "Could not complete this contract action.",
};

interface AcceptedProposalSummary {
  id: string;
  version: number;
  title: string;
  currency: string;
  totalMinor: number;
  validUntil: string;
}

interface ContractSummary {
  id: string;
  status: string;
  proposalVersion: number;
  title: string;
  currency: string;
  totalMinor: number;
  subtotalMinor: number;
  validUntil: string;
  clientName: string;
  clientEmail: string;
  organizationName: string | null;
  lines: string;
}

/**
 * Internal contract card on the lead detail surface. Shows the accepted
 * proposal when eligible, Create Contract until one exists, then the
 * snapshot + server-validated status transitions. No e-sign, no edit/delete.
 */
export function ContractCard({
  clientId,
  clientName,
  clientEmail,
  organizationName,
  acceptedProposal,
  contract,
  allowedNext,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  organizationName: string | null;
  acceptedProposal: AcceptedProposalSummary | null;
  contract: ContractSummary | null;
  allowedNext: ContractStatus[];
}) {
  const [state, setState] = useState<ContractResult | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not complete this action.")
      : null;

  const create = () => {
    if (pending || !acceptedProposal) return;
    startTransition(async () => {
      const result = await createContractFromProposalAction(clientId, acceptedProposal.id);
      setState(result);
    });
  };

  const transition = (to: ContractStatus) => {
    if (pending || !contract) return;
    startTransition(async () => {
      const result = await changeContractStatusAction(contract.id, to);
      setState(result);
    });
  };

  if (contract) {
    const lines = parseProposalLines(contract.lines);
    const display = state?.ok ? state.contract : null;
    const status = display?.status ?? contract.status;
    return (
      <div className="gap-3 flex flex-col" data-testid="contract-exists">
        {state?.ok && (
          <Alert tone="success" title="Contract updated">
            Status is now {CONTRACT_STATUS_LABELS[status] ?? status}.
          </Alert>
        )}
        {errorMessage && (
          <Alert tone="danger" title="Contract action failed" data-testid="contract-error">
            {errorMessage}
          </Alert>
        )}
        <div className="gap-2 flex flex-wrap items-center">
          <Badge tone={CONTRACT_STATUS_TONES[status] ?? "neutral"} data-testid="contract-status">
            {CONTRACT_STATUS_LABELS[status] ?? status}
          </Badge>
          <Badge tone="neutral">Proposal v{contract.proposalVersion}</Badge>
        </div>
        <div className="gap-1 flex flex-col">
          <p className="text-sm font-medium text-text" data-testid="contract-title">
            {contract.title}
          </p>
          <p className="text-xs text-text-muted" data-testid="contract-client">
            {contract.clientName}
            {contract.organizationName ? ` · ${contract.organizationName}` : ""} ·{" "}
            {contract.clientEmail}
          </p>
          <div className="gap-x-3 gap-y-1 text-xs flex flex-wrap text-text-muted">
            <span data-testid="contract-total">
              {formatMoneyMinor(contract.totalMinor, contract.currency)}
            </span>
            <span>Valid until {contract.validUntil}</span>
            <span>
              Snapshot of accepted proposal v{contract.proposalVersion} — commercial fields do not
              change if the source proposal is revised later.
            </span>
          </div>
        </div>
        <ul className="gap-1 flex flex-col">
          {lines.map((line, index) => (
            <li
              key={`${contract.id}-line-${index}`}
              className="gap-2 text-xs flex flex-wrap justify-between text-text-secondary"
            >
              <span>
                {line.quantity} × {line.description}
              </span>
              <span>
                {formatMoneyMinor(line.quantity * line.unitPriceMinor, contract.currency)}
              </span>
            </li>
          ))}
        </ul>
        {allowedNext.length > 0 && (
          <div className="gap-2 flex flex-wrap" data-testid="contract-transitions">
            {allowedNext.map((to) => (
              <Button
                key={to}
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                disabled={pending}
                onClick={() => transition(to)}
                data-testid={`contract-status-${to}`}
              >
                {to === "void" ? "Void" : `Mark ${CONTRACT_STATUS_LABELS[to] ?? to}`}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="gap-3 flex flex-col">
      <p className="text-sm text-text-secondary">
        Snapshot the accepted proposal into an internal contract record. Money and client details
        are copied on the server — this is not an electronic signature system.
      </p>
      {errorMessage && (
        <Alert tone="danger" title="Not created" data-testid="contract-error">
          {errorMessage}
        </Alert>
      )}
      {acceptedProposal ? (
        <div className="p-3 rounded-lg border border-border-subtle bg-surface-sunken">
          <div className="mb-1 gap-2 flex flex-wrap items-center">
            <Badge tone="success">Accepted</Badge>
            <Badge tone="neutral">v{acceptedProposal.version}</Badge>
          </div>
          <p className="text-sm font-medium text-text">{acceptedProposal.title}</p>
          <div className="mt-1 gap-x-3 gap-y-1 text-xs flex flex-wrap text-text-muted">
            <span data-testid="accepted-proposal-total">
              {formatMoneyMinor(acceptedProposal.totalMinor, acceptedProposal.currency)}
            </span>
            <span>Valid until {acceptedProposal.validUntil}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted" data-testid="no-accepted-proposal">
          No accepted proposal yet. Accept a sent proposal (or use Accept &amp; Win) before creating
          a contract.
        </p>
      )}
      <Button
        type="button"
        loading={pending}
        disabled={pending || !acceptedProposal}
        onClick={create}
        className="self-start"
        data-testid="create-contract"
      >
        Create Contract
      </Button>
      <p className="text-xs text-text-muted">
        Client: {clientName}
        {organizationName ? ` · ${organizationName}` : ""} · {clientEmail}
      </p>
      {contract === null && state?.ok && (
        <p className="text-xs text-text-muted">{formatDateTime(new Date())}</p>
      )}
    </div>
  );
}
