import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Breadcrumbs,
  CTASection,
  JsonLd,
  PageHero,
  Section,
  StaggerGroup,
  StaggerItem,
} from "@ibtatech/ui";
import { OG_IMAGE, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { cn, focusRing } from "@ibtatech/utils";
import { listPublishedCaseStudies } from "@ibtatech/leads";
import { caseStudyImageUrl } from "@/lib/case-study-image";

/** CRM edits land here shortly after publish — same window as the landing page. */
export const revalidate = 60;

const TITLE = "Case studies - Ibtatech";
const DESCRIPTION =
  "Published client outcomes: what we rebuilt, what changed, and the numbers behind it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/case-studies" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/case-studies",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const CRUMBS = [{ label: "Home", href: "/" }, { label: "Case studies" }];

export default async function CaseStudiesPage() {
  const studies = await listPublishedCaseStudies();

  return (
    <>
      <JsonLd data={webPageSchema("/case-studies", "Case studies", DESCRIPTION)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="Selected work"
        title="Case studies"
        description="Real engagements, published only once the client approved the numbers. Each one opens with the problem, the build, and what measurably changed."
        primaryCta={{ label: "Discuss a project", href: "/contact" }}
        secondaryCta={{ label: "Get a Project Estimate", href: "/estimate" }}
      />

      <Section ariaLabel="Published case studies">
        {studies.length === 0 ? (
          <div className="max-w-2xl gap-4 flex flex-col">
            <h2 className="font-semibold font-display text-title">Nothing published yet</h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              We publish case studies when the numbers are client-approved and independently
              checkable. Ask us on a discovery call and we&apos;ll walk you through the relevant
              systems we&apos;ve built and the outcomes they drove.
            </p>
            <Link
              href="/contact"
              className={cn(
                "gap-2 text-sm font-medium inline-flex items-center text-accent",
                focusRing,
              )}
            >
              Talk to us about relevant work
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        ) : (
          <StaggerGroup className="gap-5 sm:grid-cols-2 lg:grid-cols-3 grid">
            {studies.map((study) => {
              const imageUrl = caseStudyImageUrl(study.imagePath);
              return (
                <StaggerItem key={study.id} className="h-full">
                  <Link
                    href={`/case-studies/${study.slug}`}
                    className="group gap-4 p-6 flex h-full flex-col rounded-xl border border-border-subtle bg-surface transition-colors hover:bg-surface-sunken"
                    data-testid="case-study-link"
                  >
                    {imageUrl && (
                      <div className="aspect-video relative overflow-hidden rounded-lg border border-border-subtle">
                        <Image
                          src={imageUrl}
                          alt={study.imageAlt || study.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                        {study.clientName}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold font-display text-text transition-colors group-hover:text-accent">
                        {study.title}
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-4 text-text-secondary">
                      {study.description}
                    </p>
                    {study.metrics.length > 0 && (
                      <dl className="gap-3 mt-auto grid grid-cols-2">
                        {study.metrics.map((metric) => (
                          <div
                            key={`${metric.label}-${metric.value}`}
                            className="p-3 rounded-lg bg-surface-sunken"
                          >
                            <dt className="text-xs text-text-muted">{metric.label}</dt>
                            <dd className="mt-0.5 text-lg font-semibold font-display text-text">
                              {metric.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <span className="gap-2 text-sm font-medium inline-flex items-center text-accent">
                      Read the case study
                      <ArrowRight
                        aria-hidden
                        className="size-4 group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </Section>

      <CTASection
        title="Want results like these?"
        description="Tell us where you want the business to go. We'll map the shortest technical route."
        primaryLabel="Discuss a project"
        primaryHref="/contact"
        secondaryLabel="Get a Project Estimate"
        secondaryHref="/estimate"
      />
    </>
  );
}
