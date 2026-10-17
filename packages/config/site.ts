/**
 * Brand facts — domain, canonical URL, the description every surface reuses.
 *
 * Deliberately its own module instead of living in `index.ts`: `seo.ts` and
 * `llms.ts` need these at module scope (absolute URLs for `/llms.txt`, the
 * default og:image), and importing them from the barrel would make them import
 * a file that imports them back. `index.ts` re-exports `SITE`, so consumers
 * keep importing it from `@ibtatech/config`.
 */

export const SITE = {
  name: "Ibtatech",
  legalName: "Ibtatech Ltd",
  domain: "ibtatech.com",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://ibtatech.com",
  description:
    "Ibtatech builds high-performance websites, web applications, Android & iOS apps, automated customer journeys, and performance-driven advertising systems for ambitious businesses.",
  email: "hello@ibtatech.com",
} as const;
