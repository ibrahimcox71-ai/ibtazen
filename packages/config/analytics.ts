/**
 * Analytics provider — Plausible.
 *
 * Chosen because it is cookieless: no cookies, no personal data, no consent
 * banner (see `apps/web/src/app/(site)/(legal)/cookies/page.tsx`). The script
 * is injected only where `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set — the site ID
 * Plausible expects in `data-domain` — so local dev and previews stay quiet
 * until an account exists. Self-hosted instances also set
 * `NEXT_PUBLIC_PLAUSIBLE_HOST`; the public cloud is the default.
 */
export const ANALYTICS = {
  provider: "plausible",
  /** Site ID Plausible checks against the `data-domain` attribute. */
  domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "",
  host: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ?? "https://plausible.io",
  scriptPath: "/js/script.js",
} as const;

/** Script URL to load, or `null` when analytics has no site configured. */
export const ANALYTICS_SCRIPT_URL: string | null =
  ANALYTICS.domain === "" ? null : `${ANALYTICS.host}${ANALYTICS.scriptPath}`;
