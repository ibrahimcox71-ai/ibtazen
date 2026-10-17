---
description: Run the full verify gate (lint, typecheck, test, build, prettier) and fix failures
---

Run this repo's verify gate from the workspace root, in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npx prettier --check .`

Rules:

- If a step fails, fix the root cause (don't suppress), run `npx prettier --write <touched files>`, then re-run the failed step and any step after it that your change could affect.
- Report the outcome per step in one compact list (pass/fail + test counts for step 3). No step is "done" until all five pass.
- Never edit files outside the workspace root; never commit anything.
