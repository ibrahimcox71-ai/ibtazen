# Security Hardening

Read this for anything security-sensitive: auth/payments/PII-handling features, a pre-launch
security pass, an AI feature that takes user input, or when the user explicitly worries about
being hacked. This goes deeper than the baseline in the main skill's Security section.

## 1. Threat Model Every Feature Before Building It

For any feature that touches user data, money, or permissions, ask before writing code:

- Who could misuse this, and how (not just the intended user, the adversarial one)?
- What's the worst realistic outcome if this endpoint/field/flow is abused?
- What happens if this input is empty, huge, malformed, or actively malicious?
- Does this action need re-authorization (not just authentication) — is the _current_ user
  actually allowed to do _this specific_ thing to _this specific_ resource (object-level
  authorization — the single most common real-world API vulnerability)?

## 2. Practical OWASP-Mapped Checklist

- **Broken access control** — check ownership/permission server-side on every read/write, not
  just on the route that creates a resource. Never trust an ID from the client to imply
  authorization (`/api/invoices/123` must verify the requester owns invoice 123).
- **Injection (SQL/NoSQL/command)** — parameterized queries/ORMs only; never build queries or
  shell commands from string concatenation of user input.
- **Cryptographic failures** — TLS everywhere, no custom crypto, argon2/bcrypt for passwords, no
  sensitive data (full card numbers, plaintext passwords) stored when a token/hash would do.
- **Insecure design** — rate-limit and re-verify anything sensitive (password reset, payment,
  account deletion, invite acceptance) rather than assuming a single check is enough.
- **Security misconfiguration** — no default/sample credentials in production, no verbose stack
  traces shown to users, no directory listing, admin panels not publicly discoverable.
- **Vulnerable/outdated components** — run `npm audit` / `composer audit` / equivalent in CI, not
  just once at project start; have a policy for how fast criticals get patched.
- **Identification/auth failures** — enforce reasonable password rules, support MFA where
  feasible, invalidate sessions on password change, lock/slow-down after repeated failed logins.
- **Software/data integrity failures** — verify webhook signatures, don't deserialize untrusted
  data with unsafe methods, pin dependency versions/lockfiles.
- **Logging/monitoring failures** — log auth events, permission denials, and admin actions (who
  did what, when) without logging secrets or full PII; alert on anomalies, not just errors.
- **Server-side request forgery (SSRF)** — if the app fetches a URL supplied by a user (webhooks,
  "import from URL," link previews), validate/allowlist destinations and block internal/private
  IP ranges.

## 3. Secrets & Dependency Management

- Secrets live in environment variables or a secret manager — never in source control, never in
  client-side bundles, never logged.
- Rotate credentials on any suspected exposure immediately, not "when convenient."
- Pin and regularly update dependencies; review changelogs for security-relevant fixes, not just
  blindly bumping.
- Principle of least privilege for every API key/service account — a key that only needs read
  access should not have write/delete scope.

## 4. Prompt-Injection & AI-Feature Defense

When a feature lets user input (or fetched web/document content) reach an LLM that can also take
actions (tools, DB writes, sending messages):

- Treat all model output as untrusted — never let it directly become SQL, shell commands, or an
  authorization decision without independent validation.
- Treat content the model _reads_ (a fetched webpage, an uploaded document, a user message) as
  data, not instructions — the system prompt should say so explicitly, and destructive/costly
  actions should require confirmation regardless of what any fetched content "asks" the AI to do.
- Scope what tools/data an AI agent can reach to the minimum needed for its task (least
  privilege applies to AI agents exactly like it applies to service accounts).
- Rate-limit and cost-cap agentic loops server-side so a manipulated or buggy loop can't run
  unbounded paid actions.
- If the AI feature can send messages, make purchases, or modify data on the user's behalf, log
  its actions distinguishably from direct user actions for auditability.

## 5. Pre-Launch Security Review

- [ ] Every endpoint checked for both authentication _and_ object-level authorization
- [ ] All inputs validated server-side (never rely on client-side validation alone)
- [ ] Security headers set (CSP, HSTS, X-Content-Type-Options, frame-ancestors)
- [ ] Rate limiting on auth, password reset, and any expensive/abusable endpoint
- [ ] Dependency audit run and criticals resolved
- [ ] No secrets in the client bundle, repo history, or logs
- [ ] File uploads validated (type/size) and, if user-facing, re-encoded/served from a
      non-executable path or separate domain
- [ ] Error responses don't leak stack traces, internal paths, or DB structure to end users
- [ ] Backups exist and a restore has actually been tested, not just configured
- [ ] For anything genuinely high-stakes (payments, healthcare, large user base): a real
      third-party penetration test or security review before public launch — this checklist
      reduces obvious risk but is not a substitute for expert review at that scale

## 6. If Something Goes Wrong (Incident Response Basics)

- Have a written, even if brief, plan before you need it: who gets notified, how access gets
  revoked/rotated fast, how affected users get told, and by when (regulatory deadlines can be as
  short as 72 hours under GDPR for a personal-data breach).
- Preserve logs/evidence before "cleaning up" — you need them to understand scope and root cause.
- Fix the root cause, not just the symptom, and add a regression test/monitor so the same class
  of issue can't silently recur.
