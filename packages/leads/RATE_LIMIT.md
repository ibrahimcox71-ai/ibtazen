# Rate limiting

The in-memory limiter (`src/rate-limit.ts`) is per-process. Next.js may run
multiple server instances or workers; behind a multi-instance deployment swap
in a shared store (e.g. Redis/Upstash) at the same boundary — callers only use
`checkRateLimit()` and need no other changes.

Current policy: 5 submissions per IP per 10 minutes, sliding window.
