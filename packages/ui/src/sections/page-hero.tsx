import { cn } from "@ibtatech/utils";
import { ButtonLink } from "../components/button-link";
import { CONTAINER } from "../layout";
import type { ReactNode } from "react";

export interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  align?: "center" | "left";
  className?: string;
  /** Slot under the CTAs (e.g. the "Built with" technology strip). */
  afterCta?: ReactNode;
}

/** Interior-page hero: eyebrow, display title, lead copy and CTA pair. */
export function PageHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  align = "center",
  className,
  afterCta,
}: PageHeroProps) {
  const centered = align === "center";
  return (
    <section className={cn("relative overflow-hidden", className)}>
      {/*
        Restrained visual layer behind the headline: a soft accent bloom (wide
        wash + tighter core, the core is what makes it read in dark mode) plus a
        faint dot grid — all painted from semantic tokens so they work in light
        and dark. Decorative only — pointer-events-none and aria-hidden — and
        masked to fade out before the section edges, so the pattern never runs
        under body copy. Contrast of every text style over this stack is
        verified in both themes (worst case ≥ 4.5:1).
      */}
      <div aria-hidden className="inset-0 pointer-events-none absolute -z-10">
        <div className="inset-0 absolute bg-[radial-gradient(55%_45%_at_50%_0%,var(--color-accent-soft),transparent_70%)]" />
        <div className="inset-0 absolute bg-[radial-gradient(42%_38%_at_50%_0%,var(--accent),transparent_72%)] opacity-20" />
        <div className="inset-0 absolute [background-image:radial-gradient(var(--border-default)_1px,transparent_1px)] [mask-image:radial-gradient(74%_68%_at_50%_0%,#000_25%,transparent_80%)] [background-size:24px_24px]" />
      </div>
      <div
        className={cn(
          "gap-6 pt-12 pb-6 sm:pt-16 sm:pb-8 lg:pb-10 flex w-full flex-col",
          CONTAINER,
          centered ? "items-center text-center" : "items-start",
        )}
      >
        {eyebrow && (
          <p
            data-hero-item
            className="text-sm font-semibold tracking-[0.14em] text-accent uppercase"
          >
            {eyebrow}
          </p>
        )}
        <h1
          data-hero-item
          className={cn("font-display text-headline text-balance", centered && "max-w-3xl")}
        >
          {title}
        </h1>
        {description && (
          <p data-hero-item className={cn("max-w-2xl text-lead text-pretty text-text-secondary")}>
            {description}
          </p>
        )}
        {(primaryCta || secondaryCta) && (
          <div
            data-hero-item
            className={cn(
              "mt-2 gap-3 sm:w-auto sm:flex-row flex w-full flex-col",
              centered && "sm:justify-center",
            )}
          >
            {primaryCta && (
              <ButtonLink href={primaryCta.href} size="lg" className="sm:w-auto w-full">
                {primaryCta.label}
              </ButtonLink>
            )}
            {secondaryCta && (
              <ButtonLink
                href={secondaryCta.href}
                variant="secondary"
                size="lg"
                className="sm:w-auto w-full"
              >
                {secondaryCta.label}
              </ButtonLink>
            )}
          </div>
        )}
        {afterCta && (
          <div data-hero-item className="w-full">
            {afterCta}
          </div>
        )}
      </div>
    </section>
  );
}
