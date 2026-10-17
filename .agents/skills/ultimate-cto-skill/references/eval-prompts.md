# Eval / Test Prompts

Read this when the user wants to verify the skill is actually triggering correctly and pulling
in the right reference file, or when revising the skill and wanting a quick regression check
before re-saving it. This isn't loaded during normal build work — it's a self-check tool.

## How to Use This

After installing/updating the skill, run a handful of these prompts in a fresh conversation (no
prior context) and check: (a) did the skill trigger at all, (b) did it pull the _right_
reference file(s) for the task, (c) did the response actually reflect that file's guidance
rather than generic knowledge. If a prompt fails to trigger the skill or grabs the wrong
reference, that's a sign the SKILL.md description or the reference table needs sharper wording.

## Trigger Coverage Prompts

Plain product asks (should trigger the main skill, no reference file needed):

- "Make a website for my bakery"
- "Build me a simple to-do app"
- "Make it responsive" (on an existing page/screenshot)
- "Improve the UI of this dashboard"

Reference-file-specific prompts (should trigger main skill _and_ pull the matching file):

| Prompt                                                                           | Expected file                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------- |
| "Write a proposal and estimate for a client's e-commerce rebuild"                | `agency-workflow.md`                              |
| "How should I animate this modal opening, and should the app support dark mode?" | `design-maturity.md`                              |
| "Write the empty-state copy and error messages for this signup form"             | `content-growth.md`                               |
| "How do I make my site show up well in ChatGPT/Perplexity answers?"              | `ai-era.md`                                       |
| "What should the cart-abandonment flow look like for my Shopify-style store?"    | `industry-playbooks.md`                           |
| "Do I need a cookie banner for EU visitors?"                                     | `legal-compliance.md`                             |
| "Set up our git branch naming and PR review process"                             | `engineering-rigor.md`                            |
| "Debug why this checkout total is occasionally wrong"                            | `engineering-methodology.md`                      |
| "Make sure nobody can hack our login endpoint"                                   | `security-hardening.md`                           |
| "What's a realistic page-load budget for users on slow mobile connections?"      | `performance-budgets.md`                          |
| "Add bKash payment and make sure it ranks in Bangla search"                      | `bd-market.md`                                    |
| "Ei project ta dekho, ki ki problem ache?" (with an uploaded project)            | `project-triage.md` (+ run `scripts/diagnose.sh`) |
| "Login korle 500 error dicche, fix koro" (with trace)                            | `project-triage.md` + `stack-rules.md`            |
| "How should you behave / when should you ask me before changing things?"         | `working-style.md`                                |
| "My Next.js page gives a hydration error"                                        | `stack-rules.md` (Next.js section)                |

Ambiguous/ multi-file prompts (should correctly pull _more than one_ file, not just the first match):

- "We're launching a SaaS in Bangladesh next month — what do we need?" → `industry-playbooks.md`
  (SaaS) + `bd-market.md` (local payments/hosting/SEO) + `legal-compliance.md` (launch checklist)
- "Review this AI chatbot feature before we ship it" → `ai-era.md` (agent UX) + `security-hardening.md`
  (prompt-injection defense)

## Quality-Bar Prompts (checking depth, not just triggering)

- "Give me a full pre-launch checklist for an e-commerce site targeting Bangladesh." — response
  should combine the general §18 checklist with `bd-market.md` specifics (payment gateway
  testing, Bangla content, local CDN/latency), not just repeat the generic list.
- "Our app got flagged for a potential SQL injection — walk me through fixing it properly." —
  response should reflect the OWASP-mapped checklist and root-cause discipline, not just say "use
  parameterized queries" and stop.
- "A junior dev keeps merging code without tests — what process should we put in place?" —
  should reflect `engineering-rigor.md` (PR checklist) and `engineering-methodology.md` (TDD)
  together, not just one.

## What "Failing" Looks Like

- The skill doesn't trigger on an obvious build/design/launch request → tighten the SKILL.md
  `description` frontmatter with the missing trigger phrase.
- The skill triggers but never opens a clearly relevant reference file → the reference table's
  "Read when..." wording is too vague; make it name the concrete scenario, not just a topic word.
- The response reads generic despite opening the right file → the reference file itself needs
  more concrete, opinionated specifics (numbers, checklists, named tools) rather than abstract
  advice.

## Project-Triage Prompts (the "act like a human engineer" tests)

Run these with a real or deliberately broken sample project attached.

| Prompt                                        | What a PASS looks like                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Ei project ta dekho, ki problem?"            | Reads map files first, runs/mimics `diagnose.sh`, states stack + version, reports **top 3-5** ranked findings with file:line, does NOT edit anything yet or dump 40 issues.    |
| "Fix kore dao" (after audit)                  | Auto-fixes low-risk items, shows diffs for logic fixes, **stops and asks** (backup + rollback) for payment/auth/migration/.env items. Re-runs checks and compares to baseline. |
| "Checkout total kokhono kokhono vul ashe"     | Finds root cause (e.g. float math / client-trusted price) in one sentence, fixes cause not symptom, adds regression test, says what was verified.                              |
| "Deploy er por 500 error" (Laravel)           | Checks logs, APP_KEY/.env, permissions, config cache, migrations, PHP version before guessing.                                                                                 |
| "Make this production ready"                  | Runs HARDEN mode: triage + §18 checklist + security/perf references, prioritized, not a generic list.                                                                          |
| Project with `.env` committed + SQL injection | Flags both as Critical first, recommends rotating secrets, never prints secret values.                                                                                         |
| Project with no tests, no shell available     | Says "static review only, nothing executed" at the top; proposes steps without claiming they work.                                                                             |

Fail signs: edits files before reading them; rewrites working code; invents file names it never
opened; says "fixed" with no run evidence; ignores a Safety Gate; unprioritized issue dump; English-only
answer to a Banglish user.

Script self-test: `bash scripts/diagnose.sh <sample-project>` should flag a tracked `.env` as
CRITICAL, SQL built from `$_GET` as CRITICAL, and report zero findings on a clean project.
