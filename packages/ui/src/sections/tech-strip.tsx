import { cn } from "@ibtatech/utils";
import {
  Atom,
  Braces,
  Cloud,
  Code,
  Database,
  Layers,
  LayoutTemplate,
  Server,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

/**
 * Monochrome technology strip under the hero CTAs.
 *
 * These are tools we build with — never clients, never partners, so the label
 * must say so. Icons are decorative (`aria-hidden`), inherit `currentColor`
 * and deliberately avoid brand marks: the repo has no brand-logo library, and
 * a wrong or half-remembered logo would be worse than a neutral glyph. The
 * item name is the accessible name.
 *
 * Contrast: the strip renders inside the hero's decorative bloom, so the
 * worst-case dark-mode background is the accent wash, not the plain surface.
 * Label and items therefore sit one step up from muted — `text-secondary`
 * (label) and `text` (items) clear 4.5:1 over that worst case in both themes,
 * and both render at 14px.
 */
const GLYPHS: Record<string, LucideIcon> = {
  "Next.js": Layers,
  React: Atom,
  TypeScript: Braces,
  "Node.js": Server,
  "React Native": Smartphone,
  Flutter: LayoutTemplate,
  AWS: Cloud,
  PostgreSQL: Database,
};

const FALLBACK = Code;

export function TechStrip({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly string[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("gap-3 flex flex-col items-center", className)}>
      {/* text-sm (14px): the label and the items are both readable copy, not
          fine print — 13px is the floor for this strip. The label sits one
          step above muted and the items at full text color, so AA holds even
          where the hero bloom shows through (worst case ≥ 4.5:1 both themes). */}
      <p className="text-sm font-semibold tracking-[0.14em] text-text-secondary uppercase">
        {label}
      </p>
      <ul className="gap-x-5 gap-y-2 flex flex-wrap items-center justify-center">
        {items.map((item) => {
          const Glyph = GLYPHS[item] ?? FALLBACK;
          return (
            <li
              key={item}
              className="gap-1.5 text-sm font-medium inline-flex items-center text-text"
            >
              <Glyph aria-hidden className="size-4 shrink-0 text-text-secondary" />
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
