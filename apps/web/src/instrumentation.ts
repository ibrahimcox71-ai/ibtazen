import { collectProductionEnvWarnings } from "@ibtatech/leads/env-guard";
import { logRequestError } from "@/lib/telemetry/ingest";

/**
 * Next.js instrumentation (server): the observability seam for things that
 * never reach a React boundary - boot, and every failed route handler /
 * server action / RSC render via `onRequestError`. Both hooks must be
 * fail-silent: a crash in the logger must not take the server down.
 */

export async function register(): Promise<void> {
  console.log(
    "[web:boot]",
    JSON.stringify({
      time: new Date().toISOString(),
      node: process.version,
      env: process.env.NODE_ENV,
    }),
  );
  if (process.env.NODE_ENV !== "production") return;
  // Fail-loud config check: surface a misconfigured deploy at boot, before
  // traffic hits it. Never fatal - a warning must not take the server down.
  try {
    for (const warning of collectProductionEnvWarnings(process.env)) {
      console.warn(`[env] ${warning}`);
    }
  } catch {
    /* env reporting is best-effort */
  }
}

export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routePath?: string; routeType?: string },
): Promise<void> {
  logRequestError({ error, request, context });
}
