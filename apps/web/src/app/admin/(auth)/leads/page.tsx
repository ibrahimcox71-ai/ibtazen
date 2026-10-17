import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  listLeadsPage,
  type LeadQuery,
  type LeadSource,
  type LeadPipelineStatus,
} from "@ibtatech/leads";
import {
  STATUS_LABELS,
  STATUS_TONES,
  SOURCE_LABELS,
  SERVICE_SLUG_LABELS,
  formatDateTime,
} from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { LeadsFilters, PageLink } from "./leads-filters";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function parseQuery(params: Record<string, string | string[] | undefined>): LeadQuery {
  const single = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const statusRaw = single("status");
  const sourceRaw = single("source");
  const pageRaw = Number(single("page") || "1");
  const sortRaw = single("sort");
  const assignedRaw = single("assignedTo");

  const status = (LEAD_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as LeadPipelineStatus)
    : undefined;
  const source = (LEAD_SOURCES as readonly string[]).includes(sourceRaw)
    ? (sourceRaw as LeadSource)
    : undefined;
  const assignedTo =
    assignedRaw === "unassigned" || /^[c][a-z0-9]{20,}$/i.test(assignedRaw)
      ? assignedRaw
      : undefined;

  return {
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    pageSize: 20,
    search: single("q") || undefined,
    status,
    source,
    assignedTo,
    sort: sortRaw === "oldest" ? "oldest" : "newest",
  };
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("/admin/leads");
  const params = await searchParams;
  const query = parseQuery(params);

  let page;
  try {
    page = await listLeadsPage(query);
  } catch {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Leads</h1>
        <ErrorState
          title="Could not load leads"
          description="The database query failed. Try again."
        />
      </div>
    );
  }

  const filtersActive = Boolean(query.search || query.status || query.source || query.assignedTo);

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Leads</h1>
        <p className="text-sm text-text-secondary">
          {page.total} lead{page.total === 1 ? "" : "s"}
          {filtersActive ? " matching filters" : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <LeadsFilters />
        </CardContent>
      </Card>

      {page.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filtersActive ? "No matching leads" : "No leads yet"}
          description={
            filtersActive
              ? "Try clearing filters or broadening your search."
              : "Submissions from public forms will appear here."
          }
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
                      Lead
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Source
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Owner
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Service
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Budget
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {page.items.map((lead) => (
                    <tr key={lead.id} className="hover:bg-surface-sunken/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className={cn("gap-0.5 py-1 flex flex-col rounded-md", focusRing)}
                        >
                          <span className="font-medium text-text">{lead.name}</span>
                          <span className="text-xs text-text-muted">{lead.email}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[lead.status] ?? "neutral"}>
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {lead.assignedToName ?? <span className="text-text-muted">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {lead.service ? (SERVICE_SLUG_LABELS[lead.service] ?? lead.service) : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{lead.budgetBand ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {formatDateTime(lead.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {page.items.map((lead) => (
              <li key={lead.id}>
                <Card>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className={cn("gap-2 p-4 flex flex-col", focusRing)}
                  >
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium truncate text-text">{lead.name}</p>
                        <p className="text-xs truncate text-text-muted">{lead.email}</p>
                      </div>
                      <Badge tone={STATUS_TONES[lead.status] ?? "neutral"}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </Badge>
                    </div>
                    <div className="gap-x-3 gap-y-1 text-xs flex flex-wrap text-text-secondary">
                      <span>{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                      <span>{lead.assignedToName ?? "Unassigned"}</span>
                      {lead.budgetBand && <span>{lead.budgetBand}</span>}
                      <span className="text-text-muted">{formatDateTime(lead.createdAt)}</span>
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {page.pageCount > 1 && (
        <nav
          aria-label="Leads pagination"
          className="gap-3 flex flex-wrap items-center justify-between"
        >
          <p className="text-sm text-text-muted">
            Page {page.page} of {page.pageCount}
          </p>
          <div className="gap-2 flex">
            <PageLink page={page.page - 1} disabled={page.page <= 1}>
              Previous
            </PageLink>
            <PageLink page={page.page + 1} disabled={page.page >= page.pageCount}>
              Next
            </PageLink>
          </div>
        </nav>
      )}
    </div>
  );
}
