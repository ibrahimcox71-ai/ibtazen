"use client";

import { useState } from "react";
import { Badge, Button } from "@ibtatech/ui";
import { ProposalForm } from "./proposal-form";
import { ProposalActions } from "./proposal-actions";
import {
  formatDateTime,
  formatMoneyMinor,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_TONES,
} from "@/lib/admin/labels";
import { parseProposalLines, type ProposalWithCreator } from "@ibtatech/leads";

export function ProposalList({
  leadId,
  leadStatus,
  proposals,
  canWinLead,
}: {
  leadId: string;
  leadStatus: string;
  proposals: ProposalWithCreator[];
  canWinLead: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="gap-4 flex flex-col">
      <div className="gap-2 flex flex-wrap items-center justify-between">
        <p className="text-sm text-text-secondary">
          {proposals.length} version{proposals.length === 1 ? "" : "s"} · create a new version to
          revise after send
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setCreating((v) => !v);
            setEditingId(null);
          }}
          aria-expanded={creating}
        >
          {creating ? "Hide new version" : "New version"}
        </Button>
      </div>

      {creating && (
        <div className="p-4 rounded-lg border border-border-subtle bg-surface-sunken">
          <h3 className="mb-3 text-sm font-semibold text-text">New proposal version</h3>
          <ProposalForm leadId={leadId} mode="create" />
        </div>
      )}

      {proposals.length === 0 && !creating ? (
        <p className="text-sm text-text-muted">
          No proposals yet. Create the first draft to formalize commercial terms.
        </p>
      ) : (
        <ul className="gap-3 flex flex-col">
          {proposals.map((proposal) => {
            const lines = parseProposalLines(proposal.lines);
            const isEditing = editingId === proposal.id;
            return (
              <li
                key={proposal.id}
                className="p-4 rounded-lg border border-border-subtle bg-surface-sunken"
                data-testid="proposal-item"
                data-proposal-status={proposal.status}
                data-proposal-version={proposal.version}
              >
                <div className="mb-2 gap-2 flex flex-wrap items-start justify-between">
                  <div className="min-w-0 gap-1 flex flex-col">
                    <div className="gap-2 flex flex-wrap items-center">
                      <Badge tone="neutral">v{proposal.version}</Badge>
                      <Badge tone={PROPOSAL_STATUS_TONES[proposal.status] ?? "neutral"}>
                        {PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-text">{proposal.title}</p>
                    <div className="gap-x-3 gap-y-1 text-xs flex flex-wrap text-text-muted">
                      <span data-testid="proposal-total">
                        {formatMoneyMinor(proposal.totalMinor, proposal.currency)}
                      </span>
                      <span>Valid until {proposal.validUntil}</span>
                      <span>Created {formatDateTime(proposal.createdAt)}</span>
                      <span>by {proposal.createdBy.name}</span>
                    </div>
                  </div>
                </div>

                <ul className="mb-3 gap-1 flex flex-col">
                  {lines.map((line, index) => (
                    <li
                      key={`${proposal.id}-line-${index}`}
                      className="gap-2 text-xs flex flex-wrap justify-between text-text-secondary"
                    >
                      <span>
                        {line.quantity} × {line.description}
                      </span>
                      <span>
                        {formatMoneyMinor(line.quantity * line.unitPriceMinor, proposal.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                {proposal.notes && (
                  <p className="mb-3 text-xs break-words whitespace-pre-wrap text-text-muted">
                    {proposal.notes}
                  </p>
                )}

                <ProposalActions
                  leadId={leadId}
                  proposalId={proposal.id}
                  status={proposal.status}
                  leadStatus={leadStatus}
                  canWinLead={canWinLead}
                />

                {proposal.status === "draft" && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(isEditing ? null : proposal.id)}
                      aria-expanded={isEditing}
                    >
                      {isEditing ? "Hide edit" : "Edit draft"}
                    </Button>
                    {isEditing && (
                      <div className="mt-3 p-4 rounded-lg border border-border-subtle bg-surface">
                        <ProposalForm
                          leadId={leadId}
                          mode="edit"
                          proposalId={proposal.id}
                          initial={{
                            title: proposal.title,
                            currency: proposal.currency,
                            validUntil: proposal.validUntil,
                            notes: proposal.notes ?? "",
                            lines,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {proposal.status !== "draft" && (
                  <p className="mt-2 text-xs text-text-muted">
                    Commercial content is locked after send. Use New version to revise.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
