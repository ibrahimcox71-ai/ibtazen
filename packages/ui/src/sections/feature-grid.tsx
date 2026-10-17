"use client";

import { cn } from "@ibtatech/utils";
import { Check } from "lucide-react";
import { StaggerGroup, StaggerItem } from "../motion";
import { Card } from "../components/card";

export interface FeatureGroup {
  title: string;
  items: readonly string[];
}

/**
 * Grouped capability/feature cards — staggered entrance on scroll.
 */
export function FeatureGrid({
  groups,
  columns = 2,
  className,
}: {
  groups: readonly FeatureGroup[];
  columns?: 2 | 4;
  className?: string;
}) {
  return (
    <StaggerGroup
      className={cn(
        "gap-5 grid",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {groups.map((group) => (
        <StaggerItem key={group.title} className="h-full">
          <Card className="p-6 h-full">
            <h3 className="font-card-title text-card-title text-text">{group.title}</h3>
            <ul className="mt-4 gap-2.5 flex flex-col">
              {group.items.map((item) => (
                <li key={item} className="gap-2.5 flex items-start text-body text-text-secondary">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
