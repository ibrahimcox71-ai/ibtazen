---
description: Pick the next open item from check.md and start working it
---

Read `check.md` and pick the next item to work on:

1. Choose the highest-priority item whose status is not `done` (P0 before P1 before P2; ties go to the earlier row in the summary table).
2. Announce your choice in one line (item number + title + why it's next).
3. Read that item's কাজ / ফাইল / শেষ হবে যখন, and search the existing code before writing anything — match the repo's patterns and reuse what's already there.
4. If the item's "শেষ হবে যখন" says to ask the user first (missing spec/product decision), ask instead of guessing.
5. Implement, then verify with `/verify`.
6. Update `check.md` (status, date YYYY-MM-DD, what landed, test counts, verify line) and run `npx prettier --write check.md`.
7. Do not commit or push — wait for the user to explicitly ask.

$ARGUMENTS
