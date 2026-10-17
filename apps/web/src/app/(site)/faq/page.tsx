import type { Metadata } from "next";
import {
  Breadcrumbs,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CTASection,
  FaqAccordion,
  JsonLd,
  PageHero,
  Section,
} from "@ibtatech/ui";
import {
  GLOBAL_FAQS,
  OG_IMAGE,
  PRIMARY_CTA,
  SITE,
  breadcrumbSchema,
  faqPageSchema,
  webPageSchema,
} from "@ibtatech/config";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ — Working with Ibtatech",
  description:
    "How Ibtatech works: pricing, timelines, ownership, guarantees and process. Direct answers about our web, mobile, email automation and paid advertising services.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — Working with Ibtatech",
    description: "Direct answers about pricing, timelines, code ownership and how engagements run.",
    url: "/faq",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "FAQ", href: "/faq" },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={webPageSchema("/faq", "Frequently asked questions", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />
      <JsonLd data={faqPageSchema(GLOBAL_FAQS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="How engagements work: pricing, timelines, ownership and what we do — and don't — promise."
      />

      <Section ariaLabel="All questions">
        <div className="gap-10 lg:grid-cols-[1.6fr_1fr] grid">
          <FaqAccordion items={GLOBAL_FAQS.map((faq) => ({ ...faq }))} />

          <Card tone="sunken" className="lg:sticky lg:top-24 h-fit">
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                Question not answered?
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-4 flex flex-col">
              <p className="text-sm text-text-secondary">
                Send it straight to a senior engineer — no sales layer, no obligation.
              </p>
              <a
                href={`mailto:${SITE.email}`}
                className="min-h-11 gap-2 px-3 py-2.5 text-sm font-medium inline-flex items-center rounded-md text-accent transition-colors hover:bg-accent-soft"
              >
                <Mail aria-hidden className="size-4" />
                {SITE.email}
              </a>
              <ButtonLink href={PRIMARY_CTA.href} variant="secondary">
                {PRIMARY_CTA.label}
              </ButtonLink>
            </CardContent>
          </Card>
        </div>
      </Section>

      <CTASection
        title="Still deciding?"
        description="A discovery call answers more in 30 minutes than a week of comparison shopping."
        primaryLabel={PRIMARY_CTA.label}
        primaryHref={PRIMARY_CTA.href}
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </>
  );
}
