import type { Metadata } from "next";
import { SITE } from "@ibtatech/config";
import { JsonLd } from "@ibtatech/ui";
import { webPageSchema } from "@ibtatech/config";
import { LegalPage, LegalPlaceholder, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Which cookies and local storage ibtatech.com uses, why, and how to control them.",
  alternates: { canonical: "/cookies" },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Cookie Policy", href: "/cookies" },
];

export default function CookiesPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/cookies", "Cookie Policy", metadata.description)} />
      <LegalPage
        title="Cookie Policy"
        updated="29 September 2026"
        intro={`This policy lists the cookies and browser storage ${SITE.domain} uses. We practise cookie minimalism: only what the site genuinely needs, plus one cookieless analytics provider (section 2) that stores nothing on your device.`}
        crumbs={CRUMBS}
      >
        <LegalSection heading="1. Strictly necessary storage">
          <ul className="space-y-1.5 pl-5 list-disc">
            <li>
              <code className="rounded px-1 py-0.5 text-xs bg-surface-sunken font-mono">
                ibtatech-theme
              </code>{" "}
              (localStorage) — remembers your light/dark/system theme choice. Contains no personal
              data.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="2. Analytics">
          <p>
            Analytics on this site is <strong>Plausible Analytics</strong>, loaded from plausible.io
            and registered for the {SITE.domain} site. Plausible is cookieless: it sets no cookies,
            stores no persistent identifier on your device and does not follow you across other
            sites, so it needs no consent banner and no opt-in.
          </p>
          <p>
            It counts page views and a small set of aggregate product events — a form started,
            completed or failed, and a button click. Form contents, email addresses and any other
            detail you type are never sent to it, and the numbers are used only to understand which
            pages work.
          </p>
          <p>
            Because nothing is written to your device, there is nothing here to clear. Blocking the
            script (any content blocker, or your browser&apos;s developer tools) stops it entirely
            without affecting the rest of the site.
          </p>
        </LegalSection>

        <LegalSection heading="3. Marketing cookies">
          <p>
            Advertising platforms may set cookies only with your consent, described here once paid
            measurement goes live: <LegalPlaceholder>pixel/tag inventory</LegalPlaceholder>.
          </p>
        </LegalSection>

        <LegalSection heading="4. Managing cookies">
          <p>
            You can clear or block storage in your browser settings. Blocking strictly necessary
            storage may affect site preferences (such as your saved theme).
          </p>
        </LegalSection>
      </LegalPage>
    </>
  );
}
