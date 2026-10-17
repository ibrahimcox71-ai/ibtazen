import type { Metadata } from "next";
import { SITE } from "@ibtatech/config";
import { JsonLd } from "@ibtatech/ui";
import { webPageSchema } from "@ibtatech/config";
import { LegalPage, LegalPlaceholder, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Ibtatech collects, uses and protects personal data across our website and services, including UK GDPR and EU GDPR rights.",
  alternates: { canonical: "/privacy" },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/privacy", "Privacy Policy", metadata.description)} />
      <LegalPage
        title="Privacy Policy"
        updated="[DATE TO BE SET ON PUBLICATION]"
        intro={`This policy explains how ${SITE.legalName} ("Ibtatech", "we", "us") collects and uses personal data when you use ibtatech.com or engage our services. It is written to support compliance with the UK GDPR and the EU GDPR.`}
        crumbs={CRUMBS}
      >
        <LegalSection heading="1. Who we are">
          <p>
            The data controller is{" "}
            <LegalPlaceholder>registered legal entity name and company number</LegalPlaceholder>,
            with its registered office at <LegalPlaceholder>registered address</LegalPlaceholder>.
          </p>
          <p>
            Data protection contact:{" "}
            <LegalPlaceholder>DPO / privacy contact email</LegalPlaceholder>.
          </p>
        </LegalSection>

        <LegalSection heading="2. Data we collect">
          <ul className="space-y-1.5 pl-5 list-disc">
            <li>
              <strong>Enquiry data</strong> — name, work email, company, service interest, budget
              range, timeline and project description submitted through our contact, audit or
              estimator forms.
            </li>
            <li>
              <strong>Communication data</strong> — messages exchanged by email, calls and project
              tools.
            </li>
            <li>
              <strong>Usage data</strong> — pages visited and interactions, collected only with
              consent where required (see our Cookie Policy).
            </li>
            <li>
              <strong>Contract data</strong> — billing and project information when we work
              together.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="3. Why we use it (lawful bases)">
          <ul className="space-y-1.5 pl-5 list-disc">
            <li>
              To respond to enquiries and prepare proposals — legitimate interests / steps prior to
              a contract.
            </li>
            <li>To deliver contracted services — contract performance.</li>
            <li>To send marketing communications — consent, withdrawable at any time.</li>
            <li>To secure and improve our website — legitimate interests.</li>
          </ul>
        </LegalSection>

        <LegalSection heading="4. Sharing and processors">
          <p>
            We share data only with processors necessary to operate:{" "}
            <LegalPlaceholder>
              list processors, e.g. hosting, email, CRM, analytics providers
            </LegalPlaceholder>
            . We never sell personal data.
          </p>
        </LegalSection>

        <LegalSection heading="5. Retention">
          <p>
            Enquiry data is kept for{" "}
            <LegalPlaceholder>retention period, e.g. 24 months</LegalPlaceholder>; contract records
            for <LegalPlaceholder>statutory period</LegalPlaceholder> where required by law.
          </p>
        </LegalSection>

        <LegalSection heading="6. Your rights">
          <p>
            You may request access, correction, deletion, restriction or portability of your data,
            and object to processing. You may also complain to the{" "}
            <LegalPlaceholder>relevant supervisory authority, e.g. the UK ICO</LegalPlaceholder>.
            Contact <LegalPlaceholder>privacy contact email</LegalPlaceholder> to exercise any
            right.
          </p>
        </LegalSection>

        <LegalSection heading="7. International transfers">
          <p>
            Where data is transferred outside the UK/EU, we rely on{" "}
            <LegalPlaceholder>transfer mechanism, e.g. UK IDTA / EU SCCs</LegalPlaceholder>.
          </p>
        </LegalSection>
      </LegalPage>
    </>
  );
}
