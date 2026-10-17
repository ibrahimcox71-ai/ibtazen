# Bangladesh / South Asia Market

Read this when building for a Bangladeshi (or broadly South Asian) audience — local payments,
hosting/latency, Bangla-language SEO and typography, and market-specific UX norms that a generic
Western playbook misses.

## 1. Local Payment Integration

- **Mobile Financial Services (MFS) are primary, not secondary**, for most consumer transactions:
  bKash, Nagad, and Rocket collectively cover the large majority of everyday digital payments —
  treat them as first-class checkout options, not an "also accepts" footnote below card payment.
- **Aggregators simplify multi-gateway integration**: SSLCommerz, ShurjoPay, and Aamarpay are
  common local payment gateway aggregators that bundle bKash/Nagad/Rocket plus card networks
  (Visa/Mastercard) and bank transfers behind one integration — usually faster to ship than
  integrating each MFS provider's own API directly, unless volume justifies direct integration.
- **Design for the real flow**: MFS payments often redirect to an app or a PIN-entry flow (not
  always a simple in-page widget) — build the checkout state machine to handle redirect-based
  confirmation and payment-pending states gracefully, with clear on-screen guidance during the
  handoff, not just a spinner.
- **Show total cost in BDT clearly**, including any delivery/COD fee; Cash on Delivery (COD)
  remains a widely expected e-commerce option — support it explicitly rather than assuming
  digital-only payment, especially for e-commerce outside major cities.
- Verify actual current transaction limits, fee structures, and settlement times directly with
  the chosen gateway/aggregator before committing to a flow design — these terms change and
  shouldn't be assumed from memory.

## 2. Hosting, CDN & Latency

- Bangladesh's international bandwidth runs through submarine cable and terrestrial links to
  regional hubs; a server in the US/EU adds meaningfully more round-trip latency than one in a
  closer region — prefer an origin/CDN presence in South/Southeast Asia (e.g., Mumbai, Singapore)
  over US/EU-only hosting when the audience is primarily Bangladeshi.
- **BDIX (Bangladesh Internet Exchange) peering** dramatically improves speed for BD-hosted or
  BDIX-peered content versus purely international routes — for latency-sensitive or bandwidth-heavy
  local products (streaming, large local user bases), evaluate BD-based hosting or a CDN with BDIX
  peering, not just a generic global CDN.
- Use a CDN with real points of presence relevant to the region (not just claimed "global"
  coverage) for static assets regardless of origin location — this is the single highest-leverage
  fix for perceived speed for a BD-heavy audience.
- Given the network-tier reality in `performance-budgets.md` (a meaningful share of users on
  3G/4G, not fiber), treat the aggressive payload budgets there as non-negotiable here, not
  aspirational.

## 3. Bangla-Language SEO & Content

- Bangla search behavior differs from English: many users mix Bangla and Banglish (Bangla typed
  in Latin script) queries — where relevant, cover both script forms in on-page content, meta
  descriptions, and target keywords rather than assuming one covers the other.
- Use proper Bangla Unicode (not image-based Bangla text or a non-standard legacy font/encoding
  like some older Bijoy-based content) — search engines and screen readers can't index or read
  non-Unicode Bangla text.
- Structured data (JSON-LD) and meta tags should be filled in Bangla for Bangla-content pages
  (don't leave `og:description`/`meta description` in English on a Bangla page) — this affects
  how the page is represented in local search and social shares.
- hreflang tags matter if serving both a Bangla and an English version of the same content, so
  search engines serve the right language variant to the right audience.

## 4. Bangla Typography & UI

- Choose a font stack with genuinely good Bangla glyph support and a sane fallback chain (e.g., a
  Bangla-supporting Google Font such as Noto Sans Bengali / Hind Siliguri as primary, with system
  fallbacks) — many popular Latin-first web fonts render Bangla poorly or not at all.
- Bangla script generally needs a taller line-height than the Latin-typography defaults in most
  CSS resets (conjuncts and matras need more vertical room) — don't reuse an English site's
  `line-height` token unchanged for Bangla body text.
- Mixed Bangla/English UI (common in BD products) needs deliberate font-pairing so both scripts
  look intentional side by side, not mismatched in weight/x-height.
- Right-align/left-align and number formatting stay LTR for Bangla (unlike RTL languages) but
  double-check date and currency formatting conventions (৳ symbol, Bangla numerals are optional —
  confirm which the target audience actually expects, since Western Arabic numerals are also
  widely used in Bangla digital products).

## 5. Market & UX Norms Worth Designing For

- Mobile-first is not optional — a large majority of BD internet access is mobile, often on
  data-plan-conscious connections, which reinforces the performance-budget discipline above as a
  product requirement, not just a technical nicety.
- Trust signals matter more for a newer/unknown brand: visible contact info (phone number, not
  just email), clear return/refund policy, and social proof carry extra weight given lower
  baseline trust in unfamiliar online sellers.
- WhatsApp/Messenger-based customer support and even order-taking is common and often expected
  alongside (or instead of) a full self-serve checkout — consider it as a real, primary channel
  in the UX, not an afterthought link in the footer.
