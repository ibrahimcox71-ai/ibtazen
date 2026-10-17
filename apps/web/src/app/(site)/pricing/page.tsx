import type { Metadata } from "next";
import {
  Alert,
  Breadcrumbs,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CTASection,
  FaqAccordion,
  FeatureGrid,
  JsonLd,
  PageHero,
  Section,
  SectionHeader,
} from "@ibtatech/ui";
import {
  GLOBAL_FAQS,
  OG_IMAGE,
  PRIMARY_CTA,
  breadcrumbSchema,
  faqPageSchema,
  getService,
  webPageSchema,
} from "@ibtatech/config";

export const metadata: Metadata = {
  title: "Pricing — Transparent Scoping, Custom Quotes",
  description:
    "How Ibtatech prices work: fixed-scope project quotes, retainers and growth programmes. Indicative guidance up front, confirmed numbers only in a written proposal.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — Transparent Scoping, Custom Quotes | Ibtatech",
    description:
      "Engagement models and what's included. Indicative guidance, confirmed in a written proposal.",
    url: "/pricing",
    images: [OG_IMAGE],
  },
};

const CRUMBS = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
];

const ENGAGEMENT_MODELS = [
  {
    title: "Fixed-scope projects",
    price: "Custom quote",
    description: "Websites, mobile apps, web applications and platform builds.",
    points: [
      "Written scope, timeline and fixed price before kickoff",
      "Milestone-based invoicing",
      "Change requests priced transparently as variations",
    ],
  },
  {
    title: "Retained product team",
    price: "Monthly retainer",
    description: "Ongoing engineering for products that keep evolving.",
    points: [
      "A consistent senior team that knows your codebase",
      "Prioritised roadmap, reviewed monthly",
      "Pause or scale with 30 days' notice",
    ],
  },
  {
    title: "Growth programmes",
    price: "Management fee + spend",
    description: "Email automation and paid advertising, run continuously.",
    points: [
      "Flat management fee agreed up front",
      "Ad media spend paid directly to platforms by you",
      "Reporting against revenue and CPA targets",
    ],
  },
];

const INCLUDED = [
  {
    title: "Always included",
    items: [
      "Written scope and fixed proposal",
      "Weekly demos of working software",
      "Senior engineers on the build",
      "Full code and account ownership",
      "Documentation and handover",
      "Post-launch support window",
    ],
  },
];

const INDICATIVE_SHAPES = [
  {
    service: "Business website",
    shape: "Fixed-scope project",
    guidance: "Most focused website builds complete within 3–6 weeks.",
  },
  {
    service: "Web application / SaaS",
    shape: "Project, then retainer",
    guidance: "First usable version typically live within 6–10 weeks, then iterative releases.",
  },
  {
    service: "Mobile app",
    shape: "Fixed-scope v1, then roadmap",
    guidance: "Scoped per platform and feature set; installable test builds from early on.",
  },
  {
    service: "Email automation",
    shape: "Build + monthly programme",
    guidance: "Flow build as a project; ongoing optimisation as a monthly programme.",
  },
  {
    service: "Paid advertising",
    shape: "Monthly programme",
    guidance: "Meaningful programmes typically start from around £2,000/month in media spend.",
  },
];

const PRICING_FAQS = [
  GLOBAL_FAQS[3],
  getService("paid-advertising").faqs[0],
  getService("web-development").faqs[0],
  GLOBAL_FAQS[7],
].filter((faq) => Boolean(faq));

export default function PricingPage() {
  const faqs = PRICING_FAQS.filter((faq): faq is NonNullable<typeof faq> => Boolean(faq));

  return (
    <>
      <JsonLd data={webPageSchema("/pricing", "Pricing", metadata.description)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />
      <JsonLd data={faqPageSchema(faqs)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Alert tone="info" role="status" title="Indicative information" className="mt-4">
          Everything on this page explains how we price. Confirmed pricing exists only in a written
          proposal after scoping — we never invent numbers to win a click.
        </Alert>
        <Breadcrumbs items={CRUMBS} className="mt-4" />
      </div>

      <PageHero
        eyebrow="Pricing"
        title="Transparent pricing, scoped honestly"
        description="Every business system is different, so we quote per project — but the engagement model, what's included and the typical shapes are always visible up front."
        primaryCta={PRIMARY_CTA}
        secondaryCta={{ label: "Get a Project Estimate", href: "/contact" }}
      />

      <Section ariaLabel="Engagement models">
        <SectionHeader
          eyebrow="Models"
          title="Three ways to work with us"
          description="Pick the shape that matches how your business buys engineering and growth."
        />
        <div className="mt-10 gap-5 lg:grid-cols-3 grid">
          {ENGAGEMENT_MODELS.map((model) => (
            <Card key={model.title} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{model.title}</CardTitle>
                <p className="text-sm font-medium text-accent">{model.price}</p>
                <CardDescription>{model.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="gap-2.5 flex flex-col">
                  {model.points.map((point) => (
                    <li
                      key={point}
                      className="gap-2.5 text-sm flex items-start text-text-secondary"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="sunken" ariaLabel="What's included">
        <SectionHeader eyebrow="Included" title="In every engagement, regardless of size" />
        <div className="mt-10">
          <FeatureGrid groups={INCLUDED.map((group) => ({ ...group }))} />
        </div>
      </Section>

      <Section ariaLabel="Typical engagement shapes">
        <SectionHeader
          eyebrow="Indicative"
          title="Typical engagement shapes"
          description="Honest guidance to size your expectations — final numbers come from scoping, not this table."
        />
        <div className="mt-10 overflow-x-auto">
          <table className="text-sm w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">
              Typical engagement shapes per service — indicative only
            </caption>
            <thead>
              <tr className="text-xs tracking-wider border-b border-border-default text-text-muted uppercase">
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Service
                </th>
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Typical model
                </th>
                <th scope="col" className="py-3 font-semibold">
                  Indicative guidance
                </th>
              </tr>
            </thead>
            <tbody>
              {INDICATIVE_SHAPES.map((row) => (
                <tr key={row.service} className="border-b border-border-subtle">
                  <th scope="row" className="py-4 pr-4 font-medium text-text">
                    {row.service}
                  </th>
                  <td className="py-4 pr-4 text-text-secondary">{row.shape}</td>
                  <td className="py-4 text-text-secondary">{row.guidance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="sunken" ariaLabel="Pricing FAQ">
        <div className="gap-10 lg:grid-cols-[1fr_1.4fr] grid">
          <SectionHeader
            align="left"
            eyebrow="FAQ"
            title="Pricing questions"
            description="The commercial questions we hear most often."
          />
          <FaqAccordion items={faqs.map((faq) => ({ ...faq }))} />
        </div>
      </Section>

      <CTASection
        title="Get a real number"
        description="Tell us what you're building — we'll scope it and send a written estimate, free."
        primaryLabel="Get a Project Estimate"
        primaryHref="/contact"
        secondaryLabel={PRIMARY_CTA.label}
        secondaryHref={PRIMARY_CTA.href}
      />
    </>
  );
}
