import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, FolderKanban, Receipt, Wallet } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { getPortalOverview } from "@ibtatech/leads";
import { formatMoneyMinor } from "@/lib/admin/labels";
import { requirePortalUser } from "@/lib/portal/session";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage() {
  const user = await requirePortalUser("/portal/overview");
  const result = await getPortalOverview(user);

  if (!result.ok) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Overview</h1>
        <p className="text-sm text-text-secondary">
          Your portal account could not be matched to an active client record. Please contact
          Ibtatech to re-issue access.
        </p>
      </div>
    );
  }

  const { overview } = result;
  const tiles = [
    {
      key: "proposals",
      label: "Proposals",
      value: overview.counts.proposals,
      href: "/portal/proposals",
      icon: FileText,
      description: "Sent and accepted",
    },
    {
      key: "projects",
      label: "Projects",
      value: overview.counts.projects,
      href: "/portal/projects",
      icon: FolderKanban,
      description: "Delivery status",
    },
    {
      key: "invoices",
      label: "Invoices",
      value: overview.counts.invoices,
      href: "/portal/invoices",
      icon: Receipt,
      description: "Issued to date",
    },
    {
      key: "due",
      label: "Amount due",
      value: overview.outstanding.reduce((sum, row) => sum + row.minor, 0),
      href: "/portal/invoices",
      icon: Wallet,
      description:
        overview.outstanding.length > 1
          ? `${overview.outstanding.length} currencies outstanding`
          : "Across issued invoices",
      isMoney: true,
      currency: overview.outstanding[0]?.currency ?? "GBP",
    },
  ];

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">
          {overview.client.organizationName || overview.client.name}
        </h1>
        <p className="text-sm text-text-secondary">
          Your engagement with Ibtatech — everything here is read-only.
        </p>
      </div>

      <section aria-label="At a glance" className="gap-3 flex flex-col">
        <div className="gap-3 sm:grid-cols-2 xl:grid-cols-4 grid grid-cols-1">
          {tiles.map((tile) => (
            <Link
              key={tile.key}
              href={tile.href}
              className={cn(
                "p-4 rounded-lg border border-border-subtle bg-surface transition-colors hover:bg-surface-sunken",
                focusRing,
              )}
            >
              <div className="gap-3 flex flex-col">
                <div className="gap-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{tile.label}</span>
                  <tile.icon aria-hidden className="size-4 text-text-muted" />
                </div>
                <p className="text-2xl font-semibold font-display text-text tabular-nums">
                  {tile.isMoney ? formatMoneyMinor(tile.value, tile.currency) : tile.value}
                </p>
                <p className="text-xs text-text-muted">{tile.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="gap-4 lg:grid-cols-2 grid">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
            <CardDescription>Held on your client record</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="gap-3 text-sm flex flex-col">
              <div className="gap-1 flex flex-col">
                <dt className="text-xs tracking-wide text-text-muted uppercase">Name</dt>
                <dd className="text-text">{overview.client.name}</dd>
              </div>
              <div className="gap-1 flex flex-col">
                <dt className="text-xs tracking-wide text-text-muted uppercase">Email</dt>
                <dd className="text-text">{overview.client.email}</dd>
              </div>
              {overview.client.organizationName && (
                <div className="gap-1 flex flex-col">
                  <dt className="text-xs tracking-wide text-text-muted uppercase">Organisation</dt>
                  <dd className="text-text">{overview.client.organizationName}</dd>
                </div>
              )}
              {overview.client.phone && (
                <div className="gap-1 flex flex-col">
                  <dt className="text-xs tracking-wide text-text-muted uppercase">Phone</dt>
                  <dd className="text-text">{overview.client.phone}</dd>
                </div>
              )}
              <div className="gap-1 flex flex-col">
                <dt className="text-xs tracking-wide text-text-muted uppercase">Client since</dt>
                <dd className="text-text">
                  {new Date(overview.client.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 flex-row items-start justify-between">
            <div className="gap-1.5 flex flex-col">
              <CardTitle className="text-base">Next steps</CardTitle>
              <CardDescription>Jump back into your workspace</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="gap-1 flex flex-col">
              {[
                {
                  href: "/portal/proposals",
                  label: "Review proposals",
                  detail: "Scope, pricing and validity dates",
                },
                {
                  href: "/portal/projects",
                  label: "Track delivery",
                  detail: "Current phase and target dates",
                },
                {
                  href: "/portal/invoices",
                  label: "Check invoices",
                  detail: "Amounts, issue dates and payment status",
                },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "gap-3 min-h-11 px-2 py-2 flex items-center justify-between rounded-md transition-colors hover:bg-surface-sunken",
                      focusRing,
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{item.label}</p>
                      <p className="text-xs truncate text-text-muted">{item.detail}</p>
                    </div>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs gap-2 flex items-center text-text-muted">
        <Badge tone="neutral">Read-only</Badge>
        Need something changed? Reply to your Ibtatech contact — portal accounts cannot edit
        records.
      </p>
    </div>
  );
}
