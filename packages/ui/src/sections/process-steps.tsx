"use client";

import { cn } from "@ibtatech/utils";
import { StaggerGroup, StaggerItem } from "../motion";
import { Card } from "../components/card";

export interface ProcessStepItem {
  name: string;
  description: string;
}

/**
 * Numbered delivery process — staggered entrance on scroll.
 *
 * Four steps lay out as a single row on lg (1 col mobile, 2×2 tablet). On lg a
 * continuous thin horizontal rail runs through behind the 4 cards with numbered
 * nodes positioned on the line; below sm (one column) the same rail runs vertically
 * down the stacked cards. Both are `aria-hidden`: the step name is the label.
 * `border-strong` rather than `border-default` keeps the line visible in dark mode,
 * where the default border is only 12% white. Any other step count keeps the
 * wrapping grid instead — a lone card on its own row reads as an accident.
 *
 * Card surfaces use `surface-raised` + `border-default` rather than a sunken
 * fill: in dark mode the sunken tone is within a hair of the page background
 * and the cards disappear.
 */
export function ProcessSteps({
  steps,
  className,
}: {
  steps: readonly ProcessStepItem[];
  className?: string;
}) {
  const singleRow = steps.length === 4;
  return (
    <StaggerGroup
      className={cn(
        "gap-5 relative grid",
        singleRow ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {singleRow && (
        <>
          {/* Horizontal rail on lg+ (4 cards, one row): continuous line from left to right */}
          <span
            aria-hidden
            className="lg:block inset-x-0 absolute top-[38px] hidden h-px bg-border-strong"
          />
          {/* Stacked mobile layout: the same rail runs vertically through the gaps */}
          <span
            aria-hidden
            className="sm:hidden bottom-0 absolute top-[38px] left-[38px] w-px bg-border-strong"
          />
        </>
      )}
      {steps.map((step, index) => (
        <StaggerItem key={step.name} className="h-full">
          <Card
            tone="default"
            className="p-6 relative h-full border-border-default bg-surface-raised"
          >
            <div className="gap-3 flex items-center">
              {/* Numbered node positioned on the rail line */}
              <span
                aria-hidden
                className="size-7 text-sm font-semibold relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-surface font-mono text-accent"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-card-title text-card-title text-text">{step.name}</h3>
            </div>
            <p className="mt-3 text-body text-text-secondary">{step.description}</p>
          </Card>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
