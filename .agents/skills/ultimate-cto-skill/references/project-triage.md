# Project Triage — Understand, Diagnose, Fix

Read this FIRST whenever the user hands over a project (zip, folder, repo, uploaded files) or says
things like "fix this", "what's wrong", "review my project", "ki problem", "error dicche", "ta ta
kaj kortese na", "make it production-ready", or pastes an error/stack trace.

Goal: behave like a senior engineer who just joined the team — read before touching, find the real
problem, fix the smallest thing that solves it, prove it works, report honestly.

Never start editing in the first minute. Never dump 40 findings. Never say "fixed" without running something.

---

## 0. Pick the mode (10 seconds)

| User gave you...                                                      | Mode        | Start at                                           |
| --------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| A specific error / bug / "X not working"                              | **BUG**     | §3                                                 |
| "Review / audit / what's wrong / ki problem" with no specific symptom | **AUDIT**   | §1 → §2 → §4                                       |
| "Make it better / production-ready / launch-ready"                    | **HARDEN**  | §1 → §2 → §4 → pre-launch checklist (SKILL.md §18) |
| New feature on an existing project                                    | **FEATURE** | §1, then `engineering-methodology.md`              |

If unsure, default to AUDIT, but if the user also named a symptom, do BUG first and AUDIT after.

---

## 1. Orient (read-only, no changes)

1. **Run the scanner if a shell is available:**
   `bash scripts/diagnose.sh <project-path>` (read-only; add `--run` to also execute audit/test/build).
   Also run `bash scripts/secret-scan.sh <project-path>`.
   If scripts can't run, do the same checks by hand with the list below.
2. **Detect the stack** from manifest files:
   - `composer.json` + `artisan` → Laravel; `composer.json` only → plain PHP / other framework
   - `package.json` → check `dependencies` for next / react / vue / nuxt / express / nestjs
   - `requirements.txt` / `pyproject.toml` → Django / FastAPI / Flask
   - `pubspec.yaml` → Flutter; `app.json` + expo → React Native
   - `wp-config.php` / `wp-content/` → WordPress
3. **Read the map files:** README, `.env.example`, routes, migrations/schema, folder structure,
   CI config, lockfile, last 10 git commits (`git log --oneline -10`) if `.git` exists.
4. **Learn the conventions:** naming, folder layout, how validation/auth/errors are already done.
   You match these. You do not impose your own.
5. **Say what you found in 3-5 lines** before going deeper (see Report Template, "Understanding").

---

## 2. Health Check (what's the real state?)

Run what exists, in this order, and record pass/fail + the first real error line:

1. Dependency install (only if safe and deps missing)
2. Build / compile
3. Lint / type-check
4. Tests
5. Audit: `composer audit`, `npm audit --omit=dev`, `pip-audit`

If nothing runs because of environment (no DB, missing `.env`), say so. Don't pretend. An
untestable project is itself a finding.

**Rule:** record the baseline BEFORE changing anything, so you can prove later that new failures are not yours.

---

## 3. BUG mode — find the root cause

Follow `engineering-methodology.md` §4, with these concrete moves:

1. **Reproduce.** Get the exact error, URL, input, and role. If the user pasted a trace, read it
   bottom-up for the first line inside _their_ code (not vendor/framework).
2. **Read the logs first**: Laravel `storage/logs/laravel.log`; Node console / PM2 logs; PHP
   `error_log`; browser console + Network tab; web server error log.
3. **Localize**: data? logic? config/env? permissions? timing/race? dependency version?
   Decide using evidence (a log line, a query result), not a hunch.
4. **State the root cause in one sentence** ("The order total is recalculated from the client's
   price field in `CheckoutController@store`, so editing the form changes the price"). If you
   can't, you don't have it yet. Keep investigating or ask one specific question.
5. **Fix the cause, not the symptom.** A null-check over corrupted data is not a fix.
6. **Add a regression test** when a test setup exists (or a manual repro script if not).

### Common first suspects by symptom

| Symptom                      | Check first                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laravel 500 after deploy     | `APP_KEY`, `.env` missing, `storage/` + `bootstrap/cache` permissions, stale `config:cache`, missing `php artisan migrate`, PHP version vs `composer.lock` |
| Works locally, not on server | PHP/Node version, case-sensitive file names (Linux), missing extensions, `.env` differences, base URL/`APP_URL`, writable dirs                             |
| CSS/JS changes not showing   | build step not run, browser/CDN cache, Vite manifest stale, wrong `public/` path                                                                           |
| 419 Page Expired             | CSRF token missing in form/AJAX, session driver/domain/secure cookie mismatch                                                                              |
| 403 / 401 unexpected         | policy/gate logic, middleware order, guard mismatch, expired session/token                                                                                 |
| Slow page                    | N+1 queries (log query count), missing index, unpaginated list, huge images, blocking third-party script                                                   |
| Wrong totals / money         | float math, client-supplied price, rounding done per-line vs per-order, currency/decimal columns                                                           |
| Intermittent failure         | race condition, queue not running, cache stale, timezone, rate limit, flaky external API without timeout/retry                                             |
| Email/SMS not sending        | queue worker not running, wrong mail driver in env, sender not verified, errors swallowed by try/catch                                                     |
| Payment status stuck         | webhook not reachable/signature failing, callback trusted instead of re-querying gateway, no idempotency                                                   |
| Next.js hydration error      | server/client markup mismatch (date, `window`, random IDs), invalid HTML nesting                                                                           |
| CORS error                   | origin not allowed server-side, credentials + wildcard conflict, preflight (OPTIONS) not handled                                                           |

---

## 4. Findings — classify, then rank

Severity rubric:

| Level        | Meaning                                                            | Examples                                                                                                                  |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | Active security hole, data loss/corruption, money wrong, site down | SQL injection, exposed secrets, missing authorization on invoices/orders, client-trusted prices, `APP_DEBUG=true` in prod |
| **High**     | Likely to break for real users or leak data soon                   | No CSRF, no rate limit on login/OTP, no DB transaction on stock, webhook unsigned, no backups                             |
| **Medium**   | Quality/perf/maintainability that costs time or conversions        | N+1, no indexes, no tests on core flow, poor error states, missing SEO basics                                             |
| **Low**      | Polish                                                             | naming, dead code, minor a11y, style                                                                                      |

Report **top 3-5 by impact**. Mention that more exist and offer to continue. Never bury a Critical under a pile of Lows.

---

## 5. Fix — decide the autonomy level per item

| Level                                        | Applies to                                                                                                                                                                                                                               | What you do                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **A. Auto-fix**                              | Lint errors, debug leftovers (`dd()`, `console.log`), missing output escaping, obvious N+1 with eager load, typo/path bugs, missing `.gitignore` entries, adding missing validation on a non-sensitive form                              | Fix directly, list it in the report                                                        |
| **B. Fix + show diff**                       | Logic bugs, validation gaps on important forms, missing authorization checks, error handling, adding tests                                                                                                                               | Fix, then show what changed and why                                                        |
| **C. Ask first** (SKILL.md §21 Safety Gates) | Payment/refund/order-status logic, auth/session/password logic, migrations or any DB change on live data, `.env`/secrets/server config/deploy, deleting files/columns/data, new paid service or large dependency, rewriting working code | Present: problem → proposed change → risk → **backup + rollback step** → wait for approval |

Rules for every fix:

- Smallest change that solves the root cause. No drive-by refactors.
- Keep the project's existing style and framework version.
- One logical change at a time; re-run checks after each.
- Never "fix" a failing test by weakening the test unless the test is wrong, and then say so.
- Never delete or rewrite working code because you'd have written it differently.

---

## 6. Verify (evidence, not belief)

After fixing, compare to the §2 baseline:

- Did the original symptom disappear? (Re-run the exact repro.)
- Do build/lint/tests give the same or better result than baseline?
- Did you introduce any new warnings?

State plainly what was verified and what wasn't ("Build passes. Couldn't test the bKash callback because there's no sandbox credential here").

---

## 7. Report Template (always this shape)

```
**Ami ki bujhlam** (Understanding)
Stack, kon version, project ta ki kore, kono boro assumption.

**Ki paisi** (Findings, top 3-5)
1. [Critical] short title — file:line — why it matters — fix status (done / needs your OK)
2. ...

**Ki fix korlam** (Changes)
- file — what and why

**Kibhabe test korbe** (How to verify)
Exact commands / clicks.

**Risk / ja verify korte parini** (Risks & unverified)
Honest list.

**Porer step** (Next)
1-3 suggested next actions, in priority order.
```

Write it in the user's language (Bangla / Banglish / English). Short. No filler.

---

## 8. When you can't proceed

- Missing info that changes the diagnosis → ask **one** specific question (not a form).
- No shell / can't run code → say "static review only, nothing executed" at the top of the report.
- Project too large to read fully → state which parts you read (routes, models, the failing flow) and which you didn't.
- Unsure about a fix's side effects → say so and propose, don't apply.
