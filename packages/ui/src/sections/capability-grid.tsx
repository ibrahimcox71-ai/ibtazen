import type { CSSProperties } from "react";
import {
  Circle,
  Cloud,
  Database,
  Globe,
  Mail,
  Smartphone,
  TrendingUp,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  siAndroid,
  siApple,
  siExpo,
  siFlutter,
  siGoogleads,
  siGoogleanalytics,
  siLaravel,
  siMailchimp,
  siMeta,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPrisma,
  siReact,
  siRedis,
  siTailwindcss,
  siTypescript,
  siVercel,
  type SimpleIcon,
} from "simple-icons";
import { cn } from "@ibtatech/utils";
import { Card } from "../components/card";

export interface CapabilityGroup {
  title: string;
  items: readonly string[];
}

type Technology =
  | "Next.js"
  | "React"
  | "TypeScript"
  | "Tailwind CSS"
  | "Node.js"
  | "Laravel"
  | "React Native"
  | "Flutter"
  | "Expo"
  | "Android"
  | "iOS"
  | "PostgreSQL"
  | "Prisma"
  | "Redis"
  | "Vercel"
  | "AWS"
  | "Klaviyo"
  | "Mailchimp"
  | "Customer.io"
  | "Google Ads"
  | "Meta Ads"
  | "GA4";

type BrandMark = {
  icon: SimpleIcon;
  color: string;
  darkColor: string;
};

type BrandIconStyle = CSSProperties &
  Record<"--tech-brand-color" | "--tech-brand-color-dark", string>;

const GROUP_GLYPHS: Record<string, LucideIcon> = {
  Web: Globe,
  Mobile: Smartphone,
  "Data & infra": Database,
  Growth: TrendingUp,
};

/** Simple Icons' official brand colors; black marks stay legible in dark mode. */
const TECH_BRANDS: Partial<Record<Technology, BrandMark>> = {
  "Next.js": {
    icon: siNextdotjs,
    color: `#${siNextdotjs.hex}`,
    darkColor: "currentColor",
  },
  React: { icon: siReact, color: `#${siReact.hex}`, darkColor: `#${siReact.hex}` },
  TypeScript: {
    icon: siTypescript,
    color: `#${siTypescript.hex}`,
    darkColor: `#${siTypescript.hex}`,
  },
  "Tailwind CSS": {
    icon: siTailwindcss,
    color: `#${siTailwindcss.hex}`,
    darkColor: `#${siTailwindcss.hex}`,
  },
  "Node.js": {
    icon: siNodedotjs,
    color: `#${siNodedotjs.hex}`,
    darkColor: `#${siNodedotjs.hex}`,
  },
  Laravel: { icon: siLaravel, color: `#${siLaravel.hex}`, darkColor: `#${siLaravel.hex}` },
  Flutter: { icon: siFlutter, color: `#${siFlutter.hex}`, darkColor: `#${siFlutter.hex}` },
  Expo: { icon: siExpo, color: `#${siExpo.hex}`, darkColor: `#${siExpo.hex}` },
  Android: { icon: siAndroid, color: `#${siAndroid.hex}`, darkColor: `#${siAndroid.hex}` },
  iOS: { icon: siApple, color: `#${siApple.hex}`, darkColor: "currentColor" },
  PostgreSQL: {
    icon: siPostgresql,
    color: `#${siPostgresql.hex}`,
    darkColor: `#${siPostgresql.hex}`,
  },
  Prisma: { icon: siPrisma, color: `#${siPrisma.hex}`, darkColor: "currentColor" },
  Redis: { icon: siRedis, color: `#${siRedis.hex}`, darkColor: `#${siRedis.hex}` },
  Vercel: { icon: siVercel, color: `#${siVercel.hex}`, darkColor: "currentColor" },
  Mailchimp: {
    icon: siMailchimp,
    color: `#${siMailchimp.hex}`,
    darkColor: `#${siMailchimp.hex}`,
  },
  "Google Ads": {
    icon: siGoogleads,
    color: `#${siGoogleads.hex}`,
    darkColor: `#${siGoogleads.hex}`,
  },
  "Meta Ads": { icon: siMeta, color: `#${siMeta.hex}`, darkColor: `#${siMeta.hex}` },
  GA4: {
    icon: siGoogleanalytics,
    color: `#${siGoogleanalytics.hex}`,
    darkColor: `#${siGoogleanalytics.hex}`,
  },
};

/** Neutral fallbacks are intentionally not styled to resemble a brand logo. */
const NEUTRAL_GLYPHS: Partial<Record<Technology, LucideIcon>> = {
  "React Native": Smartphone,
  AWS: Cloud,
  Klaviyo: Mail,
  "Customer.io": Workflow,
};

export function CapabilityGrid({
  groups,
  className,
}: {
  groups: readonly CapabilityGroup[];
  className?: string;
}) {
  return (
    <div className={cn("gap-5 sm:grid-cols-2 xl:grid-cols-4 grid", className)}>
      {groups.map((group) => {
        const GroupGlyph = GROUP_GLYPHS[group.title] ?? Globe;

        return (
          <Card key={group.title} className="gap-4 p-6 flex h-[226px] flex-col">
            <div className="gap-3 flex items-center">
              <span className="size-9 flex items-center justify-center rounded-lg bg-accent-soft text-accent">
                <GroupGlyph aria-hidden="true" className="size-5" />
              </span>
              <h3 className="font-card-title text-card-title text-text">{group.title}</h3>
            </div>
            <ul className="gap-2 grid grid-cols-2">
              {group.items.map((item) => (
                <CapabilityChip key={item} label={item} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function CapabilityChip({ label }: { label: string }) {
  const technology = isTechnology(label) ? label : undefined;
  const brand = technology ? TECH_BRANDS[technology] : undefined;
  const iconStyle: BrandIconStyle | undefined = brand
    ? {
        "--tech-brand-color": brand.color,
        "--tech-brand-color-dark": brand.darkColor,
      }
    : undefined;

  return (
    <li
      tabIndex={0}
      style={iconStyle}
      className="h-9 min-w-0 gap-1 px-1.5 font-medium group/chip flex items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken text-[13px] whitespace-nowrap text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span
        aria-hidden="true"
        className="text-text-muted transition-colors duration-150 group-focus-within/chip:text-[var(--tech-brand-color)] group-hover/chip:text-[var(--tech-brand-color)] motion-reduce:transition-none dark:group-focus-within/chip:text-[var(--tech-brand-color-dark)] dark:group-hover/chip:text-[var(--tech-brand-color-dark)]"
      >
        <TechGlyph label={label} />
      </span>
      <span>{label}</span>
    </li>
  );
}

function TechGlyph({ label }: { label: string }) {
  const technology = isTechnology(label) ? label : undefined;
  const brand = technology ? TECH_BRANDS[technology] : undefined;
  if (brand) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 shrink-0"
        fill="currentColor"
        focusable="false"
      >
        <path d={brand.icon.path} />
      </svg>
    );
  }

  const Glyph = (technology && NEUTRAL_GLYPHS[technology]) ?? Circle;
  return <Glyph aria-hidden="true" className="size-4 shrink-0" />;
}

function isTechnology(label: string): label is Technology {
  return Object.hasOwn(TECH_BRANDS, label) || Object.hasOwn(NEUTRAL_GLYPHS, label);
}
