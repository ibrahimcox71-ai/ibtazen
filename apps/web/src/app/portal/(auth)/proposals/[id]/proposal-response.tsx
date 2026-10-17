"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@ibtatech/ui";
import {
  respondToPortalProposalAction,
  type PortalProposalResponseResult,
} from "@/lib/portal/actions";

const MESSAGES: Record<string, string> = {
  unauthorized: "Your session expired — sign in again.",
  not_found: "That proposal is no longer available.",
  invalid_input: "Choose accept or decline.",
  invalid_transition: "This proposal has already been answered.",
  invalid: "Your response could not be recorded.",
};

/**
 * Accept / decline a sent proposal. The server re-resolves the signed-in
 * portal user from the session, so this form carries only the proposal id
 * and the decision — never a client or lead id.
 */
export function ProposalResponse({ proposalId, status }: { proposalId: string; status: string }) {
  const [state, setState] = useState<PortalProposalResponseResult | null>(null);
  const [pending, startTransition] = useTransition();

  const respond = (decision: "accept" | "decline") => {
    startTransition(async () => {
      setState(await respondToPortalProposalAction(proposalId, decision));
    });
  };

  const failure = state && !state.ok ? state : null;
  const answered = state?.ok ? state.proposal.status : null;

  // Nothing to act on and nothing to report — the page badge says it all.
  if (!answered && status !== "sent") return null;

  return (
    <Card data-testid="proposal-response">
      <CardHeader>
        <CardTitle className="text-base">Your response</CardTitle>
      </CardHeader>
      <CardContent className="gap-3 flex flex-col">
        {answered ? (
          <Alert
            tone={answered === "accepted" ? "success" : "info"}
            title={answered === "accepted" ? "Proposal accepted" : "Proposal declined"}
          >
            {answered === "accepted"
              ? "Thanks — Ibtatech has been notified and will follow up with the next steps."
              : "Your decline has been recorded. Ibtatech has been notified."}
          </Alert>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              Accept the scope and pricing above to approve it, or decline to let us know it is not
              going ahead.
            </p>
            <div className="gap-2 flex flex-wrap">
              <Button
                type="button"
                size="sm"
                loading={pending}
                onClick={() => respond("accept")}
                data-testid="portal-proposal-accept"
              >
                Accept proposal
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => respond("decline")}
                data-testid="portal-proposal-decline"
              >
                Decline
              </Button>
            </div>
          </>
        )}

        {failure && (
          <Alert tone="danger" title="Response not recorded">
            {failure.message ?? MESSAGES[failure.error] ?? "Your response could not be recorded."}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
