# Performance Budgets

Read this when performance needs concrete numbers, not just principles — quoting a client/team a
real budget, deciding if a bundle size is acceptable, or building for a market with slower
average connections (this pairs with `bd-market.md` for South Asia specifics).

## 1. Why "It Feels Fast on My Laptop" Isn't the Bar

Development machines are on fast wifi/fiber with a fast CPU — this hides real-world performance
problems. Always budget and test against the conditions your _actual_ users have, which for most
consumer/emerging-market audiences is a mid-range Android phone on 3G/4G, not a MacBook on fiber.

## 2. Core Web Vitals Targets (Google's "good" thresholds — the floor, not the goal)

| Metric                          | Good    | Needs improvement | Poor    |
| ------------------------------- | ------- | ----------------- | ------- |
| LCP (Largest Contentful Paint)  | ≤ 2.5s  | ≤ 4.0s            | > 4.0s  |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms           | > 500ms |
| CLS (Cumulative Layout Shift)   | ≤ 0.1   | ≤ 0.25            | > 0.25  |

Treat "Good" as the minimum acceptable bar for any public-facing page, not an aspirational goal —
ranking and conversion both degrade measurably once you slip into "Needs improvement."

## 3. Network Tier Reference (for budgeting, test with real throttling)

| Tier                         | Approx. download | Approx. RTT latency | Where this is common                                              |
| ---------------------------- | ---------------- | ------------------- | ----------------------------------------------------------------- |
| Fast 4G / good wifi          | ~9 Mbps          | ~50-100ms           | Urban, developed-market default dev assumption                    |
| Typical 4G (emerging market) | ~1.5-4 Mbps      | ~150-300ms          | Much of South/Southeast Asia, incl. Bangladesh outside major hubs |
| Slow 3G                      | ~400-700 Kbps    | ~400ms+             | Rural/low-signal areas, older devices falling back                |
| Offline/flaky                | intermittent     | —                   | Design for this to happen, not just slow-but-connected            |

Test with Chrome DevTools' "Slow 4G" and "Fast 3G" presets _and_ a genuinely low-end Android
device — emulated CPU throttling (4-6x slowdown) matters as much as network throttling, since
JS-heavy pages are often CPU-bound on cheap devices, not just bandwidth-bound.

## 4. Payload Budgets (per page, initial load, gzipped/brotli)

| Asset type                       | Budget (typical page)                      | Budget (content-heavy/media page) |
| -------------------------------- | ------------------------------------------ | --------------------------------- |
| HTML                             | < 30 KB                                    | < 50 KB                           |
| CSS (critical, inlined)          | < 15 KB                                    | < 20 KB                           |
| JS (initial, before interaction) | < 150 KB                                   | < 250 KB                          |
| Largest hero image               | < 100 KB (WebP/AVIF)                       | < 200 KB                          |
| Total page weight (first load)   | < 500 KB                                   | < 1.2 MB                          |
| Web fonts                        | 1-2 families, subset, `font-display: swap` | same                              |

If a page blows these budgets, the fix order is usually: (1) code-split/lazy-load non-critical
JS, (2) compress/right-size images, (3) remove unused CSS/JS, (4) reconsider a heavy
library/widget before optimizing it further.

## 5. Time-to-Interactive Targets by Network Tier

| Network tier                 | Target Time-to-Interactive                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Fast 4G / wifi               | < 3s                                                                                      |
| Typical 4G (emerging market) | < 5s                                                                                      |
| Slow 3G                      | < 8s (and the page must still be _usable_, even if not fully loaded, within ~3s — see §6) |

## 6. Design for Progressive Usability, Not Just Raw Speed

- Render critical content (headline, primary CTA, core text) first; defer non-critical widgets
  (chat bubbles, related-content rails, tracking scripts) to load after.
- Use skeleton screens or a fast, real first paint over a blank white screen with a spinner —
  perceived speed matters as much as raw milliseconds.
- Make the core action work even if a secondary script fails to load (progressive enhancement) —
  a single blocked third-party script should never break checkout.
- For image-heavy pages (product catalogs, portfolios), lazy-load everything below the fold and
  serve responsive `srcset` images sized for the actual rendered dimension, not the original upload.

## 7. Measuring

- Lab data: Lighthouse (CLI or PageSpeed Insights) with explicit network/CPU throttling matching
  the target tier above, not the default fast setting.
- Field data: Chrome UX Report (CrUX) / real-user-monitoring (RUM) for what actual visitors
  experience — lab scores can look good while real users on poor connections still struggle.
- Re-check after every significant feature addition; performance budgets erode gradually
  ("budget creep") unless enforced in CI (e.g., a bundle-size check that fails the build).
