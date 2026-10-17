"use client";

import { useState, useTransition } from "react";
import { Alert, Button } from "@ibtatech/ui";
import {
  acceptAndWinAction,
  changeProposalStatusAction,
  type ProposalResult,
  type WinFromProposalResult,
} from "@/lib/admin/actions";

const STATUS_MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to change proposal status.",
  not_found: "That proposal no longer exists.",
  invalid: "Proposal status could not be updated.",
  invalid_transition: "That status change is not allowed from the current state.",
  immutable: "This proposal is immutable.",
};

const WIN_MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to win this lead.",
  not_found: "Lead or proposal not found.",
  invalid: "Could not mark lead as won.",
  invalid_transition: "Lead cannot be won from its current status with this proposal.",
};

export function ProposalActions({
  leadId,
  proposalId,
  status,
  leadStatus,
  canWinLead,
}: {
  leadId: string;
  proposalId: string;
  status: string;
  leadStatus: string;
  canWinLead: boolean;
}) {
  const [statusState, setStatusState] = useState<ProposalResult | null>(null);
  const [winState, setWinState] = useState<WinFromProposalResult | null>(null);
  const [statusPending, startStatusTransition] = useTransition();
  const [winPending, startWinTransition] = useTransition();

  const changeStatus = (to: string) => {
    startStatusTransition(async () => {
      const result = await changeProposalStatusAction(leadId, proposalId, to);
      setStatusState(result);
    });
  };

  const acceptAndWin = () => {
    startWinTransition(async () => {
      const result = await acceptAndWinAction(leadId, proposalId);
      setWinState(result);
    });
  };

  const statusError =
    statusState && !statusState.ok
      ? (statusState.message ?? STATUS_MESSAGES[statusState.error] ?? "Could not update status.")
      : null;
  const winError =
    winState && !winState.ok
      ? (winState.message ?? WIN_MESSAGES[winState.error] ?? "Could not win lead.")
      : null;

  const showSend = status === "draft";
  const showAcceptDecline = status === "sent";
  const showDeclineDraft = status === "draft";
  const showWin = status === "accepted" && canWinLead && leadStatus !== "won";

  if (!showSend && !showAcceptDecline && !showWin) {
    return null;
  }

  return (
    <div className="gap-2 flex flex-col">
      <div className="gap-2 flex flex-wrap">
        {showSend && (
          <Button
            type="button"
            size="sm"
            loading={statusPending}
            onClick={() => changeStatus("sent")}
            data-testid="proposal-send"
          >
            Mark sent
          </Button>
        )}
        {showAcceptDecline && (
          <>
            <Button
              type="button"
              size="sm"
              loading={statusPending}
              onClick={() => changeStatus("accepted")}
              data-testid="proposal-accept"
            >
              Accept proposal
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={statusPending}
              onClick={() => changeStatus("declined")}
              data-testid="proposal-decline"
            >
              Decline
            </Button>
          </>
        )}
        {showDeclineDraft && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={statusPending}
            onClick={() => changeStatus("declined")}
          >
            Decline draft
          </Button>
        )}
        {showWin && (
          <Button
            type="button"
            size="sm"
            loading={winPending}
            onClick={acceptAndWin}
            data-testid="proposal-win"
          >
            Accept &amp; Win
          </Button>
        )}
      </div>
      {statusError && (
        <Alert tone="danger" title="Proposal not updated">
          {statusError}
        </Alert>
      )}
      {statusState?.ok && (
        <Alert tone="success" title="Proposal updated">
          Now “{statusState.proposal.status}”. No email was sent from this action.
        </Alert>
      )}
      {winError && (
        <Alert tone="danger" title="Lead not won">
          {winError}
        </Alert>
      )}
      {winState?.ok && (
        <Alert tone="success" title="Lead won">
          Lead status is now “{winState.status}”.
        </Alert>
      )}
    </div>
  );
}
