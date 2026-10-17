# AGENTS.md

Instructions for AI agents in this repo. Backlog = `check.md`, design = `ARCHITECTURE.md`, overview = `README.md`.

## Repo map

- npm workspaces monorepo (Node >=20.9; npm, not pnpm/yarn/bun).
- `apps/web` — Next.js 16 App Router (RSC + server actions): public site, `/admin` CRM, `/portal` client portal. Vitest.
- `apps/mobile` — Expo Router app. It has its own `apps/mobile/AGENTS.md` (Expo docs rules) — read it before touching mobile.
- `packages/ui` — design system: `tokens.css`, components, motion.
- `packages/config` — site facts, SEO/OG/JSON-LD, `llms.txt`, analytics, nav, services, FAQs. Inside the package import `SITE` from `./site`, not `./index` (avoids a cycle).
- `packages/leads` — Prisma/SQLite lead engine: auth/CRM, proposals, contracts, invoices, PDF, blog services. Vitest.
- `packages/types`, `packages/utils` — shared contracts and helpers.

## Verify — run all five before declaring done

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx prettier --check .
```

- Format touched files first: `npx prettier --write <paths>` (Prettier + Tailwind plugin = formatting source of truth; `eslint.config.mjs` = lint; TypeScript strict).
- Tests are Vitest; leads tests use a throwaway SQLite (`packages/leads/prisma/test.db`, gitignored).
- For a prod smoke test: `npm run build` then `npx next start -p 3311` from `apps/web`, curl the routes.

## Workflow (backlog)

1. Read `check.md` — it is the only backlog. Status: `pending` → `in-progress` → `done`.
2. Implement per that item's কাজ / ফাইল / শেষ হবে যখন.
3. Verify with the five commands above.
4. Update `check.md`: status + date (YYYY-MM-DD), what landed, test counts, verify line; then `npx prettier --write check.md`.
5. Commit **only when the user explicitly asks**. Style: `feat:`/`fix:`/`test:`/`docs:` + imperative summary; code commit and the `docs:` check.md commit go separately. Never push, never force, never amend someone else's commit.

## Conventions

- Reply in the user's language (Bangla, Banglish, or English).
- Next.js 16 metadata: a child `openGraph`/`twitter` object **replaces** the parent wholesale — every page that sets one must include `images: [OG_IMAGE]` itself.
- Semantic design tokens from `@ibtatech/ui` (`tokens.css`), Tailwind v4 — no raw hex/rgb in components; motion stays on `opacity`/`transform` and respects reduced-motion.
- `NEXT_PUBLIC_*` vars are inlined at **build** time (`apps/web/.env.local`, copied from `.env.example`); never commit real secrets.
- SEO/discovery lives in `packages/config/seo.ts` (canonical/OG/JSON-LD), `llms.ts` + `/llms.txt`, and `robots.ts` (Next's `Robots` type has no `llmsTxt` field — discovery is convention).
- Public API endpoints return the `ApiError` shape (`apps/web/src/lib/api.ts`); server actions are covered at their seam in `apps/web/tests/*-actions.test.ts`.
- Windows + Laragon + PowerShell: prefer the Read tool over `Get-Content` for files containing em-dashes/non-ASCII; touch only files under the workspace root.

## Do not

- Commit or push without an explicit ask.
- Add a dependency without first checking whether the repo already solves it (React is pinned to 19.2.3).
- Claim something works without running it (build / test / smoke).
