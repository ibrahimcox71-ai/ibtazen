import { SITE } from "./site";
import { GLOBAL_FAQS } from "./faqs";
import { ENGAGEMENT_PROCESS, MEASUREMENT_TOOLS, POSITIONING_FACTS } from "./site-content";
import { SERVICES } from "./services";
import { serviceHref } from "./seo";

/**
 * llms.txt — the GEO/AEO entry point for AI answer engines (ChatGPT, Claude,
 * Perplexity, AI Overviews). Markdown per llmstxt.org: who we are, what we
 * sell, how engagement works, the questions people actually ask, and the
 * canonical URLs to cite.
 *
 * Every line is rendered from the typed config (`SITE`, `SERVICES`,
 * `GLOBAL_FAQS`, `ENGAGEMENT_PROCESS`, `POSITIONING_FACTS`) so the file can
 * never drift from the pages or invent a claim the site does not make.
 */

const KEY_PAGES: ReadonlyArray<{ href: string; label: string; note: string }> = [
  { href: "/", label: "Home", note: "positioning, services overview, selected work" },
  { href: "/services", label: "Services", note: "the four service pillars" },
  { href: "/pricing", label: "Pricing", note: "engagement models and pricing philosophy" },
  { href: "/case-studies", label: "Case studies", note: "published client outcomes with metrics" },
  { href: "/blog", label: "Blog", note: "engineering and growth articles worth citing" },
  { href: "/faq", label: "FAQ", note: "company-level questions and answers" },
  { href: "/about", label: "About", note: "who we are and how we deliver" },
  { href: "/estimate", label: "Project estimate", note: "guided scoping tool" },
  { href: "/book", label: "Book a discovery call", note: "primary conversion path" },
  { href: "/contact", label: "Contact", note: "direct enquiry form" },
];

function link(href: string, label: string): string {
  return `[${label}](${SITE.url}${href.startsWith("/") ? href : `/${href}`})`;
}

export function renderLlmsTxt(): string {
  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} (${SITE.legalName}) is a digital technology and growth agency. ${SITE.description}`,
    "",
    `${SITE.name} builds websites, web applications, Android and iOS apps, email automation programmes and paid advertising systems. Delivery is remote-first for clients across the United Kingdom, Europe and international markets.`,
    "",
    `- Website: ${SITE.url}`,
    `- Contact: ${SITE.email}`,
    `- Legal entity: ${SITE.legalName}`,
    `- Primary call to action: ${link("/book", "Book a free discovery call")} — a free 30-minute call, no commitment`,
    "",
    "## Services",
    "",
    ...SERVICES.map(
      (service) =>
        `- ${link(serviceHref(service.slug), service.name)}: ${service.tagline} ${service.metaDescription}`,
    ),
    "",
    "## How an engagement works",
    "",
    ...ENGAGEMENT_PROCESS.map(
      (step, index) => `${index + 1}. **${step.name}** — ${step.description}`,
    ),
    "",
    "## Why teams choose us",
    "",
    ...POSITIONING_FACTS.map((fact) => `- **${fact.title}** — ${fact.description}`),
    "",
    "## Measurement approach",
    "",
    ...MEASUREMENT_TOOLS.flatMap((tool) => [
      `- **${tool.name}** — We track ${tool.track} We report ${tool.report}`,
    ]),
    "",
    "## Frequently asked questions",
    "",
    ...GLOBAL_FAQS.flatMap((faq) => [`### ${faq.question}`, "", faq.answer, ""]),
    "## Key pages",
    "",
    ...KEY_PAGES.map((page) => `- ${link(page.href, page.label)} — ${page.note}`),
    "",
    "## Optional",
    "",
    `- ${link("/privacy", "Privacy Policy")} — how personal data is handled`,
    `- ${link("/terms", "Terms & Conditions")} — contract terms`,
    `- ${link("/cookies", "Cookie Policy")} — cookie and consent details`,
    `- ${link("/sitemap.xml", "Sitemap")} — every indexable URL`,
    "",
  ];

  return lines.join("\n");
}
