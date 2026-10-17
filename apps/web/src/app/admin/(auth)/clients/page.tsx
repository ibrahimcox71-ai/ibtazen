import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  canAccessCrm,
  listClientsForActor,
  listContractsForActor,
  type ClientListItem,
  type ContractWithRelations,
} from "@ibtatech/leads";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONES, formatDateTime } from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function LeadLink({ client }: { client: ClientListItem }) {
  return (
    <Link
      href={`/admin/leads/${client.leadId}`}
      className={cn(
        "min-h-11 gap-1 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
        focusRing,
      )}
    >
      {client.leadName}
    </Link>
  );
}

function ClientLink({ client }: { client: ClientListItem }) {
  return (
    <Link
      href={`/admin/clients/${client.id}`}
      className={cn(
        "min-h-11 font-medium inline-flex max-w-full items-center rounded-md break-words text-text hover:text-accent",
        focusRing,
      )}
      data-testid="client-detail-link"
    >
      {client.name}
    </Link>
  );
}

export default async function AdminClientsPage() {
  const user = await requireUser("/admin/clients");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Clients</h1>
        <ErrorState title="Not authorized" description="The client registry requires CRM access." />
      </div>
    );
  }

  // Fetch inside try/catch; construct JSX only after the block (React rule).
  let clients: ClientListItem[] | null = null;
  let contracts: ContractWithRelations[] = [];
  let unauthorized = false;
  let failed = false;
  try {
    const result = await listClientsForActor(user);
    if (result.ok) clients = result.clients;
    else unauthorized = true;
    if (!unauthorized) {
      const contractResult = await listContractsForActor(user);
      if (contractResult.ok) contracts = contractResult.contracts;
      else unauthorized = true;
    }
  } catch {
    failed = true;
  }

  const contractsByClientId = new Map<string, ContractWithRelations>();
  for (const c of contracts) {
    if (!contractsByClientId.has(c.clientId)) contractsByClientId.set(c.clientId, c);
  }

  if (unauthorized || !clients) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Clients</h1>
        {failed ? (
          <ErrorState
            title="Could not load clients"
            description="The database query failed. Try again."
          />
        ) : (
          <ErrorState
            title="Not authorized"
            description="The client registry requires CRM access."
          />
        )}
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Clients</h1>
        <p className="text-sm text-text-secondary">
          {clients.length} client{clients.length === 1 ? "" : "s"} converted from won leads
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Convert a won lead to create the first client record."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[860px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Client
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Organization
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Converted
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Source lead
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Contract
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {clients.map((client) => {
                    const contract = contractsByClientId.get(client.id);
                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-surface-sunken/60"
                        data-testid="client-row"
                      >
                        <td className="px-4 py-3 font-medium text-text">
                          <ClientLink client={client} />
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {client.organizationName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          <a
                            href={`mailto:${client.email}`}
                            className="break-all text-accent underline-offset-2 hover:underline"
                          >
                            {client.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                          {formatDateTime(client.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="gap-2 flex flex-wrap items-center">
                            <LeadLink client={client} />
                            <Badge tone="success">Won</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {contract ? (
                            <Badge
                              tone={CONTRACT_STATUS_TONES[contract.status] ?? "neutral"}
                              data-testid="client-contract-status"
                            >
                              {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                            </Badge>
                          ) : (
                            <span
                              className="text-xs text-text-muted"
                              data-testid="client-contract-none"
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {clients.map((client) => {
              const contract = contractsByClientId.get(client.id);
              return (
                <li key={client.id} data-testid="client-row">
                  <Card>
                    <CardContent className="gap-2 p-4 flex flex-col">
                      <div className="gap-2 flex items-start justify-between">
                        <div className="min-w-0">
                          <ClientLink client={client} />
                          <p className="text-xs truncate text-text-muted">
                            {client.organizationName ?? client.email}
                          </p>
                        </div>
                        <div className="gap-1 flex shrink-0 flex-col items-end">
                          <Badge tone="success">Won</Badge>
                          {contract && (
                            <Badge
                              tone={CONTRACT_STATUS_TONES[contract.status] ?? "neutral"}
                              data-testid="client-contract-status"
                            >
                              {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="gap-x-3 gap-y-1 text-xs flex flex-wrap items-center justify-between text-text-secondary">
                        <span>{formatDateTime(client.createdAt)}</span>
                        <LeadLink client={client} />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
