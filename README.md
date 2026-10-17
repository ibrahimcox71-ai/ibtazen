# Ibtatech — Digital Technology & Growth Agency Platform

Production-grade monorepo for **ibtatech.com**: marketing website, lead engine, AI assistant,
admin CRM, client portal, billing and a shared-token mobile app.

## Stack

| Layer    | Choice                                                                      |
| -------- | --------------------------------------------------------------------------- |
| Web      | Next.js 16 (App Router, RSC) · React 19 · TypeScript (strict)               |
| Styling  | Tailwind CSS v4 + semantic design tokens (`@ibtatech/ui/tokens.css`)        |
| Motion   | Motion for React, reduced-motion aware, `opacity`/`transform` only          |
| Mobile   | Expo SDK 57 · React Native 0.86 (Android + iOS) sharing web tokens          |
| Packages | `@ibtatech/ui` · `@ibtatech/config` · `@ibtatech/types` · `@ibtatech/utils` |

## Structure

```
apps/
  web/          Next.js — public site (/services, /case-studies, /blog, …) + admin CRM (leads, proposals, clients, contracts, projects, invoices, case studies, blog) + client portal (/portal: scoped record reads, self-service password, proposal accept/decline)
  mobile/       Expo Router app — home, services, about, pricing, FAQ, contact
packages/
  ui/           Design system: tokens, theme provider, motion system, components
  config/       Site config: brand facts, navigation, service registry
  types/        Cross-platform domain contracts
  utils/        cn(), focus ring, motion tokens, shared palette
  leads/        Lead engine + admin auth/CRM: proposals, client conversion & registry, contracts, project registry, invoices, client portal auth, scoped reads, self-service password change & proposal response (Prisma/SQLite)
```

## Commands

```bash
npm install          # install all workspaces
npm run dev:web      # Next.js dev server
npm run dev:mobile   # Expo dev server
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc in every workspace
npm run test         # workspace tests (leads data layer + web telemetry)
npm run build        # production web build
npm run format       # Prettier
```

## Key decisions

- **Semantic tokens, not raw colors.** Components use `bg-surface`, `text-text-secondary`,
  `border-border-default`. Light/dark/system theming flips in one place, with a blocking
  bootstrap script that prevents theme flash.
- **One motion system.** All animation flows through `packages/ui/src/motion.tsx`
  (`Reveal`, `StaggerGroup`, presets). Reduced-motion is enforced globally via
  `<MotionConfig reducedMotion="user">` plus a CSS fallback.
- **Server Components by default.** Client components exist only where interaction or motion
  requires them (`"use client"` at the primitive, not the page).
- **No invented facts.** No clients, metrics, testimonials or certifications exist in the code —
  they get added only when real, per the platform rules.
- **Email never lies about delivery.** The lead flow (admin notice + submitter
  acknowledgement) and the CRM events (proposal sent/accepted, contract signed,
  invoice issued, opt-in portal invite) all go through one transport seam: Resend
  when `RESEND_API_KEY` is present, a console transport otherwise - and
  `delivered: false` is reported until a provider exists.
- **One lead pipeline, two transports.** Contact and estimate submissions arrive
  either as server actions (the website forms) or as JSON over
  `POST /api/leads` (API/mobile clients) — both call `submitLead`, so
  validation, per-IP rate limiting, duplicate detection and notifications are
  identical, and every API failure answers with the shared `ApiError` shape.
- **One source of truth for search and AI answers.** Structured data
  (`Organization`, `WebSite`, `Service`, `FAQPage`, `BlogPosting`, breadcrumbs) and
  `/llms.txt` are rendered from `packages/config` — the same typed facts the
  pages render — so search engines, answer engines and LLM crawlers never see
  a claim the site does not make.
- **Publishing is a CRM concern.** Blog posts are written only from
  `/admin/blog` (RBAC + service validation), published to `/blog`, `/blog/[slug]`,
  the sitemap and `/blog/rss.xml`, and rendered through a constrained Markdown
  subset that escapes everything — stored content can never inject markup.
- **Observability is a seam, not a vendor.** The error boundaries beacon a
  normalised report to `/api/client-errors`, server-side failures log from
  `instrumentation.ts`, and `/api/health` answers liveness - all as structured
  JSON lines on stdout. No SDK is installed; Sentry/OTel can plug into the same
  three call sites later.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design, and `.env.example` for required
environment variables.
