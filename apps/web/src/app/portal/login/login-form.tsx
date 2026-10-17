"use client";

import { Alert, Button, Field } from "@ibtatech/ui";
import Link from "next/link";
import { useActionState } from "react";
import { loginPortalAction, type PortalLoginResult } from "@/lib/portal/actions";

const initial: PortalLoginResult | null = null;

export function PortalLoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginPortalAction, initial);

  return (
    <form action={formAction} className="gap-5 flex flex-col" noValidate>
      {state && !state.ok && (
        <Alert
          tone={state.error === "rate_limited" ? "warning" : "danger"}
          title={
            state.error === "rate_limited"
              ? "Too many attempts"
              : state.error === "invalid_input"
                ? "Check your email and password"
                : "Sign-in failed"
          }
        >
          {state.error === "rate_limited"
            ? "Too many sign-in attempts from this network. Please wait a few minutes and try again."
            : state.error === "invalid_input"
              ? "Enter a valid email address and your password."
              : "Those credentials don’t match an active portal account. Your login is issued by Ibtatech — contact us if you need access."}
        </Alert>
      )}

      <input type="hidden" name="next" value={next ?? "/portal"} />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        placeholder="you@company.com"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••••••"
      />

      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-xs text-center text-text-muted">
        Read-only access to your engagement with Ibtatech.{" "}
        <Link href="/" className="underline underline-offset-4 hover:text-text-secondary">
          Back to site
        </Link>
      </p>
    </form>
  );
}
