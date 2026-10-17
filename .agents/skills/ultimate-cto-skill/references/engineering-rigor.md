# Engineering Rigor

Read this when setting up team workflow/process, designing an experimentation program, or
choosing between competing tools/vendors for a project.

## 1. Git Workflow & Code Review

- Branch naming: `type/short-description` (`feat/checkout-flow`, `fix/cart-total-rounding`,
  `chore/upgrade-deps`) — makes history and CI status skimmable.
- Trunk-based or short-lived feature branches over long-lived branches; merge/rebase frequently
  to avoid painful conflicts.
- Commit messages: imperative mood, one logical change per commit ("Add rate limiting to login
  endpoint", not "fixes" or "wip").
- **PR checklist** (apply before requesting review):
  - [ ] Description explains _why_, not just what (link the ticket/issue)
  - [ ] Self-reviewed the diff once before requesting review
  - [ ] Tests added/updated for the change; existing tests pass
  - [ ] No secrets, debug logs, or commented-out code left in
  - [ ] Screenshots/GIF included for any UI change
  - [ ] Migration is reversible or the irreversibility is called out explicitly
- Reviewers: focus comments on correctness, security, and maintainability first; style nitpicks
  last (and ideally automated via linter, not human review time).
- Require CI green (lint, type-check, tests) before merge is even reviewable, to keep review time
  focused on substance.

## 2. A/B Testing Framework

- Only test changes with enough traffic to reach statistical significance in a reasonable
  timeframe — for low-traffic products, prefer qualitative testing (user interviews, session
  recordings) over underpowered A/B tests that produce noise.
- Define the primary success metric and minimum detectable effect _before_ launching the test,
  not after looking at early results (this prevents p-hacking/stopping early on a lucky swing).
- Run one meaningful change per test where possible — bundling multiple changes makes it
  impossible to attribute the result.
- Always account for novelty effects (a change can look good for the first few days simply
  because it's different) — run tests for at least one full business cycle (often 1-2 weeks
  minimum) before concluding.
- Segment results by device/new-vs-returning user before declaring a global winner — a change can
  win overall while hurting a specific important segment.
- Document every test's hypothesis, result, and decision (ship/kill/iterate) in one running log —
  this compounds into genuine institutional knowledge over time.

## 3. Vendor / Tool Selection Matrix

When choosing between competing tools/services (hosting, email, payments, analytics, CMS, auth),
evaluate on the same axes every time rather than picking on familiarity alone:

| Axis          | Questions to ask                                                                          |
| ------------- | ----------------------------------------------------------------------------------------- |
| Fit           | Does it solve _this_ specific need, or is it generically popular?                         |
| Cost at scale | What does it cost at 10x current usage, not just today's tier?                            |
| Lock-in       | How hard is migration away later (data export, proprietary format)?                       |
| Reliability   | Published uptime/SLA, status page history, incident transparency                          |
| DX            | Docs quality, SDK/language support, time-to-first-integration                             |
| Compliance    | Does it meet the project's data-residency/privacy requirements (see legal-compliance.md)? |
| Support       | Response time/tier needed vs. what's actually offered at the planned budget               |

Default bias: prefer boring, proven tools for anything load-bearing (payments, auth, primary
database) and save novelty/cutting-edge tools for genuinely differentiating parts of the product.
