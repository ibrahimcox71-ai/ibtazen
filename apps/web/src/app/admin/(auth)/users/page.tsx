import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, ErrorState } from "@ibtatech/ui";
import { canManageUsers, listCrmUsersForActor, type ManagedCrmUser } from "@ibtatech/leads";
import { formatDateTime } from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { CreateUserForm, UserRowActions } from "./user-actions";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function StatusBadge({ user }: { user: ManagedCrmUser }) {
  return user.active ? (
    <Badge tone="success" data-testid="user-status">
      Active
    </Badge>
  ) : (
    <Badge tone="danger" data-testid="user-status">
      Deactivated
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge tone={role === "admin" ? "accent" : "neutral"} data-testid="user-role">
      {role === "admin" ? "Admin" : "Staff"}
    </Badge>
  );
}

export default async function AdminUsersPage() {
  const user = await requireUser("/admin/users");

  if (!canManageUsers(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Users</h1>
        <ErrorState
          title="Not authorized"
          description="Managing CRM accounts requires an admin role."
        />
      </div>
    );
  }

  // Fetch inside try/catch; construct JSX only after the block (React rule).
  let users: ManagedCrmUser[] | null = null;
  let failed = false;
  try {
    const result = await listCrmUsersForActor(user);
    if (result.ok) users = result.users;
    else failed = true;
  } catch {
    failed = true;
  }

  if (failed || !users) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Users</h1>
        <ErrorState
          title="Could not load users"
          description="The database query failed. Try again."
        />
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Users</h1>
        <p className="text-sm text-text-secondary">
          {users.length} CRM account{users.length === 1 ? "" : "s"} — create logins for teammates
          and manage admin or staff roles.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="gap-4 flex flex-col">
          <div className="gap-1 flex flex-col">
            <h2 className="text-sm font-semibold text-text">New user</h2>
            <p className="text-xs text-text-muted">
              The password never leaves the server — share it with them over a secure channel.
            </p>
          </div>
          <CreateUserForm />
        </div>
      </Card>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No accounts yet"
          description="Create the first CRM login above."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[900px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Last login
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {users.map((row) => (
                    <tr
                      key={row.id}
                      className="align-top hover:bg-surface-sunken/60"
                      data-testid="user-row"
                    >
                      <td className="px-4 py-3 font-medium text-text">
                        {row.name}
                        {row.id === user.id && (
                          <span className="ml-2 text-xs font-normal text-text-muted">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <a
                          href={`mailto:${row.email}`}
                          className="break-all text-accent underline-offset-2 hover:underline"
                        >
                          {row.email}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={row.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge user={row} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <UserRowActions user={row} isSelf={row.id === user.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {users.map((row) => (
              <li key={row.id} data-testid="user-row">
                <Card>
                  <CardContent className="gap-3 p-4 flex flex-col">
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium truncate text-text">
                          {row.name}
                          {row.id === user.id && (
                            <span className="ml-2 text-xs font-normal text-text-muted">(you)</span>
                          )}
                        </p>
                        <p className="text-xs truncate break-all text-text-muted">{row.email}</p>
                      </div>
                      <div className="gap-1 flex shrink-0 flex-col items-end">
                        <RoleBadge role={row.role} />
                        <StatusBadge user={row} />
                      </div>
                    </div>
                    <p className="text-xs text-text-muted">
                      Last login: {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never"}
                    </p>
                    <UserRowActions user={row} isSelf={row.id === user.id} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
