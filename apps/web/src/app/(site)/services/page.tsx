import type { Metadata } from "next";
import { CTASection, JsonLd, PageHero, Section, SectionHeader } from "@ibtatech/ui";
import { OG_IMAGE, PRIMARY_CTA, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { ServiceCards } from "@/components/service-cards";

export const metadata: Metadata = {
  title: "Services — Web, Mobile, Email & Paid Growth",
  description:
    "Ibtatech delivers four connected disciplines: web development, Android & iOS apps, email automation and paid advertising. One accountable team, measurable outcomes.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services — Web, Mobile, Email & Paid Growth | Ibtatech",
    description:
      "Web development, mobile apps, email automation and paid advertising under one accountable team.",
    url: "/services",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
];

const PAGE_DESCRIPTION =
  "Ibtatech delivers four connected disciplines: web development, Android & iOS apps, email automation and paid advertising. One accountable team, measurable outcomes.";

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/services", "Services", PAGE_DESCRIPTION)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <PageHero
        eyebrow="Services"
        title="Four disciplines. One accountable team."
        description="Most businesses need more than one agency. We cover the full digital value chain — build, ship, nurture, acquire — with one team that owns the outcome."
        primaryCta={PRIMARY_CTA}
        secondaryCta={{ label: "Get a Project Estimate", href: "/contact" }}
      />

      <Section ariaLabel="Service pillars">
        <SectionHeader
          eyebrow="What we do"
          title="Pick the discipline — or combine them"
          description="Each pillar stands alone. Together they compound: systems that convert, journeys that retain, campaigns that acquire profitably."
        />
        <ServiceCards copy="subheadline" />
      </Section>

      <CTASection
        title="Not sure which discipline you need?"
        description="Describe the problem — we'll tell you honestly whether it's an engineering problem, a growth problem, or both."
        primaryLabel={PRIMARY_CTA.label}
        primaryHref={PRIMARY_CTA.href}
        secondaryLabel="Talk to an Expert"
        secondaryHref="/contact"
      />
    </>
  );
}
