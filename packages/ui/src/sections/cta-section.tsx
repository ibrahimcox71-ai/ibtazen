"use client";

import { cn } from "@ibtatech/utils";
import { ButtonLink } from "../components/button-link";
import { Reveal } from "../motion";
import { CONTAINER, SECTION_SPACING } from "../layout";

interface CTASectionProps {
  title: string;
  description?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

/** Inverted, high-emphasis conversion block. */
export function CTASection({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  className,
}: CTASectionProps) {
  return (
    <section aria-label="Call to action" className={cn("border-t border-border-subtle", className)}>
      <div className={cn(CONTAINER, SECTION_SPACING)}>
        <Reveal className="max-w-3xl mx-auto">
          <div className="rounded-2xl px-6 py-10 sm:px-12 relative overflow-hidden border border-accent/30 bg-surface-raised text-center shadow-lg">
            <div
              aria-hidden
              className="inset-0 pointer-events-none absolute bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent-soft),transparent_70%)] opacity-70"
            />
            <div className="gap-5 relative flex flex-col items-center">
              <h2 className="font-display text-headline text-balance text-text">{title}</h2>
              {description && (
                <p className="max-w-xl text-pretty text-text-secondary">{description}</p>
              )}
              <div className="mt-2 gap-3 sm:w-auto sm:flex-row flex w-full flex-col">
                {/* Hierarchy on the inverted block: filled primary, outlined secondary.
                    The generic `secondary` variant (solid surface + border) is built for
                    light pages — on this dark surface it competes with the primary in one
                    theme and disappears in the other, so the outline here is tuned to the
                    inverted background and keeps AA in both. */}
                <ButtonLink href={primaryHref} size="lg" className="sm:w-auto w-full">
                  {primaryLabel}
                </ButtonLink>
                {secondaryLabel && secondaryHref && (
                  <ButtonLink
                    href={secondaryHref}
                    variant="secondary"
                    size="lg"
                    className={cn("sm:w-auto w-full")}
                  >
                    {secondaryLabel}
                  </ButtonLink>
                )}
              </div>
              <p className="text-body text-text-secondary">
                Reply within 1 business day · No obligation
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
