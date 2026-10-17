import { PASSWORD_MIN_LENGTH } from "./auth/password";

/**
 * Production boot guardrails — one loud pass over the environment so a
 * misconfigured deploy is visible at startup instead of silent at runtime:
 * emails that never leave the machine (console transport, `delivered:false`),
 * session hashing that throws on the first login, a bootstrap admin that can
 * never be created.
 *
 * Pure and environment-injected so it stays trivially testable; the caller
 * decides when to run it (the web app does it in `instrumentation.ts`,
 * production only).
 */

export type EnvLike = Record<string, string | undefined>;

const AUTH_SECRET_MIN_LENGTH = 32;

function len(value: string | undefined): number {
  return value?.length ?? 0;
}

export function collectProductionEnvWarnings(env: EnvLike): string[] {
  const warnings: string[] = [];

  const forced = env.EMAIL_TRANSPORT?.trim();
  const apiKey = env.RESEND_API_KEY?.trim();
  if (forced === "console") {
    warnings.push(
      "EMAIL_TRANSPORT=console — production logs emails instead of sending them; every notice reports delivered:false (unset it to use Resend)",
    );
  } else if (forced && forced !== "console") {
    warnings.push(
      `EMAIL_TRANSPORT="${forced}" is not recognised — only "console" has an effect; the transport is chosen by RESEND_API_KEY`,
    );
  } else if (!apiKey) {
    warnings.push(
      "RESEND_API_KEY is not set — production falls back to the console transport and every notice reports delivered:false (set it in apps/web/.env.local)",
    );
  } else {
    if (!env.EMAIL_FROM?.trim()) {
      warnings.push(
        'EMAIL_FROM is not set — Resend picks its default sender; use a verified identity such as "Ibtatech <hello@ibtatech.com>"',
      );
    }
    if (!env.LEAD_NOTIFY_EMAIL?.trim()) {
      warnings.push(
        "LEAD_NOTIFY_EMAIL is not set — admin lead notices fall back to the public site inbox",
      );
    }
  }

  const secret = env.AUTH_SECRET?.trim();
  if (!secret || secret.length < AUTH_SECRET_MIN_LENGTH) {
    warnings.push(
      secret
        ? `AUTH_SECRET is ${secret.length} characters (needs ${AUTH_SECRET_MIN_LENGTH}+) — session hashing throws in production; generate with: openssl rand -hex 32`
        : "AUTH_SECRET is not set — session hashing throws in production; generate with: openssl rand -hex 32",
    );
  }

  const bootstrapEmail = env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const bootstrapPassword = env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  if (bootstrapEmail && !bootstrapPassword.trim()) {
    warnings.push(
      "ADMIN_BOOTSTRAP_EMAIL is set without ADMIN_BOOTSTRAP_PASSWORD — the bootstrap admin will never be created",
    );
  } else if (bootstrapEmail && bootstrapPassword.length < PASSWORD_MIN_LENGTH) {
    warnings.push(
      `ADMIN_BOOTSTRAP_PASSWORD is ${len(bootstrapPassword)} characters (needs ${PASSWORD_MIN_LENGTH}+) — the bootstrap admin will be skipped`,
    );
  } else if (!bootstrapEmail && bootstrapPassword.trim()) {
    warnings.push(
      "ADMIN_BOOTSTRAP_PASSWORD is set without ADMIN_BOOTSTRAP_EMAIL — no bootstrap admin will ever be created",
    );
  }

  return warnings;
}
