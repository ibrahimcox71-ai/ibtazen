import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  countOverdueFollowUps,
  getLeadStats,
  LEAD_STATUSES,
  LEAD_SOURCES,
  listLeads,
} from "@ibtatech/leads";
import { STATUS_LABELS, STATUS_TONES, SOURCE_LABELS, formatDateTime } from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireUser("/admin/dashboard");
  const [stats, recent, overdueFollowUps] = await Promise.all([
    getLeadStats(),
    listLeads({ limit: 8 }),
    countOverdueFollowUps(),
  ]);

  const statusTiles = LEAD_STATUSES.map((status) => ({
    status,
    count: stats.byStatus[status] ?? 0,
  }));

  const sourceRows = LEAD_SOURCES.map((source) => ({
    source,
    count: stats.bySource[source] ?? 0,
  })).sort((a, b) => b.count - a.count);

  const attentionTiles = [
    {
      key: "unassigned",
      label: "Unassigned leads",
      count: stats.unassigned,
      href: "/admin/leads?assignedTo=unassigned",
      tone: stats.unassigned > 0 ? ("warning" as const) : ("neutral" as const),
      description: "No owner yet",
    },
    {
      key: "overdue",
      label: "Overdue follow-ups",
      count: overdueFollowUps,
      href: "/admin/leads",
      tone: overdueFollowUps > 0 ? ("danger" as const) : ("neutral" as const),
      description: "Past due date, still open",
    },
  ];

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Dashboard</h1>
        <p className="text-sm text-text-secondary">Live pipeline totals from the leads database.</p>
      </div>

      <section aria-label="Needs attention" className="gap-3 flex flex-col">
        <h2 className="text-sm font-semibold text-text-secondary">Needs attention</h2>
        <div className="gap-3 sm:grid-cols-2 grid grid-cols-1">
          {attentionTiles.map((tile) => (
            <Link
              key={tile.key}
              href={tile.href}
              className={cn(
                "p-4 rounded-lg border border-border-subtle bg-surface transition-colors hover:bg-surface-sunken",
                focusRing,
              )}
            >
              <div className="gap-2 flex flex-col">
                <div className="gap-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{tile.label}</span>
                  <Badge tone={tile.tone}>{tile.count}</Badge>
                </div>
                <p className="text-xs text-text-muted">{tile.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Pipeline totals" className="gap-3 flex flex-col">
        <div className="gap-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">Pipeline</h2>
          <span className="text-xs text-text-muted">Total leads: {stats.total}</span>
        </div>
        <div className="gap-3 sm:grid-cols-4 xl:grid-cols-7 grid grid-cols-2">
          {statusTiles.map(({ status, count }) => (
            <Card key={status} className="p-4">
              <div className="gap-2 flex flex-col">
                <Badge tone={STATUS_TONES[status] ?? "neutral"}>
                  {STATUS_LABELS[status] ?? status}
                </Badge>
                <p className="text-2xl font-semibold font-display text-text tabular-nums">
                  {count}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="gap-4 lg:grid-cols-2 grid">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead sources</CardTitle>
            <CardDescription>Count by submission source</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceRows.every((row) => row.count === 0) ? (
              <EmptyState
                title="No leads yet"
                description="Sources appear once forms receive submissions."
              />
            ) : (
              <ul className="gap-2 flex flex-col">
                {sourceRows.map(({ source, count }) => (
                  <li
                    key={source}
                    className="gap-3 px-3 py-2 text-sm flex items-center justify-between rounded-md bg-surface-sunken"
                  >
                    <span className="text-text-secondary">{SOURCE_LABELS[source] ?? source}</span>
                    <span className="font-medium text-text tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 flex-row items-start justify-between">
            <div className="gap-1.5 flex flex-col">
              <CardTitle className="text-base">Recent leads</CardTitle>
              <CardDescription>
                Latest {recent.length} of {stats.total}
              </CardDescription>
            </div>
            <Link
              href="/admin/leads"
              className={cn(
                "min-h-11 gap-1.5 px-2 text-sm font-medium inline-flex items-center rounded-md text-accent hover:underline",
                focusRing,
              )}
            >
              View all
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                title="No leads yet"
                description="Submissions from public forms will show up here."
              />
            ) : (
              <ul className="gap-2 flex flex-col">
                {recent.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className={cn(
                        "gap-3 px-2 py-2 flex items-center justify-between rounded-md transition-colors hover:bg-surface-sunken",
                        focusRing,
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-text">{lead.name}</p>
                        <p className="text-xs truncate text-text-muted">{lead.email}</p>
                      </div>
                      <div className="gap-2 flex shrink-0 items-center">
                        <Badge tone={STATUS_TONES[lead.status] ?? "neutral"}>
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </Badge>
                        <span className="text-xs sm:inline hidden text-text-muted">
                          {formatDateTime(lead.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
