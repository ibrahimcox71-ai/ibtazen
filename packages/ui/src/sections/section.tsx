import { cn } from "@ibtatech/utils";
import { Reveal } from "../motion";
import { CONTAINER, SECTION_SPACING, SECTION_SPACING_UNDER_HERO } from "../layout";
import type { ReactNode } from "react";

/** Re-exported so pages can import the spacing contract from one place. */
export {
  CARD_GAP,
  CONTAINER,
  SECTION_GAP,
  SECTION_SPACING,
  SECTION_SPACING_UNDER_HERO,
} from "../layout";

type SectionTone = "default" | "sunken" | "bordered";

const tones: Record<SectionTone, string> = {
  default: "",
  sunken: "bg-surface-sunken",
  bordered: "border-t border-border-subtle",
};

interface SectionProps {
  children: ReactNode;
  tone?: SectionTone;
  className?: string;
  /** Accessible label when the section has no visible heading. */
  ariaLabel?: string;
  id?: string;
  /** Half the usual top padding — only for the section directly under the hero. */
  underHero?: boolean;
}

/** Consistent page section: container, padding and optional surface tone. */
export function Section({
  children,
  tone = "bordered",
  className,
  ariaLabel,
  id,
  underHero = false,
}: SectionProps) {
  return (
    <section id={id} aria-label={ariaLabel} className={cn("scroll-mt-24", tones[tone], className)}>
      <div className={cn(CONTAINER, underHero ? SECTION_SPACING_UNDER_HERO : SECTION_SPACING)}>
        {children}
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}

/** Section heading block with scroll reveal. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <Reveal
      className={cn(
        "gap-3 flex flex-col",
        centered ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
      )}
      <h2 className={cn("font-display text-headline text-balance", centered && "max-w-2xl")}>
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-body text-pretty text-text-secondary",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
