import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { listPortalProposals } from "@ibtatech/leads";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_TONES,
  formatMoneyMinor,
} from "@/lib/admin/labels";
import { formatIsoDate } from "@/lib/portal/labels";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Proposals",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PortalProposalsPage() {
  const user = await requirePortalUser("/portal/proposals");
  const result = await listPortalProposals(user);

  if (!result.ok) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Proposals</h1>
        <ErrorState
          title="Could not load proposals"
          description="Your portal session could not be matched to a client record."
        />
      </div>
    );
  }

  const { proposals } = result;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Proposals</h1>
        <p className="text-sm text-text-secondary">
          Commercial proposals issued to you — drafts are internal and never shown here.
        </p>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Proposals appear here as soon as Ibtatech sends one to you."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[720px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Proposal
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Valid until
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {proposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className="hover:bg-surface-sunken/60"
                      data-testid="proposal-row"
                    >
                      <td className="px-4 py-3">
                        <div className="gap-0.5 flex flex-col">
                          <Link
                            href={`/portal/proposals/${proposal.id}`}
                            className={cn(
                              "min-h-11 font-medium inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                              focusRing,
                            )}
                            data-testid="proposal-title"
                          >
                            {proposal.title}
                          </Link>
                          <span className="text-xs text-text-muted">
                            Version {proposal.version}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={PROPOSAL_STATUS_TONES[proposal.status] ?? "neutral"}
                          data-testid="proposal-status"
                        >
                          {PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {formatIsoDate(proposal.validUntil)}
                      </td>
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap text-text"
                        data-testid="proposal-total"
                      >
                        {formatMoneyMinor(proposal.totalMinor, proposal.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {proposals.map((proposal) => (
              <li key={proposal.id} data-testid="proposal-row">
                <Card>
                  <div className="gap-3 p-4 flex flex-col">
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/portal/proposals/${proposal.id}`}
                          className={cn(
                            "font-medium text-accent underline-offset-2 hover:underline",
                            focusRing,
                          )}
                          data-testid="proposal-title"
                        >
                          {proposal.title}
                        </Link>
                        <p className="text-xs text-text-muted">
                          Version {proposal.version} · valid until{" "}
                          {formatIsoDate(proposal.validUntil)}
                        </p>
                      </div>
                      <Badge
                        tone={PROPOSAL_STATUS_TONES[proposal.status] ?? "neutral"}
                        data-testid="proposal-status"
                      >
                        {PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-text" data-testid="proposal-total">
                      {formatMoneyMinor(proposal.totalMinor, proposal.currency)}
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
