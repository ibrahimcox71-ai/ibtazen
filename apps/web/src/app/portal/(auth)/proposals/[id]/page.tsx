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
import { getPortalProposal } from "@ibtatech/leads";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_TONES,
  formatMoneyMinor,
} from "@/lib/admin/labels";
import { LineItems } from "@/components/portal/line-items";
import { requirePortalUser } from "@/lib/portal/session";
import { ProposalResponse } from "./proposal-response";

export const metadata: Metadata = {
  title: "Proposal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export default async function PortalProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser("/portal/proposals");
  const { id } = await params;
  // Malformed and foreign ids both land on 404 — existence is never revealed.
  if (!cuidLike.test(id)) notFound();

  const result = await getPortalProposal(user, id);
  if (!result.ok) notFound();
  const proposal = result.proposal;

  const meta = [
    { label: "Status", value: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status },
    { label: "Version", value: String(proposal.version) },
    { label: "Valid until", value: proposal.validUntil },
    {
      label: "Issued",
      value: proposal.sentAt
        ? new Date(proposal.sentAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "—",
    },
  ];

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-4 flex flex-col">
        <Link
          href="/portal/proposals"
          className={cn(
            "min-h-11 gap-2 text-sm font-medium inline-flex w-fit items-center rounded-md text-text-secondary hover:text-text",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          All proposals
        </Link>
        <div className="gap-3 sm:flex-row sm:items-start sm:justify-between flex flex-col">
          <div className="gap-1.5 flex flex-col">
            <h1 className="font-semibold tracking-tight font-display text-title">
              {proposal.title}
            </h1>
            <p className="text-sm text-text-secondary">
              Version {proposal.version} · valid until {proposal.validUntil}
            </p>
          </div>
          <div className="gap-2 flex flex-wrap items-center">
            <ButtonLink
              href={`/portal/proposals/${proposal.id}/pdf`}
              variant="secondary"
              size="sm"
              data-testid="proposal-download-pdf"
            >
              <Download aria-hidden className="size-4" />
              Download PDF
            </ButtonLink>
            <Badge
              tone={PROPOSAL_STATUS_TONES[proposal.status] ?? "neutral"}
              data-testid="proposal-status"
            >
              {PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
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
          <CardTitle className="text-base">Scope &amp; pricing</CardTitle>
          <CardDescription>Exactly as issued by Ibtatech</CardDescription>
        </CardHeader>
        <CardContent className="gap-5 flex flex-col">
          <LineItems lines={proposal.lines} currency={proposal.currency} />
          <dl className="gap-2 text-sm max-w-xs ml-auto flex w-full flex-col">
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="text-text tabular-nums">
                {formatMoneyMinor(proposal.subtotalMinor, proposal.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-text">Total</dt>
              <dd className="font-semibold text-text tabular-nums" data-testid="proposal-total">
                {formatMoneyMinor(proposal.totalMinor, proposal.currency)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {proposal.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-text-secondary">{proposal.notes}</p>
          </CardContent>
        </Card>
      )}

      <ProposalResponse proposalId={proposal.id} status={proposal.status} />
    </div>
  );
}
