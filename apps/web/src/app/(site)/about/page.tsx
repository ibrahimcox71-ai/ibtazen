import type { Metadata } from "next";
import { Mail } from "lucide-react";
import {
  Breadcrumbs,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CTASection,
  JsonLd,
  PageHero,
  ProcessSteps,
  Section,
  SectionHeader,
} from "@ibtatech/ui";
import {
  ENGAGEMENT_PROCESS,
  OG_IMAGE,
  POSITIONING_FACTS,
  PRIMARY_CTA,
  SITE,
  breadcrumbSchema,
  organizationSchema,
  webPageSchema,
} from "@ibtatech/config";

export const metadata: Metadata = {
  title: "About Ibtatech — Senior Team, Transparent Delivery",
  description:
    "Ibtatech is an international digital technology and growth agency. Senior engineers, demo-driven delivery, and honest reporting for clients in the UK, Europe and worldwide.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Ibtatech — Senior Team, Transparent Delivery",
    description:
      "An international digital technology and growth agency built on senior engineering and transparency.",
    url: "/about",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
];

const PRINCIPLES = [
  {
    title: "Outcomes over output",
    description:
      "We scope from the business metric — revenue, retention, cost saved — then engineer backwards from it. Features are a means, not a deliverable.",
  },
  {
    title: "Small senior teams",
    description:
      "A focused team of seniors outperforms a bench of juniors on every measure that matters: speed, judgement and cost of ownership.",
  },
  {
    title: "Working software early",
    description:
      "Vertical slices you can click within weeks — not a big reveal at the end. Change direction cheaply, based on the real thing.",
  },
  {
    title: "Radical transparency",
    description:
      "Shared boards, weekly demos, honest timelines and written scopes. If something is off track, you hear it from us first.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webPageSchema("/about", "About Ibtatech", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="About"
        title="An engineering partner, not a vendor"
        description="Ibtatech exists because businesses were tired of agencies that ship decks instead of systems. We build the digital machinery a company runs on — and stand behind it."
      />

      <Section ariaLabel="Who we are">
        <div className="gap-10 lg:grid-cols-2 grid">
          <div className="gap-4 flex flex-col">
            <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
              Who we are
            </p>
            <h2 className="font-display text-title">
              Built by engineers who got tired of watching agencies fail their clients
            </h2>
            <p className="text-text-secondary">
              Ibtatech is an international digital technology and growth agency. We work with
              clients across the United Kingdom, Europe and beyond — remotely by design, with weekly
              demos and communication in your timezone.
            </p>
            <p className="text-text-secondary">
              The model is deliberately narrow: four disciplines, done at a senior level. Web
              platforms, mobile applications, lifecycle email and paid acquisition — because those
              are the systems that decide whether a modern business grows.
            </p>
          </div>
          <div className="gap-4 sm:grid-cols-2 grid">
            {POSITIONING_FACTS.map((fact) => (
              <Card key={fact.title} className="p-5">
                <h3 className="text-sm font-semibold text-text">{fact.title}</h3>
                <p className="mt-1.5 text-sm text-text-secondary">{fact.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="sunken" ariaLabel="Principles">
        <SectionHeader
          eyebrow="Principles"
          title="How we make decisions"
          description="Four rules that shape every engagement — and every line of code."
        />
        <div className="mt-10 gap-5 sm:grid-cols-2 grid">
          {PRINCIPLES.map((principle) => (
            <Card key={principle.title} className="h-full">
              <CardHeader>
                <CardTitle className="text-base">{principle.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-text-secondary">{principle.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section ariaLabel="Engagement process">
        <SectionHeader
          eyebrow="Process"
          title="What working together looks like"
          description="The same transparent model across every service."
        />
        <div className="mt-10">
          <ProcessSteps steps={ENGAGEMENT_PROCESS.map((step) => ({ ...step }))} />
        </div>
      </Section>

      <Section tone="sunken" ariaLabel="Contact">
        <div className="gap-5 flex flex-col items-center text-center">
          <h2 className="font-display text-title">Prefer email first?</h2>
          <p className="max-w-xl text-text-secondary">
            Skip the form — write to us directly and a senior engineer will reply within one
            business day.
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="min-h-11 gap-2 px-4 py-2.5 text-sm font-medium inline-flex items-center rounded-md text-accent transition-colors hover:bg-accent-soft"
          >
            <Mail aria-hidden className="size-4" />
            {SITE.email}
          </a>
        </div>
      </Section>

      <CTASection
        title="Let's map your shortest route"
        description="Thirty minutes, free, and you leave with a written plan either way."
        primaryLabel={PRIMARY_CTA.label}
        primaryHref={PRIMARY_CTA.href}
        secondaryLabel="Start a Project"
        secondaryHref="/contact"
      />
    </>
  );
}
