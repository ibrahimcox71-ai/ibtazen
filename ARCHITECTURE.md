# Ibtatech — Architecture

Status: **Phase 1–9 complete, Phase 11–29 complete** (monorepo, design system, public site, lead engine, admin CRM foundation, operable CRM with assignment/activity/follow-ups, proposal lifecycle, Expo Router mobile marketing screens — Phase 8, client conversion & registry, internal client contracts, project delivery registry, project detail page, internal invoice foundation, client detail aggregate, case study management with published landing slots). **Phase 10 was never executed** — a numbering gap left by the original 14-phase plan, not a hidden phase. **Client Portal complete** (`/portal` — Phase 17: client auth flow, portal shell, overview + proposals/projects/invoices views, self-service password change at `/portal/account` — Phase 19, and proposal accept/decline from `/portal/proposals/[id]` — Phase 21). **CRM notification emails live** (proposal, contract, invoice and portal-invite events through the Resend-ready transport — Phase 18). **Public case studies** (`/case-studies` + `/case-studies/[slug]`, backed by a stable `CaseStudy.slug` — Phase 20). **Observability live** (client error reporting into `/api/client-errors`, server boot + `onRequestError` logging via `instrumentation.ts`, liveness probe at `/api/health` - structured JSON lines on stdout, no vendor). **Public API live** (`POST /api/leads`, the JSON twin of the website forms). **GEO live** (`/llms.txt` rendered from typed config). **Blog live** (`/blog` + `/blog/[slug]` with `BlogPosting` schema, admin publishing at `/admin/blog`, `sitemap.xml` entries and `/blog/rss.xml` — Phase 25; optional post cover image with alt text plus a YouTube/Vimeo embed behind an https + host allow-list — Phase 26). **Admin surfaces live** (CRM user management at `/admin/users` — Phase 22, invoice/proposal PDF download plus email attachment — Phase 23, case-study image upload with alt text and list sort order — Phase 24). **People publishing live** (`TeamMember` CRUD at `/admin/team`, unpublished by default with generated-name photo upload, published complete profiles on the homepage and in Organization Person schema — Phase 29). Team photos follow the existing disk-backed uploads convention at `uploads/team/`; deployments with ephemeral or read-only filesystems need a persistent volume or object storage. Later phases build on this base.

## 1. System overview

```
┌────────────────────────────────────────────────────────────────┐
│                        clients                                 │
│  apps/web (Next.js 16 · RSC)      apps/mobile (Expo SDK 57)    │
│  marketing → admin → portal       Android + iOS                │
└──────────────┬─────────────────────────────┬───────────────────┘
               │  import                     │  import
┌──────────────▼─────────────────────────────▼───────────────────┐
│                       shared packages                          │
│  ui (tokens, components, motion)   types (domain contracts)    │
│  config (brand/nav/services)       utils (cn, focus, palette)  │
└──────────────┬─────────────────────────────────────────────────┘
               │  future phases
┌──────────────▼─────────────────────────────────────────────────┐
│  app layer: server actions / route handlers / core services    │
│  data layer: Prisma → SQLite (Phase 4–6) — portable to Postgres│
└────────────────────────────────────────────────────────────────┘
```

Presentation → application → business logic → data access → database, in that order. UI
components never contain business rules; that boundary is enforced by package layout now and by
the service layer from Phase 4.

## 2. Workspace map

| Workspace         | Purpose                      | Key contents                                                                                                                                                                                                                                                                   |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`        | Next.js App Router site      | `(site)` public routes, `/admin` CRM, proxy gate, error pages, observability (client error ingest, health probe, request-error instrumentation)                                                                                                                                |
| `apps/mobile`     | Expo Router app              | src/app routes: home, services + detail, about, pricing, FAQ, contact, on shared tokens                                                                                                                                                                                        |
| `packages/ui`     | Design system                | `tokens.css`, `theme.tsx`, `motion.tsx`, 16 components                                                                                                                                                                                                                         |
| `packages/config` | Single source of truth       | `SITE`, `NAV_LINKS`, `SERVICES`                                                                                                                                                                                                                                                |
| `packages/types`  | Contracts                    | service slugs, CRM/delivery statuses, roles, `ApiError`                                                                                                                                                                                                                        |
| `packages/leads`  | Lead engine + admin auth/CRM | Prisma/SQLite lead persistence, auth, RBAC, notes, assignment, activities, follow-ups, proposals, client conversion & registry, internal contracts, project delivery registry, internal invoices, client detail aggregate, case studies (admin CRUD + published landing slots) |
| `packages/utils`  | Leaf utilities               | `cn`, `focusRing`, motion tokens, RN palette                                                                                                                                                                                                                                   |

Dependency direction is strictly downward: `web → ui → utils`; nothing imports upward, and
`types`/`utils`/`config` import no framework code (mobile-safe).

## 3. Key decisions & rationale

| #   | Decision                                                         | Alternatives              | Why                                                                                                                          |
| --- | ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | npm workspaces (no Turborepo/Nx)                                 | pnpm + turborepo          | npm is the only manager on this machine; scale is fine for 2 apps + 4 packages. Revisit only if build times hurt.            |
| 2   | Next.js 16.3.5, React 19.3                                       | Next 15                   | Latest stable; RSC-first per spec. Peer-verified against eslint-config-next.                                                 |
| 3   | TypeScript 5.9.3 exact, **not** TS 7                             | typescript@7              | typescript-eslint@8 (used by `eslint-config-next`) requires `<6.1.0`. TS 7 is the native rewrite; the toolchain isn't ready. |
| 4   | ESLint 9 (flat config via FlatCompat)                            | ESLint 10                 | typescript-eslint@8.46 supports `^9`; v10 support landed only in newer releases than `eslint-config-next` pins.              |
| 5   | Tailwind v4 CSS-first tokens                                     | v3 + tailwind.config      | Tokens live in CSS (`@theme`), semantic variables flip for dark mode with zero duplicate config.                             |
| 6   | Radix primitives (Dialog/Dropdown/Tabs)                          | roll our own              | Accessibility (focus trap, keyboard, ARIA) is hard to get right; Radix is the industry baseline.                             |
| 7   | Motion for React with global `MotionConfig reducedMotion="user"` | framer-motion package     | Same library, current package name; global reduced-motion compliance from one line.                                          |
| 8   | Expo SDK 57 (RN 0.86.3, React 19.2.3)                            | bare RN / Flutter         | OTA + managed native dirs; version trio generated by `create-expo-app` for guaranteed alignment.                             |
| 9   | Semantic color tokens over raw palette                           | `bg-brand-600` everywhere | Theming (light/dark/system) and future white-labeling change in one file.                                                    |
| 10  | Fonts via `next/font` (Inter + Fraunces + JetBrains Mono)        | `<link>` tags             | Self-hosted, preloaded, zero layout shift.                                                                                   |

## 4. Design system

**Token layering** (`packages/ui/tokens.css`):

1. `@theme` — primitives (brand/ink ramps), fluid type scale, breakpoints, radii, easing.
2. `:root` / `.dark` — semantic roles (`--surface`, `--text-primary`, `--accent`, status colors,
   elevation). Dark mode swaps role values only.
3. `@theme inline` — exposes roles as Tailwind utilities (`bg-surface`, `text-text-secondary`,
   `border-border-default`, `shadow-md`…).

**Typography**: fluid `clamp()` scale (`display`, `headline`, `title`, `lead`) — no
breakpoint-specific sizes. Display/headline use Fraunces; UI uses Inter.

**Components**: Button (+ButtonLink), Input, Textarea, Field/FieldGroup (auto-wired ARIA),
Card family, Badge, Alert, Dialog, Dropdown, Tabs, Header, Footer, ThemeToggle,
Loading/Empty/Error states, Skeleton. All compose `focusRing` from `@ibtatech/utils` and use
semantic tokens exclusively.

**Theming**: `ThemeProvider` (light/dark/system, localStorage-persisted) + `THEME_BOOTSTRAP_SCRIPT`
blocking `<head>` script → zero flash. ThemeToggle renders a neutral icon pre-hydration to avoid
mismatches.

## 5. Motion system

Single entry point `packages/ui/src/motion.tsx`:

- Presets: `staggerContainer`/`staggerItem`, `sectionReveal`, `pageTransition`.
- Components: `Reveal` (scroll), `StaggerGroup`/`StaggerItem`, plus per-primitive entrance/
  exit/press animations (dialog scale+fade, header slide, nav underline layout animation).
- Rules enforced: `opacity`/`transform` only; entrances ≤ 0.5s; feedback ≤ 0.2s; no looping
  animation except loading spinners; `reducedMotion="user"` globally + CSS
  `prefers-reduced-motion` fallback that collapses all transitions to ~0ms.
- **Scroll reveals are visible by default.** `Reveal`/`StaggerGroup` render with
  `initial={false}` + `animate={controls}`, so the server HTML ships no `opacity:0` and the
  `animate="visible"` variant leaked by `(site)/template.tsx` cannot reach them (an
  AnimationControls object stops variant-context inheritance). After mount each one decides
  once: it only arms its own `IntersectionObserver` (`rootMargin: 0px 0px 240px 0px`,
  `threshold: 0`) when it starts below the fold, on a live page, with IO available and no
  reduced-motion preference. Scroll/resize listeners plus a 250ms poll guarantee an instant
  settle 1.2s after entering the lead zone even when the observer never reports; a genuine
  entry hides then fades up, but only while still below the fold — a late observer must never
  blank content the reader already sees. Reveal happens once and never hides again.
  Rationale: a full-page screenshot does not expand the viewport, so observers never fire
  inside a capture — hidden-by-default content would be invisible there.

## 6. Responsive strategy

- Mobile-first utilities; fluid type and `max-w-7xl` containers; `overflow-x: clip` on `body`
  as an overflow backstop.
- Breakpoint tokens: `xs: 360px` and `3xl: 1920px` added to Tailwind's default scale.
- Touch targets: `h-11` (44px) controls at md size; header/close buttons `size-11`.
- Validation matrix: 320 / 360 / 375 / 390 / 414 / 430 / 768 / 834 / 1024 / 1280 / 1440 / 1920
  (checked in-browser during this phase; ultra-wide layouts use fluid containers, not fixed
  pixel widths).

## 7. Future-proofing

- **Portal auth (live):** `Role` = admin | staff | team | client in `packages/types`.
  The portal route group is `/portal` (login + `(auth)` shell) and resolves through
  `resolvePortalSession` — portal role **and** a linked `Client` (`AdminUser.clientId`,
  unique). Admin and portal share one `ibtatech_session` cookie, but each layout gates
  its own role, so the two principals never cross. Records stay read-only
  except for two self-service writes: the password change at
  `/portal/account` (`changePortalPassword`): principal from the session,
  current password verified against the stored hash through the login
  throttle, and every session except the one making the change revoked; and
  the Phase 21 proposal response (`respondToPortalProposal`): a `sent`
  proposal can be accepted or declined from `/portal/proposals/[id]`,
  scoped to the session's Client, written with a `status = "sent"`
  compare-and-swap, recorded as an activity under the portal user, and
  never winning the lead or opening a contract on its own.
- **i18n (§58):** all copy renders from components/config (no scattered literals in logic);
  routing can adopt `[locale]` segments without structural rewrites.
- **API (§47):** `ApiError` is the error contract for every route handler. The
  public surface is `POST /api/leads` (`apps/web/src/app/api/leads/route.ts`) —
  a JSON twin of the contact/estimate forms that accepts `application/json`
  with an optional `source` (`contact` | `estimate`, everything else is
  server-side only) and returns `201 { ok, leadId }`. Failures are always an
  `ApiError` body (`fieldErrors` is the one optional extension): 400
  `invalid_request`/`invalid`, 405, 409 `duplicate`, 413 `payload_too_large`,
  415 `unsupported_media_type`, 429 `rate_limited` (+ `Retry-After`), 500
  `internal_error`. Transport checks (content type, 32 KB cap, object root)
  live in `apps/web/src/lib/api.ts`; the route adapts transport only — the lead
  engine still owns validation, rate limiting, dedupe and notifications, so an
  API post and a form post behave identically. The browser forms continue to
  use server actions.
- **GEO / AI discoverability (live):** `GET /llms.txt`
  (`apps/web/src/app/llms.txt/route.ts`) serves a markdown index in the
  llmstxt.org format — entity summary, services, engagement process,
  positioning facts, the global FAQ answers as `### Q` blocks, canonical page
  links and the legal documents. The body is rendered by
  `packages/config/llms.ts` from the same typed config as the pages
  (`SITE`, `SERVICES`, `GLOBAL_FAQS`, `ENGAGEMENT_PROCESS`,
  `POSITIONING_FACTS`), so it can never claim anything a page does not, and it
  is revalidated hourly. Classic SEO (`sitemap.xml`, `robots.txt`, canonical
  - OpenGraph per page) and AEO (`FAQPage` JSON-LD on `/faq`, `/pricing` and
    every service page, `Organization`/`WebSite`/`Service`/`BreadcrumbList`)
    already ship from `packages/config/seo.ts`.
- **Blog / content hub (live):** `BlogPost` (Prisma, `slug @unique`) is written only from
  `/admin/blog` — `createBlogPost`/`updateBlogPost` in `packages/leads/src/blog.ts`
  own validation, slug derivation/collision handling and the publish-date rule
  (`publishedAt` stamped on first publish, stable afterwards, cleared on unpublish),
  gated by `canAccessCrm`/`canMutateLeads`. The public reads
  `listPublishedBlogPosts`/`getPublishedBlogPostBySlug` are published-only and
  fail-soft (a database error renders an empty list or a 404, never a stack trace)
  and project a `PublishedBlogPost` DTO with no creator identity. `/blog`,
  `/blog/[slug]`, `sitemap.xml` and the RSS feed (`/blog/rss.xml`) all read that
  one surface, and the detail page emits `BlogPosting` + `BreadcrumbList` from
  `articleSchema` (`packages/config/seo.ts`). Article bodies are stored as a
  **constrained Markdown subset** parsed by `apps/web/src/lib/blog/markdown.ts`
  and rendered as React text — no raw HTML, and link hrefs are restricted to
  relative paths / `http(s)` / `mailto:`, so stored content cannot inject
  markup or script.
- **Mobile:** RN consumes `@ibtatech/utils` palette + `@ibtatech/types`; web and app
  share one visual identity by construction. Expo Router screens read all copy from
  `@ibtatech/config`, so marketing changes land in both platforms from one source.
- **Middleware deprecation (resolved):** Next.js 16 warns that `middleware.ts` will be
  replaced by `proxy.ts`. The edge presence-check gate now lives in `apps/web/src/proxy.ts`
  (same behavior, `PROXY_FILENAME` contract) — no pending rename.
- **Transactional email (lead flow live):** `packages/leads/src/email.ts` owns a transport
  seam — Resend over the HTTP API when `RESEND_API_KEY` is set, a console transport
  otherwise (`EMAIL_TRANSPORT=console` forces it). Every send returns
  `delivered: false` rather than pretending success, so a keyless environment never
  fakes delivery. `notifyNewLead` renders two messages from `email-templates.ts`
  (`renderLeadNoticeEmail` → `LEAD_NOTIFY_EMAIL`/`SITE.email` with `replyTo` = the
  submitter, `renderLeadAcknowledgementEmail` → the submitter with `replyTo` = the
  site inbox), sends them in parallel and reports failures in `NotificationResult`
  without throwing into the request path. The CRM event hooks live on the same seam
  (`src/crm-notifications.ts`): proposal marked sent → the client contact, proposal
  accepted and contract reaching active → the CRM inbox, invoice marked sent → the
  client (a `/portal/invoices/{id}` link only when that client has a portal login),
  plus the opt-in portal invite that carries credentials only when an admin asked
  for them. A notification can never fail a transition, and a queue replaces the
  awaited send if volume grows. Wire the key into `apps/web/.env.local` to go live.
- **Observability (live):** three seams, zero vendors - a provider can be attached later
  without touching call sites. (1) The React boundaries report: `app/error.tsx` and
  `app/global-error.tsx` call `reportWebError` (`apps/web/src/lib/telemetry/report.ts`),
  which normalises the throw (Error or not, message clamped, query strings stripped so
  tokens never hit a log), dedupes the same fingerprint for 30s, caps at 8 reports/minute
  per page session, and beacons to `POST /api/client-errors`. (2) That route validates the
  body in `lib/telemetry/ingest.ts` - hand-rolled, dependency-free, never throws - applies a
  per-IP budget (20/min, bounded in-memory map) and writes one JSON line to stdout
  (`[web:error] ...`); `instrumentation.ts` adds the server half (`[web:boot]` on start and
  `[web:request-error]` for every failed route handler / server action / RSC render, carrying
  Next's `digest`). (3) `GET /api/health` is the liveness probe (no cache, no database).
  Known limits: the rate limiter is per process (swap for a shared store when scaling out),
  and `global-error.tsx` renders with inline styles because the root layout's CSS may be
  unavailable when it fires.
