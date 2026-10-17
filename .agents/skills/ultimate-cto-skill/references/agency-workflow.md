# Agency Workflow

Read this when the user is running client work — a proposal, kickoff, sprint planning, client
reporting, or project handoff — not just writing code.

## 1. Discovery / Kickoff

Ask (or infer and confirm) before scoping anything:

- **Business:** What does the client sell, to whom, and how do they make money today?
- **Goal:** What single outcome defines success in 90 days (leads, sales, signups, retention)?
- **Users:** Who uses this, on what device, with what technical comfort?
- **Constraints:** Budget range, deadline, existing tech/brand assets, team who'll maintain it after launch.
- **Competitors:** 2-3 references — what do they like/dislike about each?
- **Content:** Who provides copy/images — client or agency? Is it ready or does it need writing?
- **Success metric:** What number will they check in 6 months to know this worked?

Never start designing/building before these are answered at least at a sensible-assumption level.

## 2. Proposal / Scope of Work (SOW)

Structure every SOW the same way:

1. **Problem statement** — one paragraph, client's words where possible.
2. **Proposed solution** — what you'll build, in plain language, not a feature list.
3. **Deliverables** — explicit, countable ("12 responsive pages", "1 checkout flow", "iOS + Android build").
4. **Out of scope** — say it explicitly; this prevents 80% of scope-creep disputes.
5. **Timeline** — phased, with client-dependency callouts ("Phase 2 starts once copy is delivered").
6. **Investment** — fixed price or milestone-based; note what triggers each payment.
7. **Assumptions** — content readiness, number of revision rounds, browser/device support matrix.

## 3. Estimation

- Break work into features, not hours-only guesses. Estimate each feature in ideal days, then
  multiply by a friction factor (1.3-1.6x) for meetings, revisions, and unknowns.
- Always price revision rounds explicitly (e.g., "2 rounds included, additional rounds billed").
- Flag anything client-dependent (content, API access, brand assets) as a timeline risk up front.
- For fixed-price work, pad scope-ambiguous items; for retainer/hourly, be transparent about tracking.

## 4. Sprint / Milestone Planning

- Default to 1-2 week sprints or clear milestones tied to visible deliverables, not internal tasks.
- Every milestone ends in something the client can _see_ (a demo link, a Figma file, a staging URL) — never an invisible "backend work done."
- Keep a single source of truth for status (board/sheet) the client can check without asking.

## 5. Client Reporting

Weekly/milestone update format (keep it short, always the same shape so it's skimmable):

- **Done this period** (bullet, outcome-framed: "Checkout flow is live on staging" not "worked on checkout")
- **Next period**
- **Blockers / need from you** (be explicit — this is how you avoid your own delays being blamed on you)
- **Risks to timeline or budget**, flagged early, never surprise at the deadline

## 6. Handoff & Post-Launch

- Deliver: credentials list (who owns what — domain, hosting, analytics, source control), a short
  admin/editor guide if there's a CMS, and a known-issues/backlog list.
- Define what "done" means contractually — does it include 30 days of bug-fix support? Define the SLA:
  response time for critical bugs vs. minor issues vs. feature requests.
- Offer (don't assume) a maintenance retainer — many agencies lose recurring revenue by not asking.
- Schedule a 30/60-day check-in to review the success metric from Discovery — this is what turns a
  one-off project into a repeat client.
