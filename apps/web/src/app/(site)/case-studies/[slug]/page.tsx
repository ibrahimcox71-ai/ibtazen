import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Breadcrumbs,
  CTASection,
  Card,
  JsonLd,
  PageHero,
  Section,
  SectionHeader,
} from "@ibtatech/ui";
import { OG_IMAGE, absoluteUrl, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { cn, focusRing } from "@ibtatech/utils";
import { blogVideoEmbedSrc, getPublishedCaseStudyBySlug } from "@ibtatech/leads";
import { caseStudyImageUrl } from "@/lib/case-study-image";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Published stories can change in the CRM — refresh on the same window as `/`. */
export const revalidate = 60;

/** One-line meta summary — cut on a word boundary so nothing reads truncated. */
function excerpt(description: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length <= 155) return flat;
  return `${flat.slice(0, 152).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = await getPublishedCaseStudyBySlug(slug);
  // Unknown / unpublished slugs render 404 — keep them out of the index.
  if (!study) return { robots: { index: false, follow: false } };

  const title = `${study.title} - Ibtatech case study`;
  const description = excerpt(study.description);
  const url = `/case-studies/${study.slug}`;
  const imageUrl = caseStudyImageUrl(study.imagePath);
  const ogImage = imageUrl ? absoluteUrl(imageUrl) : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      // A study with its own image wins; the branded default covers the rest.
      images: ogImage ? [ogImage] : [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [OG_IMAGE],
    },
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const study = await getPublishedCaseStudyBySlug(slug);
  if (!study) notFound();

  const url = `/case-studies/${study.slug}`;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Case studies", href: "/case-studies" },
    { label: study.title },
  ];
  const summary = excerpt(study.description);
  const imageUrl = caseStudyImageUrl(study.imagePath);
  const embedSrc = blogVideoEmbedSrc(study.videoEmbedUrl);

  return (
    <>
      <JsonLd data={webPageSchema(url, `${study.title} — ${study.clientName}`, summary)} />
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={crumbs} />
      </div>

      <PageHero
        eyebrow={study.clientName}
        title={study.title}
        description={summary}
        primaryCta={{ label: "Discuss a similar project", href: "/contact" }}
        secondaryCta={{ label: "All case studies", href: "/case-studies" }}
      />

      <Section ariaLabel="The story">
        <div className="max-w-3xl gap-6 flex flex-col">
          <SectionHeader align="left" eyebrow="What happened" title="The story" />
          {imageUrl && (
            <figure className="overflow-hidden rounded-xl border border-border-subtle">
              <div className="aspect-video relative">
                <Image
                  src={imageUrl}
                  alt={study.imageAlt || study.title}
                  fill
                  sizes="(min-width: 768px) 768px, 100vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </figure>
          )}
          {embedSrc && (
            <div className="aspect-video relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken">
              <iframe
                src={embedSrc}
                title={`${study.title} - video`}
                className="inset-0 absolute h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
                data-testid="case-study-video"
              />
            </div>
          )}
          <p className="text-base leading-relaxed whitespace-pre-line text-text-secondary">
            {study.description}
          </p>
          <p>
            <Link
              href="/case-studies"
              className={cn(
                "gap-2 text-sm font-medium inline-flex items-center text-accent",
                focusRing,
              )}
            >
              Back to all case studies
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </p>
        </div>
      </Section>

      {study.metrics.length > 0 && (
        <Section ariaLabel="Results" tone="sunken">
          <SectionHeader eyebrow="Results" title="What measurably changed" />
          <div className="gap-4 mt-10 sm:grid-cols-2 lg:grid-cols-3 grid">
            {study.metrics.map((metric) => (
              <Card key={`${metric.label}-${metric.value}`} className="gap-2 p-5">
                <p className="text-xs tracking-wide text-text-muted uppercase">{metric.label}</p>
                <p className="text-2xl font-semibold font-display text-text tabular-nums">
                  {metric.value}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

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
