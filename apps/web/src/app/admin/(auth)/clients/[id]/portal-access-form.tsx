"use client";

import { useActionState } from "react";
import { Alert, Button, Field, FieldCheckbox } from "@ibtatech/ui";
import { PASSWORD_MIN_LENGTH } from "@ibtatech/leads";
import { provisionPortalAccessAction, type ProvisionPortalResult } from "@/lib/admin/actions";

const initial: ProvisionPortalResult | null = null;

const MESSAGES: Record<string, string> = {
  unauthorized: "Only admins can manage portal access.",
  not_found: "That client no longer exists.",
  invalid_input: "Enter a valid email and a password of at least 12 characters.",
  email_taken: "That email is already used by another account.",
  invalid: "Portal access could not be saved.",
};

/**
 * Create / reset form for the Client Portal login. Admin-only — rendered
 * only when the caller passed the `canManageUsers` gate server-side.
 */
export function PortalAccessForm({
  clientId,
  clientEmail,
  provisioned,
}: {
  clientId: string;
  clientEmail: string;
  provisioned: boolean;
}) {
  const [state, formAction, pending] = useActionState<ProvisionPortalResult | null, FormData>(
    async (_prev, formData) => provisionPortalAccessAction(clientId, formData),
    initial,
  );

  const success = state?.ok ? state : null;
  const failure = state && !state.ok ? state : null;

  return (
    <form action={formAction} className="gap-3 flex flex-col" noValidate>
      <Field
        label="Portal email"
        name="email"
        type="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={success?.email ?? clientEmail}
        placeholder="client@company.com"
        hint="The client signs in at /portal with this address."
      />
      <Field
        label={provisioned ? "New password" : "Password"}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        placeholder="At least 12 characters"
        hint={
          provisioned
            ? `Resetting revokes every active portal session. Minimum ${PASSWORD_MIN_LENGTH} characters.`
            : `Share it with the client over a secure channel, or tick below to email it. Minimum ${PASSWORD_MIN_LENGTH} characters.`
        }
      />
      <FieldCheckbox
        name="sendInvite"
        label="Email these login details to the client"
        defaultChecked={success ? success.invite.requested : true}
      />

      {failure && (
        <Alert tone="danger" title="Portal access not saved">
          {failure.message ?? MESSAGES[failure.error] ?? "Portal access could not be saved."}
        </Alert>
      )}
      {success && (
        <Alert tone="success" title={provisioned ? "Password reset" : "Portal login created"}>
          {success.email} can now sign in at /portal.
          {success.invite.requested
            ? success.invite.delivered
              ? " The login details were emailed to them."
              : " The invite email could not be delivered — share the login details yourself."
            : ""}
        </Alert>
      )}

      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Saving…" : provisioned ? "Reset portal password" : "Create portal login"}
      </Button>
    </form>
  );
}
