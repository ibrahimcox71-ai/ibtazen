import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PublishedCaseStudy } from "@ibtatech/leads";
import { cn, focusRing } from "@ibtatech/ui";
import { caseStudyImageUrl } from "@/lib/case-study-image";

/**
 * Landing "Selected work" tiles. Every published slot renders a real card —
 * one link target, image with alt text, result metrics — pointing at its
 * detail page at `/case-studies/[slug]`. When nothing is published (or the
 * read failed) the homepage renders no section at all; there is no
 * placeholder card, because a placeholder box must never ship as proof.
 */

export function SelectedWorkCard({ study }: { study: PublishedCaseStudy }) {
  const imageUrl = caseStudyImageUrl(study.imagePath);
  const featured = study.slotNumber === 1;

  return (
    <Link
      href={`/case-studies/${study.slug}`}
      aria-label={`Read the case study: ${study.title}`}
      data-testid="case-study-card"
      data-slot={study.slotNumber}
      className={cn(
        // surface-raised + border-default + a resting shadow lifts the card
        // off the section background in light mode, where the section and the
        // old card were both plain white (the subtle border read as nothing).
        "group gap-4 p-6 flex h-full flex-col rounded-xl border border-border-default bg-surface-raised shadow-sm",
        "ease-out hover:-translate-y-0.5 transition-[border-color,box-shadow,transform] duration-200 hover:border-border-strong hover:shadow-md active:scale-[0.99] active:duration-150",
        focusRing,
      )}
    >
      {featured && (
        <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
          Featured case study
        </p>
      )}
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
        <h3 className="font-card-title text-card-title text-text">{study.title}</h3>
        <p className="mt-1 text-body text-text-secondary">{study.clientName}</p>
      </div>
      <p className="line-clamp-4 text-body text-text-secondary">{study.description}</p>
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
      <span className="gap-2 text-sm font-medium inline-flex items-center text-accent underline-offset-4 group-hover:underline group-focus-visible:underline">
        Read the case study
        <ArrowRight
          aria-hidden
          className="size-4 ease-out group-hover:translate-x-1 transition-transform duration-150"
        />
      </span>
    </Link>
  );
}
