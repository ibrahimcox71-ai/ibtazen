import type { Metadata } from "next";
import { SITE } from "@ibtatech/config";
import { JsonLd } from "@ibtatech/ui";
import { webPageSchema } from "@ibtatech/config";
import { LegalPage, LegalPlaceholder, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern use of the Ibtatech website and the framework for our service engagements.",
  alternates: { canonical: "/terms" },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/terms", "Terms & Conditions", metadata.description)} />
      <LegalPage
        title="Website Terms & Conditions"
        updated="[DATE TO BE SET ON PUBLICATION]"
        intro={`These terms govern use of ${SITE.domain}. Service engagements are governed by a separate written agreement, which these website terms do not override.`}
        crumbs={CRUMBS}
      >
        <LegalSection heading="1. About us">
          <p>
            <LegalPlaceholder>
              registered legal entity name, company number, jurisdiction
            </LegalPlaceholder>
            , registered office at <LegalPlaceholder>registered address</LegalPlaceholder>.
          </p>
        </LegalSection>

        <LegalSection heading="2. Use of this website">
          <p>
            The content of this site is provided for information. You may not misuse the site
            (including attempting unauthorised access or introducing malicious code). Estimates and
            indicative pricing shown on this site are preliminary and not offers.
          </p>
        </LegalSection>

        <LegalSection heading="3. No professional advice">
          <p>
            Site content does not constitute legal, financial or tax advice. Specific engagements
            are advised in writing.
          </p>
        </LegalSection>

        <LegalSection heading="4. Intellectual property">
          <p>
            Site content is © <LegalPlaceholder>year and owner</LegalPlaceholder>. Project IP
            ownership is defined per engagement agreement — by default, clients own the code we
            build for them.
          </p>
        </LegalSection>

        <LegalSection heading="5. Liability">
          <p>
            <LegalPlaceholder>
              liability wording to be settled by counsel, including any exclusions permitted under
              applicable law (e.g. UCTA 1977)
            </LegalPlaceholder>
          </p>
        </LegalSection>

        <LegalSection heading="6. Governing law">
          <p>
            <LegalPlaceholder>
              governing law and jurisdiction, e.g. England and Wales
            </LegalPlaceholder>
          </p>
        </LegalSection>
      </LegalPage>
    </>
  );
}
