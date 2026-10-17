import type { ProcessStep } from "./services";

/**
 * HOMEPAGE & SITE-WIDE CONTENT — positioning facts, engagement process,
 * client types and technology groups. All claims are capability statements;
 * no metrics, clients or awards are invented.
 */

/** Honest positioning facts — verifiable ways of working, not vanity metrics. */
export const POSITIONING_FACTS = [
  {
    title: "UK & EU delivery",
    description: "International remote delivery with communication in your timezone.",
  },
  {
    title: "Senior engineers only",
    description: "The people who scope your system are the people who build it.",
  },
  {
    title: "You own everything",
    description: "Code, accounts and data are yours, with documented handover.",
  },
  {
    title: "Measured, not promised",
    description: "Honest reporting against agreed KPIs — never guaranteed-results talk.",
  },
] as const;

/** The standard engagement model shown on homepage, pricing and about. */
export const ENGAGEMENT_PROCESS: readonly ProcessStep[] = [
  {
    name: "Discovery call",
    description: "A free 30-minute call to map goals, constraints and the shortest route to value.",
  },
  {
    name: "Scope & plan",
    description:
      "A written plan with timeline and preliminary estimate — approved before any work starts.",
  },
  {
    name: "Build in slices",
    description:
      "Weekly demos of working software. You see progress in the product, not in slide decks.",
  },
  {
    name: "Launch",
    description:
      "Measured release, monitoring, and an improvement roadmap driven by real usage data.",
  },
];

/** Client types / industries — who the site speaks to, without inventing logos. */
export const CLIENT_TYPES = [
  {
    title: "Startups",
    description: "First production system or MVP — validated fast, engineered to scale past v1.",
  },
  {
    title: "SMEs",
    description:
      "Established businesses replacing manual processes and slow websites with real systems.",
  },
  {
    title: "Growth-stage companies",
    description:
      "Teams that need platform engineering, lifecycle marketing and acquisition working together.",
  },
  {
    title: "Agencies & partners",
    description:
      "White-label engineering and growth execution for agencies without in-house capacity.",
  },
] as const;

/**
 * Call offer — "walk us through your relevant work" — used wherever the page
 * offers a discovery call for proof we cannot publish yet. One sentence, one
 * source, so the same sentence never renders twice on a page.
 */
export const DISCUSS_WORK_CTA = "Discuss relevant work on a call" as const;

/**
 * Hero "Built with" strip — the technology we build with, labelled as
 * technology. Never clients, never partners: no logo may be invented.
 */
export const BUILT_WITH = {
  label: "Built with",
  items: [
    "Next.js",
    "React",
    "TypeScript",
    "Node.js",
    "React Native",
    "Flutter",
    "AWS",
    "PostgreSQL",
  ],
} as const;

/**
 * Homepage FAQ — the escape hatch for buyers who read everything: a sticky
 * invitation to ask whatever is left, on a call.
 */
export const FAQ_CONTACT = {
  text: "Still have a question?",
  button: "Book a free call",
} as const;

/** Channel measurement descriptions used consistently by the site and discovery surfaces. */
export const MEASUREMENT_TOOLS = [
  {
    id: "ga4",
    name: "GA4",
    track: "Events, conversions and funnel steps, where relevant.",
    report: "Traffic quality and conversion rate by channel.",
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    track: "Cost per lead or acquisition, plus creative performance.",
    report: "Spend against the agreed KPI and learnings each cycle.",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    track: "Flow revenue, opens and clicks, and list growth.",
    report: "Flow performance and segment health.",
  },
] as const;

export interface FounderProfile {
  name: string;
  role: string;
  bio?: string;
  photo?: { src: string; alt: string };
  links?: ReadonlyArray<{ label: string; href: string }>;
}

/** Leave undefined until approved, real founder details are supplied. */
export const FOUNDER_PROFILE: FounderProfile | undefined = undefined;

const PLACEHOLDER_TEXT = /(?:\[|\]|\b(?:todo|tbd|placeholder|founder name|add a short)\b)/i;

function isRealText(value: string | undefined): value is string {
  return Boolean(value?.trim() && !PLACEHOLDER_TEXT.test(value));
}

/** Guard public rendering and Person schema against empty or scaffold data. */
export function isPublishableFounder(
  profile: FounderProfile | undefined,
): profile is FounderProfile {
  if (!profile || !isRealText(profile.name) || !isRealText(profile.role)) return false;

  const hasBio = isRealText(profile.bio);
  const hasPhoto = Boolean(
    profile.photo && isRealText(profile.photo.src) && isRealText(profile.photo.alt),
  );
  const optionalFieldsAreReal =
    (profile.bio === undefined || hasBio) && (profile.photo === undefined || hasPhoto);
  const linksAreReal = (profile.links ?? []).every(
    (link) => isRealText(link.label) && isRealText(link.href),
  );

  return (hasBio || hasPhoto) && optionalFieldsAreReal && linksAreReal;
}

/** Technology groups — capability statement, not a certification claim. */
export const TECH_STACK_GROUPS = [
  { title: "Web", items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js", "Laravel"] },
  { title: "Mobile", items: ["React Native", "Flutter", "Expo", "Android", "iOS"] },
  { title: "Data & infra", items: ["PostgreSQL", "Prisma", "Redis", "Vercel", "AWS"] },
  {
    title: "Growth",
    items: ["Klaviyo", "Mailchimp", "Customer.io", "Google Ads", "Meta Ads", "GA4"],
  },
] as const;
