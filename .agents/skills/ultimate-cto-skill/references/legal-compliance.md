# Legal & Compliance

Read this whenever a product collects personal data, targets EU/California/other regulated
users, or is being prepared for public launch. This is general engineering/product guidance, not
legal advice — flag to the user that a lawyer should review final legal documents for their
specific jurisdiction and business.

## 1. Privacy & Data Protection (GDPR / CCPA-style baseline)

- Collect only what's needed for the stated purpose (data minimization); don't add "nice to have"
  fields to a signup form without a reason.
- Get explicit, unbundled consent for anything non-essential (marketing emails, analytics
  cookies, third-party tracking) — consent for the service itself and consent for marketing must
  be separable, not one checkbox.
- Cookie/consent banner: block non-essential cookies until consent is given (not just a banner
  that appears while trackers already fire), offer "reject all" as easily as "accept all", and
  let users change their choice later (not just on first visit).
- Provide a real mechanism for data export and account/data deletion — a support-ticket-only
  process is not compliant in GDPR-covered regions.
- Have a documented data breach response plan if handling meaningful volumes of personal data.
- If using sub-processors (analytics, email, hosting), disclose them and ensure they're
  contractually bound to equivalent protection (DPAs).

## 2. Accessibility Legal Exposure

- WCAG 2.1 AA (see main skill §7) is the de facto legal standard referenced in ADA lawsuits (US)
  and the European Accessibility Act — treat the accessibility section as a legal requirement,
  not just a UX nicety, for any commercial site.
- Keep an accessibility statement page describing the target conformance level and a contact
  method for reporting issues — this is both good practice and a mitigating factor if challenged.
- Retest after every significant redesign — accessibility compliance is not a one-time checkbox.

## 3. Required Legal Pages Checklist

- [ ] **Privacy Policy** — what's collected, why, how long retained, who it's shared with, user rights, contact
- [ ] **Terms of Service** — usage rules, liability limitations, termination conditions, dispute resolution
- [ ] **Cookie Policy** (or section within Privacy Policy) with a working consent mechanism
- [ ] **Refund/Cancellation Policy** if selling anything
- [ ] **Accessibility Statement** for commercial sites
- [ ] Age-gate / parental consent flow if the product could reasonably be used by minors
- [ ] Region-specific disclosures as needed (e.g., California "Do Not Sell My Info" link, EU right-to-erasure flow)

## 4. Practical Defaults

- Never hardcode legal text into the app — keep it editable (CMS/markdown) since it changes
  independent of ship cycles and often needs legal sign-off separately from engineering.
- Log consent (what was agreed to, and when) — not just the current state — since proving
  historical compliance matters more than the current toggle value.
- When in doubt on a specific jurisdiction's requirement, say so explicitly to the user rather
  than presenting a guess as settled legal fact.
