import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CTASection,
  FaqAccordion,
  FeatureGrid,
  JsonLd,
  PageHero,
  ProcessSteps,
  Section,
  SectionHeader,
  StaggerGroup,
  StaggerItem,
  cn,
  focusRing,
} from "@ibtatech/ui";
import {
  OG_IMAGE,
  SERVICES,
  breadcrumbSchema,
  faqPageSchema,
  getService,
  serviceHref,
  serviceSchema,
  webPageSchema,
} from "@ibtatech/config";
import { SERVICE_SLUGS, isServiceSlug } from "@ibtatech/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SERVICE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isServiceSlug(slug)) return {};
  const service = getService(slug);
  return {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical: serviceHref(slug) },
    openGraph: {
      title: service.metaTitle,
      description: service.metaDescription,
      url: serviceHref(slug),
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: service.metaTitle,
      description: service.metaDescription,
      images: [OG_IMAGE],
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isServiceSlug(slug)) notFound();
  const service = getService(slug);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: service.name },
  ];

  const otherServices = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <>
      <JsonLd
        data={webPageSchema(serviceHref(service.slug), service.name, service.metaDescription)}
      />
      <JsonLd data={serviceSchema(service)} />
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd data={faqPageSchema(service.faqs)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={crumbs} />
      </div>

      <PageHero
        eyebrow={service.name}
        title={service.headline}
        description={service.subheadline}
        primaryCta={{ label: service.ctaLabel, href: service.ctaHref }}
        secondaryCta={{
          label: service.secondaryCtaLabel,
          href: service.secondaryCtaHref,
        }}
      />

      {/* Problems */}
      <Section ariaLabel="Problems we solve" tone="sunken">
        <div className="gap-10 lg:grid-cols-[1fr_1.2fr] grid">
          <SectionHeader align="left" eyebrow="Sound familiar?" title="The problems this removes" />
          <StaggerGroup className="gap-3 flex flex-col">
            {service.problems.map((problem) => (
              <StaggerItem key={problem}>
                <Card className="gap-3 p-4 flex items-start">
                  <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                  <p className="text-sm text-text-secondary">{problem}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </Section>

      {/* Capabilities */}
      <Section ariaLabel="Capabilities">
        <SectionHeader eyebrow="Capabilities" title={`What ${service.name.toLowerCase()} covers`} />
        <div className="mt-10">
          <FeatureGrid groups={service.capabilities.map((group) => ({ ...group }))} />
        </div>
      </Section>

      {/* Process */}
      <Section tone="sunken" ariaLabel="Process">
        <SectionHeader
          eyebrow="Process"
          title="How we deliver"
          description="Transparent stages, weekly demos, and a written scope before anything starts."
        />
        <div className="mt-10">
          <ProcessSteps steps={service.process.map((step) => ({ ...step }))} />
        </div>
      </Section>

      {/* FAQ */}
      <Section ariaLabel="Frequently asked questions">
        <div className="gap-10 lg:grid-cols-[1fr_1.4fr] grid">
          <SectionHeader
            align="left"
            eyebrow="FAQ"
            title={`${service.name} questions`}
            description="Direct answers to what clients usually ask before starting."
          />
          <FaqAccordion items={service.faqs.map((faq) => ({ ...faq }))} />
        </div>
      </Section>

      {/* Cross-sell */}
      <Section tone="sunken" ariaLabel="Related services">
        <SectionHeader
          eyebrow="Related"
          title="Pairs well with"
          description="Disciplines that compound when run by the same team."
        />
        <StaggerGroup className="mt-10 gap-5 sm:grid-cols-2 lg:grid-cols-3 grid">
          {otherServices.map((other) => (
            <StaggerItem key={other.slug} className="h-full">
              <Link
                href={serviceHref(other.slug)}
                className={cn(
                  "group block h-full rounded-xl transition-transform duration-150 active:scale-[0.99]",
                  focusRing,
                )}
              >
                <Card tone="interactive" className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">{other.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="gap-2 text-sm font-medium inline-flex items-center text-accent">
                      Learn more
                      <ArrowRight
                        aria-hidden
                        className="size-4 group-hover:translate-x-1 transition-transform duration-200"
                      />
                      <span className="sr-only"> about {other.name}</span>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* Final CTA */}
      <CTASection
        title={`Ready to talk ${service.name.toLowerCase()}?`}
        description="A free 30-minute discovery call — scoped honestly, no obligation."
        primaryLabel={service.ctaLabel}
        primaryHref={service.ctaHref}
        secondaryLabel="Get a Project Estimate"
        secondaryHref="/contact"
      />
    </>
  );
}
