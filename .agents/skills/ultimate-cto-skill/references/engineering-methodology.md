# Engineering Methodology

Read this when actually writing/modifying code for a real feature (not a throwaway snippet) —
it governs _how_ to build, on top of what to build (main skill) and how the team runs (engineering-rigor.md).
Adapted from proven agentic-development practice (Superpowers methodology): systematic over
ad-hoc, evidence over claims, simplicity as the default.

## 1. Design Before Code (Brainstorm First)

For anything non-trivial, don't jump straight to code:

1. Restate the problem/goal in one or two lines and confirm the sensible assumption (per §1 of
   the main skill) rather than guessing silently on a consequential decision.
2. Sketch the approach and any real alternative worth naming (e.g., "server-rendered vs. client
   fetch" or "new table vs. new column") — one short paragraph, not a document, for normal-sized
   tasks; a fuller written plan only for genuinely large/ambiguous features.
3. Note what's explicitly _out of scope_ for this change, so it doesn't silently grow.

Skip this ceremony for small, unambiguous fixes — match process weight to task size.

## 2. Plan in Small, Verifiable Steps

For multi-file or multi-hour work, break it into small tasks where each one:

- Touches a clear, bounded set of files
- Has an explicit "how do I know this step worked" check (a test passing, a page rendering, an
  endpoint returning the right shape)
- Can be committed on its own without leaving the app in a broken state

Avoid building the entire feature in one giant untested pass — small verified steps catch
mistakes while they're cheap to fix, not after everything is entangled.

## 3. Test-Driven Development (RED → GREEN → REFACTOR)

Default for business logic, API endpoints, and anything with real correctness risk:

1. **RED** — write a test that expresses the desired behavior; run it; confirm it actually fails
   (a test that passes before the code exists is testing nothing).
2. **GREEN** — write the minimum code to make it pass. Resist gold-plating at this step.
3. **REFACTOR** — clean up structure/naming now that behavior is locked in by the passing test,
   re-running tests after each change.

Apply this pragmatically: pure UI polish or exploratory prototyping doesn't need full TDD
ceremony, but anything touching money, auth, data integrity, or a public API does.

## 4. Systematic Debugging (not guess-and-check)

When something is broken, work through phases instead of randomly poking at code:

1. **Reproduce** — get a reliable, minimal way to trigger the bug before touching anything.
2. **Localize** — bisect: is it data, logic, timing/race condition, or environment? Add
   logging/assertions to narrow the region, don't assume based on a hunch.
3. **Root-cause** — trace back to the actual cause, not just the symptom (e.g., a null-check
   patch over a bug that corrupts data upstream is not a fix).
4. **Fix + regression test** — fix the root cause and add a test that would have caught it, so it
   can't silently come back.

For flaky/timing bugs specifically: prefer condition-based waiting (poll for the actual state)
over arbitrary `sleep()` calls, which just move the race around instead of fixing it.

## 5. Verification Before Completion (evidence over claims)

Never declare a task done because the code "looks right." Before saying something works:

- Actually run it (build succeeds, script executes, tests pass)
- Actually view it (open the page/screen, check it renders as intended)
- Actually exercise the specific thing that was asked for (click the flow, hit the endpoint)

If verification isn't possible in the current environment, say so explicitly rather than implying
it was checked. This is the single highest-leverage habit for trustworthy engineering work.

## 6. Code Review Discipline

**Requesting review** — before asking for review, self-check: does it match the plan, does it
have tests, is the diff free of debug leftovers/secrets, is the "why" explained in the
description (see engineering-rigor.md PR checklist for the full list).

**Receiving review** — treat feedback as information, not a verdict to argue with; fix what's
correct, ask a clarifying question (rather than silently ignoring) when a comment seems wrong,
and re-request review after addressing everything rather than merging with open comments.

**Severity triage** — separate "must fix before merge" (correctness, security, data loss risk)
from "nice to have" (style, minor naming) so review doesn't stall on the trivial.

## 7. Parallel / Branch-Based Work

For larger efforts, isolate work on its own branch with a clean baseline (tests passing before
you start) so you always know new failures are yours, not pre-existing. When a change is
genuinely done — tests green, reviewed, verified — decide explicitly how it lands (merge, PR,
keep for later, or discard) rather than leaving it in limbo.

## 8. Core Principles (apply throughout)

- **Simplicity first** — the simplest design that satisfies the real requirement beats a clever
  one that anticipates requirements nobody asked for (YAGNI).
- **DRY, but not prematurely** — extract shared logic once duplication is real and painful, not
  on the first repetition.
- **Process over guessing** — when stuck, switch to a systematic method (above) rather than
  trying random changes and hoping.
