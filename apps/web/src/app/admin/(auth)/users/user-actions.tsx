"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, Field, FieldSelect } from "@ibtatech/ui";
import { PASSWORD_MIN_LENGTH, type ManagedCrmUser } from "@ibtatech/leads";
import {
  changeCrmUserRoleAction,
  createCrmUserAction,
  setCrmUserActiveAction,
  type ManageCrmUserResult,
} from "@/lib/admin/actions";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
] as const;

/** Server error codes → the one sentence the operator should see. */
const MESSAGES: Record<string, string> = {
  unauthorized: "Only admins can manage users.",
  not_found: "That account no longer exists.",
  invalid_input: "Enter a name, a valid email and a password of at least 12 characters.",
  invalid_role: "Choose a valid role (admin or staff).",
  email_taken: "That email is already used by another account.",
  self_target: "You cannot deactivate your own account.",
  last_admin: "There must always be at least one active admin.",
  invalid: "The change could not be saved.",
};

function failureMessage(state: ManageCrmUserResult | null): string | null {
  if (!state || state.ok) return null;
  return state.message ?? MESSAGES[state.error] ?? "The change could not be saved.";
}

/** Create form for a new CRM login — admin-only, rendered behind the page gate. */
export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<ManageCrmUserResult | null, FormData>(
    async (_prev, formData) => createCrmUserAction(formData),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const failure = failureMessage(state);

  return (
    <form ref={formRef} action={formAction} className="gap-3 flex flex-col" noValidate>
      <div className="gap-3 sm:grid-cols-2 grid grid-cols-1">
        <Field
          label="Name"
          name="name"
          autoComplete="off"
          required
          maxLength={120}
          placeholder="Full name"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="name@ibtatech.com"
        />
      </div>
      <div className="gap-3 sm:grid-cols-2 grid grid-cols-1">
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          placeholder="At least 12 characters"
          hint={`They sign in at /admin with this password. Minimum ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <FieldSelect label="Role" name="role" options={[...ROLE_OPTIONS]} defaultValue="staff" />
      </div>

      {failure && (
        <Alert tone="danger" title="Account not created">
          {failure}
        </Alert>
      )}
      {state?.ok && (
        <Alert tone="success" title="Account created">
          The new user can now sign in at /admin.
        </Alert>
      )}

      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}

/**
 * Per-row controls: change role, activate/deactivate. The deactivate button
 * is disabled for the signed-in admin — the service blocks self-lockout too.
 */
export function UserRowActions({ user, isSelf }: { user: ManagedCrmUser; isSelf: boolean }) {
  const [roleState, roleAction, rolePending] = useActionState<ManageCrmUserResult | null, FormData>(
    async (_prev, formData) => changeCrmUserRoleAction(user.id, formData),
    null,
  );
  const [activeState, activeAction, activePending] = useActionState<
    ManageCrmUserResult | null,
    FormData
  >(async (_prev, _formData) => setCrmUserActiveAction(user.id, !user.active), null);

  const roleFailure = failureMessage(roleState);
  const activeFailure = failureMessage(activeState);

  return (
    <div className="gap-3 flex flex-col">
      <form action={roleAction} className="gap-2 flex flex-wrap items-end">
        <FieldSelect
          label="Role"
          name="role"
          options={[...ROLE_OPTIONS]}
          defaultValue={user.role}
          containerClassName="min-w-32 flex-1"
        />
        <Button type="submit" loading={rolePending} variant="secondary" size="sm">
          {rolePending ? "Saving…" : "Save role"}
        </Button>
      </form>
      {roleFailure && (
        <Alert tone="danger" title="Role not saved">
          {roleFailure}
        </Alert>
      )}
      {roleState?.ok && (
        <Alert tone="success" title="Role updated">
          {user.name} is now {user.role === "admin" ? "an admin" : "staff"}.
        </Alert>
      )}

      <form action={activeAction}>
        <Button
          type="submit"
          loading={activePending}
          variant={user.active ? "secondary" : "primary"}
          size="sm"
          disabled={activePending || isSelf}
          title={isSelf ? "You cannot deactivate your own account." : undefined}
        >
          {activePending ? "Saving…" : user.active ? "Deactivate" : "Reactivate"}
        </Button>
      </form>
      {activeFailure && (
        <Alert tone="danger" title="Status not saved">
          {activeFailure}
        </Alert>
      )}
      {activeState?.ok && (
        <Alert tone="success" title={user.active ? "Account activated" : "Account deactivated"}>
          {user.active
            ? `${user.name} can sign in again.`
            : `${user.name} was signed out and can no longer sign in.`}
        </Alert>
      )}
    </div>
  );
}
