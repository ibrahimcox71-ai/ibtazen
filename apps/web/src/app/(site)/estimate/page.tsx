import type { Metadata } from "next";
import { Breadcrumbs, JsonLd, PageHero, Section } from "@ibtatech/ui";
import { OG_IMAGE, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { Estimator } from "./estimator";

export const metadata: Metadata = {
  title: "Get a Project Estimate",
  description:
    "Answer six quick questions about your project and receive a tailored proposal from Ibtatech. Indicative scoping — not an automated quote.",
  alternates: { canonical: "/estimate" },
  openGraph: {
    title: "Get a Project Estimate | Ibtatech",
    description:
      "Six quick questions shape a tailored proposal. Honest scoping, no automated price calculator.",
    url: "/estimate",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Estimate", href: "/estimate" },
];

export default function EstimatePage() {
  return (
    <>
      <JsonLd data={webPageSchema("/estimate", "Project estimate", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="Project estimate"
        title="Scope your project in six steps"
        description="A structured way to tell us what you need. You'll get a tailored proposal from an engineer — not an automated number."
        align="left"
      />

      <Section ariaLabel="Estimator" tone="default">
        <div className="max-w-2xl mx-auto">
          <Estimator />
        </div>
      </Section>
    </>
  );
}
