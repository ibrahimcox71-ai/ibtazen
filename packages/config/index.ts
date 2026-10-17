/**
 * Central, typed application configuration.
 * Single source of truth for brand facts and site structure — pages, the
 * sitemap, structured data and the AI assistant must all read from here.
 */

export { SITE } from "./site";

/**
 * Primary navigation — only routes that exist in this phase. Dead links are a
 * conversion defect; /case-studies arrives with Phase 4 content.
 */
export const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const satisfies ReadonlyArray<{ href: string; label: string }>;

export const FOOTER_LINK_GROUPS = [
  {
    title: "Services",
    links: [
      { href: "/services/web-development", label: "Web Development" },
      { href: "/services/mobile-app-development", label: "Mobile App Development" },
      { href: "/services/email-marketing", label: "Email Marketing & Automation" },
      { href: "/services/paid-advertising", label: "Paid Advertising" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
] as const;

/** Primary conversion CTA used across the site. */
export const PRIMARY_CTA = {
  label: "Book a Free Discovery Call",
  href: "/book",
} as const;

export { SERVICES, getService, BUDGET_BANDS } from "./services";
export {
  ESTIMATOR_SERVICES,
  ESTIMATOR_FEATURES,
  ESTIMATOR_SCALES,
  ESTIMATOR_STEPS,
  ESTIMATOR_TIMELINES,
  ESTIMATOR_BUDGETS,
  ESTIMATOR_ENGAGEMENT,
} from "./estimator";
export type { EstimatorServiceKey } from "./estimator";
export { GLOBAL_FAQS } from "./faqs";
export { ANALYTICS, ANALYTICS_SCRIPT_URL } from "./analytics";
export { renderLlmsTxt } from "./llms";
export {
  POSITIONING_FACTS,
  ENGAGEMENT_PROCESS,
  CLIENT_TYPES,
  TECH_STACK_GROUPS,
  DISCUSS_WORK_CTA,
  BUILT_WITH,
  FAQ_CONTACT,
  MEASUREMENT_TOOLS,
  FOUNDER_PROFILE,
  isPublishableFounder,
} from "./site-content";
export type { FounderProfile } from "./site-content";
export {
  OG_IMAGE,
  absoluteUrl,
  organizationSchema,
  websiteSchema,
  serviceSchema,
  webPageSchema,
  breadcrumbSchema,
  faqPageSchema,
  articleSchema,
  serviceHref,
} from "./seo";
export type { ServiceContent, ServiceFaq, ServiceCapabilityGroup, ProcessStep } from "./services";
