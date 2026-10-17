"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@ibtatech/ui";
import { PASSWORD_MIN_LENGTH } from "@ibtatech/leads";
import { changePortalPasswordAction, type ChangePasswordResult } from "@/lib/portal/actions";

const MESSAGES: Record<string, string> = {
  unauthorized: "Your session expired — sign in again.",
  invalid_input: "Enter your current password and a new one of at least 12 characters.",
  invalid_password: "That current password is not correct.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
  invalid: "The new password could not be saved.",
};

/**
 * Self-service password change. The server re-resolves the signed-in portal
 * user from the session, so this form never carries an id — only the two
 * passwords.
 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordResult | null, FormData>(
    async (_prev, formData) => changePortalPasswordAction(null, formData),
    null,
  );

  const success = state?.ok ? state : null;
  const failure = state && !state.ok ? state : null;

  return (
    <form
      key={success ? "changed" : "idle"}
      action={formAction}
      className="gap-3 flex flex-col"
      noValidate
    >
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Enter your current password"
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        hint={`Minimum ${PASSWORD_MIN_LENGTH} characters. Signing out everywhere except this session.`}
      />

      {failure && (
        <Alert tone="danger" title="Password not changed">
          {failure.message ?? MESSAGES[failure.error] ?? "The new password could not be saved."}
        </Alert>
      )}
      {success && (
        <Alert tone="success" title="Password changed">
          Your new password is active. Any other signed-in session was signed out.
        </Alert>
      )}

      <Button type="submit" loading={pending} className="self-start">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
