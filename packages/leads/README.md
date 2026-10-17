# @ibtatech/leads

Unified lead engine: contact, audits, estimator, and booking all normalise
into one `Lead` model through one pipeline. Phase 5–6 adds admin auth, RBAC,
lead assignment, append-only activity history, and follow-ups. Phase 7 adds
the proposal lifecycle; Phase 9 converts won leads into first-class Clients
with an internal `/admin/clients` registry. Phase 11 snapshots an accepted
proposal into an internal Contract (not an e-sign system). Phase 12 opens
an internal Project from an ACTIVE Contract (`Client + Active Contract →
Project`) with a delivery registry at `/admin/projects` and a detail
surface at `/admin/projects/[id]` (Phase 13). Phase 14 opens an internal
Invoice from an ACTIVE Contract (`Active Contract → Invoice`) with a
registry at `/admin/invoices` and a detail surface at `/admin/invoices/[id]`.
Phase 15 opens a Client Detail aggregate at `/admin/clients/[id]`: one
authorized read of the Client plus **every** Contract, every client-scoped
Project, every Invoice resolved through Invoice → Contract → Client, and the
originating Lead's unified append-only activity timeline. Phase 16 adds
Case Study management: an admin CRUD surface at `/admin/case-studies` that
owns the landing page's "Selected work" slots, where only a `PUBLISHED`
slot-1 row is served to the public site — and Phase 20 publishes those
stories to `/case-studies` and `/case-studies/[slug]` behind a stable,
admin-editable URL slug. Phase 18 routes CRM events (proposal, contract,
invoice, portal invite) through the same email transport. The Client Portal
adds a `/portal` surface (Phase 17):
`role = "client"` logins linked to a Client
row, portal reads scoped by that link, admin-only provisioning, and two
self-service actions — changing your own password (Phase 19), and accepting or
declining a **sent** proposal (Phase 21). Phase 22 adds CRM user management at
`/admin/users`, Phase 23 renders invoice and proposal PDFs for portal download
and email attachment, and Phase 24 adds case-study image upload with alt text
and list sort order. Phase 27 gives those stories a YouTube/Vimeo embed link
(migration `20260929103058_phase27_case_study_video`) checked against the same
https + host allow-list as the blog and stored as its canonical embed URL.
Phase 25 adds Blog posts: an
admin CRUD surface at `/admin/blog` behind a stable, admin-editable URL
slug, publishing `PUBLISHED` rows to `/blog`, `/blog/[slug]`, the sitemap
and the RSS feed. Phase 26 adds post media: an optional cover image
(stored by apps/web, key linked here) and a YouTube/Vimeo embed URL
validated against an https + host allow-list on write and re-checked
before it renders (migration `20260929090553_phase26_blog_media`).

## Pipeline

```
server action → parseLeadPayload (zod, strict) → checkRateLimit (per-IP)
             → dedupe (unique open-lead key) → Prisma create → notifyNewLead
                   (admin notice + submitter acknowledgement, via the email transport)
```

## Structure

| File                                     | Responsibility                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain.ts`                          | statuses, transitions, sources, timelines, activity types (framework-free)                                                                                                                                |
| `src/url.ts`                             | URL normalisation (http/s only, strips tracking params)                                                                                                                                                   |
| `src/validation.ts`                      | zod boundary schemas — the single security gate                                                                                                                                                           |
| `src/rate-limit.ts`                      | in-memory sliding window (see RATE_LIMIT.md)                                                                                                                                                              |
| `src/repository.ts`                      | the only Prisma-aware module (leads, auth, assignment, activities, follow-ups, proposals, clients, contracts, projects, case studies, blog posts)                                                         |
| `src/notifications.ts`                   | notify orchestration: renders both lead emails, aggregates delivery results, never throws into the request path                                                                                           |
| `src/crm-notifications.ts`               | CRM event hooks: proposal sent/accepted, contract signed, invoice issued, portal invite — same never-throw contract                                                                                       |
| `src/email.ts`                           | transport seam — Resend when `RESEND_API_KEY` is set, console otherwise, `setEmailTransport` for tests                                                                                                    |
| `src/email-templates.ts`                 | HTML + text renderers for the lead and CRM event emails (escaping, palette-derived layout)                                                                                                                |
| `src/leads.ts`                           | orchestration: parse → throttle → persist → notify                                                                                                                                                        |
| `src/clients.ts`                         | won-lead → Client conversion, registry listing, and Client Detail aggregate (RBAC)                                                                                                                        |
| `src/contracts.ts`                       | accepted proposal → internal Contract snapshot + status transitions (RBAC)                                                                                                                                |
| `src/projects.ts`                        | active contract → delivery Project + detail fetch + status transitions (RBAC)                                                                                                                             |
| `src/invoices.ts`                        | active contract → internal Invoice snapshot + status transitions (RBAC)                                                                                                                                   |
| `src/case-studies.ts`                    | marketing case study CRUD, slug handling, and public published reads (RBAC)                                                                                                                               |
| `src/blog.ts`                            | blog post CRUD, slug handling, publish-date stamping, cover/embed media, and the published-only public reads used by `/blog` (RBAC)                                                                       |
| `src/portal.ts`                          | Client Portal: admin-only access provisioning, self-service password change, client-scoped read models, and the portal proposal response (RBAC, IDOR-guarded)                                             |
| `src/auth/`                              | login, sessions, RBAC, CRM mutations (status, notes, assign, follow-ups)                                                                                                                                  |
| `prisma/schema.prisma`                   | Lead, AdminUser, AdminSession, LeadNote, LeadActivity, FollowUp, Proposal, Client, Contract, Project, Invoice, CaseStudy, BlogPost                                                                        |
| `prisma/migrations/`                     | applied migrations (`phase16_case_studies` adds CaseStudy; `phase17_client_portal` links portal logins to Clients; `phase20_case_study_slug` adds the public URL slug; `phase25_blog_post` adds BlogPost) |
| `tests/phase6.crm.test.ts`               | Phase 6 unit + integration + security coverage                                                                                                                                                            |
| `tests/phase7.proposal.test.ts`          | Phase 7 proposal lifecycle: domain transitions, server-computed totals, versioning, RBAC/IDOR, Accept & Win                                                                                               |
| `tests/phase9.client.test.ts`            | Phase 9 client conversion unit + integration + security coverage                                                                                                                                          |
| `tests/phase11.contract.test.ts`         | Phase 11 contract snapshot, RBAC, and transition coverage                                                                                                                                                 |
| `tests/phase12.project.test.ts`          | Phase 12 project registry, RBAC, IDOR, transition, and Phase 13 detail-fetch coverage                                                                                                                     |
| `tests/phase14.invoice.test.ts`          | Phase 14 invoice snapshot, RBAC, IDOR, transition, and atomicity coverage                                                                                                                                 |
| `tests/phase15.client.test.ts`           | Phase 15 client detail aggregate, multi-contract, activity atomicity, scoping, and timeline coverage                                                                                                      |
| `tests/phase16.case-study.test.ts`       | Phase 16 case study validation, slot uniqueness, RBAC, and public published-slot coverage                                                                                                                 |
| `tests/phase20.case-study-slug.test.ts`  | slug derivation/validation/uniqueness, stable URLs across renames, and the public list/detail reads                                                                                                       |
| `tests/phase25.blog.test.ts`             | Phase 25 blog vocabulary, validation, slug collisions, publish-date stamping, RBAC, and draft-hiding on the public surface                                                                                |
| `tests/portal.test.ts`                   | portal provisioning, login/session role gates, client scoping, IDOR, and draft-hiding coverage                                                                                                            |
| `tests/phase18.crm-emails.test.ts`       | CRM event emails: recipients, template rendering/escaping, transition hooks, invite opt-in, failure containment                                                                                           |
| `tests/phase19.portal-password.test.ts`  | portal self-service password change: authorization, validation, current-password check, throttle, session revocation                                                                                      |
| `tests/phase21.portal-proposal.test.ts`  | portal proposal response: authorization, decision/id validation, IDOR, draft hiding, atomic accept/decline, activity + CRM email, terminal state                                                          |
| `tests/phase22.user-management.test.ts`  | Phase 22 CRM user management: RBAC gates, create/role/deactivate, final-admin protection, session revocation, no password hashes in lists                                                                 |
| `tests/phase23.document-pdf.test.ts`     | Phase 23 invoice/proposal PDF rendering: structure, string escaping, pagination, Resend base64 attachments                                                                                                |
| `tests/phase24.case-study-media.test.ts` | Phase 24 case-study image key validation, alt text, sort order, replace/clear, and slot-independent list ordering                                                                                         |
| `tests/phase26.blog-media.test.ts`       | Phase 26 cover filename/alt validation, https + host allow-listed video embeds, image key replace/clear, and the media on the public read                                                                 |
| `tests/phase27.case-study-video.test.ts` | Phase 27 case-study video links: invalid host/scheme/length rejection, canonical embed normalisation on create and update, published-only public read                                                     |
| `tests/email.test.ts`                    | transport selection, both lead templates, escaping, HTML/text bodies, failure containment, Resend payload contract                                                                                        |

**Contract uniqueness:** one Contract per accepted Proposal (`proposalId`
unique) — equivalent to one per Client + accepted proposal version because
Client is 1:1 with Lead and Proposal versions are unique per Lead.

**Project uniqueness:** one Project per ACTIVE Contract (`contractId`
unique). Project status starts as `planning` (server-assigned). Lifecycle:
`planning → active | archived`, `active → review | paused | archived`,
`review → active | completed | paused`, `paused → active | archived`,
`completed → archived`, `archived` terminal. Activity types:
`project_created`, `project_status_changed` (written to LeadActivity via
the Client's source Lead).

**Invoice uniqueness & lifecycle:** one Invoice per ACTIVE Contract
(`contractId` unique). Creation takes only `contractId` — currency, lines,
subtotal, total, title, actor, and ownership are snapshotted server-side
from the Contract (integer minor units; no tax, discount, or ledger).
Invoice numbers are server-generated (`INV-000001`, …). Status starts as
`draft` (server-assigned). Lifecycle: `draft → sent | void`,
`sent → paid | void`, `paid` and `void` terminal. **`paid` is a manual
internal mark by a CRM actor — not a payment-gateway confirmation.** No
automatic, overdue, partial, or refunded states. Activity types:
`invoice_created`, `invoice_status_changed`. An optional `dueDate` is an
operational display deadline only (issue date + 30 days); no overdue state
is derived from it. Phase 14 non-goals: Stripe/payment processing, PDF
generation, tax/discount engines, Payment/Ledger models.

**Client detail & multi-contract:** `getClientDetailForActor` is the single
authorization gate (`canAccessCrm`, then a cuid-shaped id, then `not_found`
for both malformed and missing ids). Every list afterwards is scoped server-
side from `client.id` / `client.leadId` — nothing ownership-related is taken
from the browser. A client keeps **all** of its contracts (one per accepted
proposal version); Projects are fetched with `listProjectsByClientId`, and
Invoices with `listInvoicesByClientId` through the unique
`Invoice.contractId → Contract.clientId` chain — no Invoice→Client column is
introduced. The timeline is the Lead's own `LeadActivity` history, newest
first, rendered by the shared `describeActivity` helper in
`apps/web/src/lib/admin/labels.ts`. Activity type
`contract_status_changed` is written in the **same transaction** as the
contract status write by `updateContractStatusWithActivity`, so a rejected
transition or a failed activity insert never leaves a partial write or an
orphan activity row. Phase 15 non-goals: per-client tenancy, contract
editing/deletion, e-sign, and any change to the contract lifecycle
(`draft → out_for_signature → active → void`).

**Case studies & landing slots:** `CaseStudy` holds one row per landing slot
— `slotNumber` is `@unique`, so each of slots 1-4 holds at most one story: slot
1 is the featured story in the public "Selected work" section and slots 2-4
fill the grid beside it, each replacing its placeholder only once published.
Statuses are `IN_PRODUCTION` (default, never
public) and `PUBLISHED`. Reads split in three: `listCaseStudiesForActor` and
`getCaseStudyForActor` require `canAccessCrm` (cuid-shaped id, then
`not_found`); `getPublishedCaseStudyForSlot(slot)` is the public, fail-soft
read used by the landing page — a draft, a missing row, or a database error
all return `null`, so the marketing page still renders its placeholder; and
`listPublishedCaseStudies` / `getPublishedCaseStudyBySlug(slug)` back
`/case-studies` and `/case-studies/[slug]`, projecting a `PublishedCaseStudy`
DTO that carries no creator identity, CRM ids, or pipeline data. `metrics` is
a JSON array string (`[{ label, value }]`) parsed defensively by
`parseCaseStudyMetrics`. Every raw form field is validated in
`createCaseStudy`/`updateCaseStudy`; `slug` (`@unique`, derived from the title
when blank, stable across renames) and `slotNumber` are the duplicate guards
(`CaseStudySlugTakenError` → `slug_taken`, `CaseStudySlotTakenError` →
`slot_taken`). Phase 16 non-goals: image/media uploads, ordering beyond the
slot number, and any change to the CRM lead pipeline.

**Blog posts:** one row per article with a `@unique` `slug`, so `/blog/[slug]`
stays stable across title edits. Statuses are `DRAFT` (default, never public)
and `PUBLISHED`; `publishedAt` is stamped on the first publish and kept
stable afterwards (search results, the sitemap, the RSS feed and
`BlogPosting` schema all report the same history), cleared on unpublish.
Reads split in three: `listBlogPostsForActor` / `getBlogPostForActor`
require `canAccessCrm`; `createBlogPost` / `updateBlogPost` require
`canMutateLeads` and validate title, excerpt, body, tags, status and slug in
the service; `listPublishedBlogPosts` / `getPublishedBlogPostBySlug` are the
fail-soft public reads behind `/blog`, `/blog/[slug]`, `sitemap.xml` and
`/blog/rss.xml`, projecting a `PublishedBlogPost` DTO with no creator
identity or CRM ids. `tags` is a JSON array string parsed by
`parseBlogTags`, `readingMinutes` is derived from the body by
`blogReadingMinutes`. Duplicate slugs surface as `BlogSlugTakenError` →
`slug_taken`, on create and update alike.

**Client portal:** `AdminUser` gains an optional unique
`clientId` FK — a portal login is a `role = "client"` row linked to exactly
one Client, and a user without that link can never open a session.
`loginPortal` / `resolvePortalSession` mirror the CRM login (same zod
validation, rate limiter, HMAC-hashed session token, TTL) but gate on
`canAccessPortal`, so CRM credentials never open a portal session and portal
credentials never open a CRM one. `provisionPortalAccess` (admin-only via
`canManageUsers`) creates or resets that login and revokes its live
sessions on reset; the `clientId` unique constraint is the one-per-client
guard. Reads (`getPortalOverview`, `list/getPortalProposals|Projects|
Invoices`) resolve the Client from the session only — record ids are
re-checked against `client.id` / `client.leadId` after the fetch (IDOR
guard) and return `not_found` for malformed ids. Draft proposals and draft
invoices are never projected (internal work-in-progress), and DTOs omit
actors, lead pipeline data, internal notes, and activities. The first
portal-side mutation is `changePortalPassword`: the principal comes from
the session (never the form), the current password is verified against
the stored hash inside the same IP+email login throttle as `loginPortal`,
only the `passwordHash` column is written, and every session except the
one making the change is revoked — `currentSessionToken` omitted revokes
all of them. Portal non-goals: editing client, project or invoice records,
payments, and per-contact multi-user accounts.

**Portal proposal response:** `respondToPortalProposal` is the only
portal-side write that touches a commercial record. It takes the session
principal, a proposal id and an `accept`/`decline` decision (zod enum —
nothing else crosses the wire): authorization runs through the same
`loadScopedClient` scope as the reads, the proposal is re-checked against
`client.leadId` (IDOR guard) and against draft-hiding, and only a `sent`
row can move. The write itself is a compare-and-swap on
`status = "sent"` (`answerProposalStatusRow`), so a double submit or two
racing devices can never both win; the losing request reports
`invalid_transition`. The response records a `proposal_accepted` /
`proposal_declined` activity **under the portal user's id** with
`metadata.source = "portal"` and fires the existing CRM email hook (an
accept notifies the CRM inbox; a decline has no template and sends
nothing). Accepting never wins the lead and never opens a Contract —
`winLeadFromAcceptedProposal` and `createContractFromProposal` stay
explicit CRM actions, and an answered proposal is terminal for portal and
CRM alike. Phase 21 non-goals: counter-offers, partial acceptance,
comments/messages on a proposal, and any e-signature step.

**CRM event emails:** each commercial transition that matters renders and
sends a message through the same transport seam (`src/crm-notifications.ts`).
Proposal marked `sent` goes to the client contact with scope, totals and
notes in the body; proposal `accepted` and contract reaching `active` go to
the CRM inbox (`LEAD_NOTIFY_EMAIL` / `SITE.email`, `replyTo` the client);
invoice marked `sent` goes to the client and advertises a
`/portal/invoices/{id}` link **only** when that client actually has a portal
login. The portal invite is opt-in (`sendInvite`): the password leaves the
server only when an admin explicitly asked for the email, and the result
reports the transport's honest answer (`invite.requested` /
`invite.delivered`). A notification can never fail or roll back a
transition — the CRM row still records state only, failures are logged, and
a keyless environment reports `delivered: false` instead of pretending.
Non-goals: attachments/PDF rendering, cc/bcc, per-event template editing,
and a delivery queue.

## Environment

- `DATABASE_URL` — SQLite file URL (e.g. `file:./prisma/dev.db`); portable to
  Postgres by switching the datasource provider and URL.

## Commands

```bash
npm run db:generate --workspace @ibtatech/leads   # prisma generate
npm run db:deploy  --workspace @ibtatech/leads    # migrate deploy
npm run test       --workspace @ibtatech/leads    # unit + integration (real SQLite)
```
