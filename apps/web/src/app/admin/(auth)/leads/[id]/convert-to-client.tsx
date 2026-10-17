"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Alert, Button } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { convertWonLeadToClientAction, type ClientConversionResult } from "@/lib/admin/actions";

const MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to convert this lead.",
  not_found: "That lead no longer exists.",
  invalid_status: "Only a won lead can be converted to a client.",
  already_converted: "This lead has already been converted to a client.",
  invalid: "Could not convert this lead.",
};

/**
 * Won-lead conversion card. Shows the Convert action until a Client exists;
 * after success (or on a revalidated page) it shows the Client relationship
 * with a link to the registry. Duplicate submission is blocked while pending.
 */
export function ConvertToClientCard({
  leadId,
  client,
}: {
  leadId: string;
  client: { id: string; name: string } | null;
}) {
  const [state, setState] = useState<ClientConversionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const convert = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await convertWonLeadToClientAction(leadId);
      setState(result);
    });
  };

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not convert this lead.")
      : null;

  // Server revalidation delivers the created client — show the relationship.
  if (client) {
    return (
      <div className="gap-3 flex flex-col" data-testid="client-converted">
        {state?.ok && (
          <Alert tone="success" title="Converted to client">
            A client record now exists for this lead.
          </Alert>
        )}
        <div className="gap-1 flex flex-col">
          <p className="text-sm font-medium text-text">{client.name}</p>
          <p className="text-xs text-text-muted">This lead has been converted to a client.</p>
        </div>
        <div className="gap-x-4 gap-y-2 flex flex-wrap items-center">
          <Link
            href={`/admin/clients/${client.id}`}
            className={cn(
              "min-h-11 gap-1.5 px-3 text-sm font-medium inline-flex w-fit items-center rounded-md text-accent hover:underline",
              focusRing,
            )}
            data-testid="client-detail-link"
          >
            Open client detail
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
          <Link
            href="/admin/clients"
            className={cn(
              "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
              focusRing,
            )}
            data-testid="client-registry-link"
          >
            View in Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gap-3 flex flex-col">
      <p className="text-sm text-text-secondary">
        Create a first-class client record from this won lead. Contact details are copied from the
        lead — the pipeline status stays <span className="font-medium text-text">Won</span>.
      </p>
      {errorMessage && (
        <Alert tone="danger" title="Not converted" data-testid="convert-client-error">
          {errorMessage}
        </Alert>
      )}
      <Button
        type="button"
        loading={pending}
        disabled={pending}
        onClick={convert}
        className="self-start"
        data-testid="convert-to-client"
      >
        Convert to Client
      </Button>
    </div>
  );
}
