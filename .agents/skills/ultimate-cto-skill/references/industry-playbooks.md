# Industry Playbooks

Read the relevant section for the product type being built (SaaS, e-commerce, marketplace, content/media, education/LMS) — conversion patterns differ enough
between these that generic advice under-serves each one.

## SaaS

- Core loop: trial/freemium → activation (first value moment) → habitual use → upgrade/expand.
- Pricing page and in-app upgrade prompts should be tied to a usage limit the user actually hit,
  not shown generically — contextual upsell converts far better than a persistent banner.
- Instrument activation rate (% of signups reaching first value moment) and weekly-active/monthly-
  active ratio as the two north-star health metrics, above raw signup count.
- Build an admin/settings area that scales with team size from day one (roles, invites, billing
  owner) — retrofitting multi-user support later is expensive.
- Status page and changelog are trust infrastructure, not nice-to-haves, once you have paying users.

## E-commerce

- Product page must answer: what is it, does it fit my need, what does it cost (all-in), how fast
  will I get it, can I return it — all visible without scrolling past the fold on mobile.
- Search and filtering quality matters more than homepage design for revenue on catalogs above
  ~50 products; invest there first.
- Cart abandonment recovery (email sequence; use the `marketing:email-sequence` skill if available, otherwise draft a 3-email sequence: reminder at 1h, social proof/help at 24h, incentive or last-chance at 72h) is typically the
  highest-ROI single addition to an existing store.
- Inventory/stock state must be accurate in real time — showing "in stock" for an out-of-stock
  item is a top driver of support tickets and refunds.
- Reviews/UGC near the buy button outperform reviews on a separate tab.

## Marketplace / Booking

- Solve the cold-start problem explicitly: decide whether supply or demand is seeded first, and
  design the MVP around growing that side (e.g., manually onboard the first providers).
- Trust and safety features (verified profiles, reviews both directions, dispute/cancellation
  policy) are core product, not an afterthought — marketplaces live or die on trust.
- Availability/calendar UX must handle timezone correctly and show real-time conflicts — this is
  the single most bug-prone area in booking products.
- Take-rate/commission transparency: show both sides what they'll actually receive/pay before
  they commit, not just at final confirmation.
- Design the empty-marketplace state (new city, new category) so it doesn't look broken/dead —
  waitlists, "notify me," or curated seed content instead of a blank grid.

## Content / Media Site

- Page speed and ad-load balance directly determine both SEO ranking and revenue — measure both
  together, not separately.
- Structure content for skimming: strong headline, deck/summary, clear subheadings — most readers
  scan before committing to read fully.
- Related-content and internal linking drive session depth more than any single article's quality
  — invest in a real recommendation/related-posts system, not just "latest posts."
- Newsletter capture should offer a specific value exchange (a useful resource, a content
  series) rather than a generic "subscribe for updates" ask.
- For ad-supported sites, Core Web Vitals directly affect both ranking and viewability-based ad
  revenue — treat performance budget as a revenue metric, not just a UX one.

## Education / LMS / School & Course Platforms

- Model the roles first: student, teacher/instructor, admin, guardian/parent (if minors are
  involved). Every screen and API is authorized per role and per ownership (a teacher sees only
  their own classes; a student sees only their own grades) — enforce on the server, never by UI.
- Core entities: course → module → lesson → quiz/assignment → submission → grade → progress →
  certificate. Design the schema for progress tracking and resumability from day one
  (last lesson, completion %, attempts).
- Student data is sensitive, especially for minors: collect the minimum, restrict access by role,
  never expose contact details between students, and keep a clear privacy policy and guardian
  consent flow where required (see `references/legal-compliance.md`).
- Exams and results: server-side timers, randomized question order, one-attempt/limited-attempt
  rules enforced in the backend, and an audit log for every grade change (who, when, old → new).
  Results must never be editable without a trace.
- Certificates: unique ID + QR/URL verification page so a third party can confirm authenticity.
- Payments (if courses are sold): follow the e-commerce rules in `SKILL.md` §22 — server-side
  pricing, verified gateway callbacks, enrollment granted only after confirmed payment, refund
  and access-revocation policy.
- Low-bandwidth, mobile-first: many students use phones on slow or metered data. Compress video,
  offer lower-quality streaming, allow resume, keep pages light, and provide downloadable
  material where licensing permits (see `references/performance-budgets.md`).
- Accessibility is a core requirement, not a bonus: captions/transcripts for video, keyboard
  navigation, readable Bangla/English typography, high contrast.
- Engagement: clear progress bars, next-lesson prompts, deadline reminders (email/SMS/push via
  queue), and simple teacher tools (bulk upload, attendance, announcements, gradebook export).
- Measure learning outcomes, not just traffic: enrollment → activation (first lesson done) →
  completion rate → quiz performance → return rate.
