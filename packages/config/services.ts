import type { BudgetBand, ServiceSlug } from "@ibtatech/types";

/**
 * SERVICE CONTENT — the single source of truth for every service page, the
 * services index, homepage pillars and structured data. Pages render from
 * these records; never duplicate service copy inside page files.
 */

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceCapabilityGroup {
  title: string;
  items: string[];
}

export interface ProcessStep {
  name: string;
  description: string;
}

export interface ServiceContent {
  slug: ServiceSlug;
  name: string;
  /** Short card copy for grids and homepage pillars. */
  tagline: string;
  /** Hero headline — outcome-focused. */
  headline: string;
  /** Hero subheading. */
  subheadline: string;
  /** Search title (≤ 60 chars ideal). */
  metaTitle: string;
  metaDescription: string;
  /** The business problems this service removes. */
  problems: string[];
  capabilities: ServiceCapabilityGroup[];
  process: ProcessStep[];
  faqs: ServiceFaq[];
  /** Primary conversion CTA for this service. */
  ctaLabel: string;
  ctaHref: string;
  /** Secondary CTA. */
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

const WEB_FAQS: ServiceFaq[] = [
  {
    question: "How long does a typical web project take?",
    answer:
      "A focused business website usually ships in 3–6 weeks. Web applications and SaaS platforms run in staged releases, with the first usable version typically live within 6–10 weeks. We confirm a real timeline after a discovery call.",
  },
  {
    question: "Do you work with our existing codebase?",
    answer:
      "Yes. We start with a technical audit of the current code, infrastructure and deployment pipeline, then propose either a targeted improvement plan or a rebuild where that is measurably cheaper to maintain.",
  },
  {
    question: "Which technologies do you use?",
    answer:
      "Primarily Next.js with TypeScript for web applications, Tailwind CSS for design systems, and PostgreSQL for data. We choose the stack per project — not per fashion cycle.",
  },
  {
    question: "Who owns the code?",
    answer:
      "You do. Full source code, infrastructure configuration and documentation are handed over, with no vendor lock-in.",
  },
];

const MOBILE_FAQS: ServiceFaq[] = [
  {
    question: "Should we build native apps or cross-platform?",
    answer:
      "For most business apps, React Native or Flutter delivers native-quality UX on Android and iOS from one codebase, at roughly half the cost of two native teams. We recommend fully native development only when a specific hardware, performance or platform feature requires it.",
  },
  {
    question: "Do you publish the app to the stores?",
    answer:
      "Yes — we handle Google Play and App Store submission, review compliance, store listings, screenshots and phased rollouts.",
  },
  {
    question: "Can you maintain an app another company built?",
    answer:
      "Usually, yes. It starts with a codebase audit covering architecture, dependencies, build pipeline and store-account status, followed by a maintenance and improvement plan.",
  },
  {
    question: "How do updates and new releases work after launch?",
    answer:
      "We ship fixes and improvements in regular release cycles, with crash and analytics monitoring. Most updates go through over-the-air or standard store review within days.",
  },
];

const EMAIL_FAQS: ServiceFaq[] = [
  {
    question: "Which email platforms do you work with?",
    answer:
      "We implement on the platform that fits your stack — common choices include Klaviyo, Mailchimp, Customer.io and Braze, plus transactional providers such as Resend or Postmark. We are independent of any vendor.",
  },
  {
    question: "What does a lifecycle program include?",
    answer:
      "Welcome and onboarding sequences, lead nurturing, abandoned-cart or abandoned-application recovery, win-back and retention campaigns — each with segmentation, personalization and reporting against revenue, not open rates alone.",
  },
  {
    question: "Can you connect email to our CRM?",
    answer:
      "Yes. We integrate email activity with your CRM so sales sees engagement history and marketing reacts to pipeline status automatically.",
  },
  {
    question: "Do you guarantee open rates or revenue lifts?",
    answer:
      "No. Anyone who guarantees specific email metrics is guessing. We commit to a measured programme: clean data, tested flows and transparent reporting against agreed KPIs.",
  },
];

const ADS_FAQS: ServiceFaq[] = [
  {
    question: "What ad budgets do you work with?",
    answer:
      "Meaningful paid-search and paid-social programmes typically start from around £2,000/month in media spend. Below that, we usually recommend fixing conversion foundations first.",
  },
  {
    question: "Do you guarantee campaign results?",
    answer:
      "No. We never promise guaranteed returns or positions — no competent agency can. What we commit to is rigorous tracking, honest reporting and continuous optimisation against your cost-per-acquisition targets.",
  },
  {
    question: "Do we keep ownership of the ad accounts?",
    answer:
      "Always. Accounts, pixels, audiences and data stay yours. We work inside your assets with partner access — never the other way round.",
  },
  {
    question: "How do you measure success?",
    answer:
      "Against your numbers: qualified leads, cost per acquisition, and revenue influenced. We set up server-side tracking and conversion APIs before scaling spend, so decisions rest on verified data.",
  },
];

export const SERVICES: readonly ServiceContent[] = [
  {
    slug: "web-development",
    name: "Web Development",
    tagline: "Websites, SaaS, e-commerce and custom applications engineered for growth.",
    headline: "Web platforms that carry business weight",
    subheadline:
      "Business websites, SaaS products, e-commerce and custom platforms — engineered for speed, measured on conversions and built to scale with your operations.",
    metaTitle: "Web Development Services — Websites, SaaS & E-commerce",
    metaDescription:
      "Ibtatech builds high-performance business websites, SaaS platforms and e-commerce with Next.js. Senior engineers, transparent delivery, measurable outcomes.",
    problems: [
      "Your current site is slow, fragile or impossible to update without a developer",
      "Traffic arrives but doesn't convert into enquiries or sales",
      "Manual processes (quotes, bookings, reporting) that should be automated",
      "A SaaS or platform idea stuck in spreadsheet-and-slides stage",
    ],
    capabilities: [
      {
        title: "Websites & e-commerce",
        items: [
          "Corporate and business websites",
          "E-commerce storefronts and checkout flows",
          "Content-managed marketing sites",
          "Multilingual, multi-market builds",
        ],
      },
      {
        title: "Applications & platforms",
        items: [
          "SaaS products and customer portals",
          "Internal tools and dashboards",
          "Booking, quoting and workflow systems",
          "API design and third-party integrations",
        ],
      },
      {
        title: "Engineering quality",
        items: [
          "Performance budgets and Core Web Vitals",
          "Technical SEO built into the architecture",
          "WCAG 2.2 AA accessibility",
          "Secure authentication and data handling",
        ],
      },
      {
        title: "After launch",
        items: [
          "Monitoring and maintenance plans",
          "Continuous improvement roadmaps",
          "Documentation and team handover",
          "Migration from legacy platforms",
        ],
      },
    ],
    process: [
      {
        name: "Discovery",
        description:
          "Business goals, users, content and technical constraints — scoped into a written plan.",
      },
      {
        name: "UX & design",
        description:
          "Information architecture, wireframes and a design system-level visual language.",
      },
      {
        name: "Development",
        description: "Typed, tested implementation in vertical slices you can review weekly.",
      },
      {
        name: "Integration & QA",
        description:
          "CMS, APIs, analytics and payments connected; performance and accessibility verified.",
      },
      {
        name: "Launch & iterate",
        description:
          "Zero-downtime deployment, then measured improvements against real usage data.",
      },
    ],
    faqs: WEB_FAQS,
    ctaLabel: "Book a Free Discovery Call",
    ctaHref: "/book",
    secondaryCtaLabel: "Get a Free Website Audit",
    secondaryCtaHref: "/contact",
  },
  {
    slug: "mobile-app-development",
    name: "Mobile App Development",
    tagline: "Android and iOS applications designed and engineered for real-world business use.",
    headline: "Android & iOS apps your customers actually keep",
    subheadline:
      "We design, build and ship mobile applications for Android and iOS — cross-platform where it wins, native where it matters, always engineered around real usage.",
    metaTitle: "Mobile App Development — Android & iOS Applications",
    metaDescription:
      "Ibtatech designs and builds Android and iOS apps with React Native and Flutter — API integration, payments, push notifications, and app store deployment.",
    problems: [
      "Customers expect an app but you only have a mobile website",
      "An existing app with poor ratings, crashes or an abandoned codebase",
      "Field teams forced through clunky web forms on phones",
      "A product idea that needs to be validated in real users' hands",
    ],
    capabilities: [
      {
        title: "Platforms",
        items: [
          "Android — phones and tablets, Google Play deployment",
          "iOS — iPhone and iPad, App Store deployment",
          "Cross-platform with React Native or Flutter",
          "Native development where the use case demands it",
        ],
      },
      {
        title: "Product engineering",
        items: [
          "Authentication and secure token storage",
          "API integration and offline-first data handling",
          "Push notifications and deep linking",
          "In-app payments and subscriptions",
        ],
      },
      {
        title: "Quality & release",
        items: [
          "Native-feeling UI on both platforms",
          "Automated testing and crash monitoring",
          "Analytics and product usage instrumentation",
          "Phased store rollouts and release management",
        ],
      },
      {
        title: "After launch",
        items: [
          "OS-update maintenance and dependency upgrades",
          "Feature roadmaps and A/B iterations",
          "Store listing optimisation",
          "Legacy app rescue and audits",
        ],
      },
    ],
    process: [
      {
        name: "Discovery",
        description:
          "Users, platforms, monetisation and the store strategy — written up as a build plan.",
      },
      {
        name: "UX & prototyping",
        description: "Platform-appropriate flows tested as clickable prototypes before code.",
      },
      {
        name: "Development",
        description: "Bi-weekly builds you can install on your own device from day one.",
      },
      {
        name: "Testing & hardening",
        description: "Real-device QA, performance profiling, security review.",
      },
      {
        name: "Launch & operate",
        description: "Store submission, phased rollout, crash monitoring and iteration.",
      },
    ],
    faqs: MOBILE_FAQS,
    ctaLabel: "Discuss Your App Idea",
    ctaHref: "/book",
    secondaryCtaLabel: "Start a Project",
    secondaryCtaHref: "/contact",
  },
  {
    slug: "email-marketing",
    name: "Email Marketing & Automation",
    tagline: "Automated customer journeys that nurture, convert and retain customers.",
    headline: "Customer journeys that work while you sleep",
    subheadline:
      "Lifecycle strategy, automated flows and campaigns that turn subscribers into customers and customers into repeat revenue — measured properly, in your CRM.",
    metaTitle: "Email Marketing & Automation — Lifecycle Programmes",
    metaDescription:
      "Ibtatech builds email marketing programmes that convert: welcome flows, lead nurturing, abandoned-cart recovery, segmentation and CRM integration.",
    problems: [
      "A subscriber list that generates almost no revenue",
      "Manual one-off sends with no lifecycle logic",
      "Leads going cold because nobody follows up systematically",
      "Abandoned carts and lapsing customers left unaddressed",
    ],
    capabilities: [
      {
        title: "Strategy",
        items: [
          "Lifecycle and customer-journey mapping",
          "Campaign and flow planning against revenue targets",
          "Deliverability and list-hygiene foundations",
          "Consent, GDPR and preference management",
        ],
      },
      {
        title: "Automation",
        items: [
          "Welcome and onboarding sequences",
          "Abandoned-cart and abandoned-application recovery",
          "Win-back and retention campaigns",
          "Transactional email done properly",
        ],
      },
      {
        title: "Targeting & personalisation",
        items: [
          "Segmentation by behaviour, value and lifecycle stage",
          "Dynamic content and personalisation rules",
          "Lead scoring and nurture logic",
          "CRM and e-commerce platform integration",
        ],
      },
      {
        title: "Measurement",
        items: [
          "Revenue-per-recipient and flow attribution reporting",
          "A/B testing programmes",
          "Dashboards your team actually reads",
          "Continuous optimisation cadence",
        ],
      },
    ],
    process: [
      {
        name: "Audit",
        description:
          "Current list, flows, deliverability and revenue data — honest assessment of what to keep.",
      },
      {
        name: "Journey design",
        description: "Lifecycle map with every automated flow, trigger and message planned.",
      },
      {
        name: "Build & integrate",
        description: "Flows, templates, segmentation and CRM/e-commerce connections implemented.",
      },
      {
        name: "Test & launch",
        description: "Deliverability testing, seed reviews, controlled go-live.",
      },
      {
        name: "Optimise",
        description: "Monthly test calendar, reporting and iteration against revenue KPIs.",
      },
    ],
    faqs: EMAIL_FAQS,
    ctaLabel: "Book a Free Discovery Call",
    ctaHref: "/book",
    secondaryCtaLabel: "Talk to an Expert",
    secondaryCtaHref: "/contact",
  },
  {
    slug: "paid-advertising",
    name: "Paid Advertising",
    tagline: "Performance-focused campaigns designed around measurable acquisition.",
    headline: "Paid acquisition built on verified data",
    subheadline:
      "Google Ads and Meta campaigns engineered around tracking you can trust, landing pages that convert, and honest reporting — never guaranteed results.",
    metaTitle: "Paid Advertising — Google Ads & Meta Campaigns",
    metaDescription:
      "Ibtatech runs Google Ads and Meta campaigns with rigorous conversion tracking, optimised landing pages and transparent reporting. No guaranteed-result promises.",
    problems: [
      "Ad spend that nobody can connect to actual revenue",
      "Agencies reporting on clicks and impressions instead of pipeline",
      "Campaigns sending traffic to slow, unfocused pages",
      "Tracking broken by consent rules, iOS changes or bad setup",
    ],
    capabilities: [
      {
        title: "Channels",
        items: [
          "Google Ads — Search, Shopping, Performance Max",
          "Meta Ads — Facebook and Instagram",
          "YouTube and display where justified",
          "Microsoft Advertising for B2B search",
        ],
      },
      {
        title: "Foundations",
        items: [
          "Conversion tracking and server-side tagging",
          "Consent-aware measurement (GDPR/UK)",
          "Landing page strategy and build",
          "Feed and catalogue health for e-commerce",
        ],
      },
      {
        title: "Optimisation",
        items: [
          "Audience and keyword strategy",
          "Retargeting and lifecycle-aligned campaigns",
          "Creative testing frameworks",
          "Bid and budget management against CPA targets",
        ],
      },
      {
        title: "Reporting",
        items: [
          "Pipeline and revenue-connected dashboards",
          "Weekly performance summaries",
          "Monthly strategy reviews",
          "Full account ownership stays with you",
        ],
      },
    ],
    process: [
      {
        name: "Audit",
        description: "Account structure, tracking, spend efficiency and quick-win identification.",
      },
      {
        name: "Tracking first",
        description:
          "Server-side conversion measurement and consent handling before scaling spend.",
      },
      {
        name: "Campaign build",
        description: "Structure, audiences, creative and landing pages built to convert.",
      },
      {
        name: "Launch & learn",
        description: "Controlled budgets, clean experiments, fast creative iteration.",
      },
      {
        name: "Scale & report",
        description: "Budget shifted to what verifiably works, reported against your KPIs.",
      },
    ],
    faqs: ADS_FAQS,
    ctaLabel: "Book a Free Discovery Call",
    ctaHref: "/book",
    secondaryCtaLabel: "Get an Ad Account Audit",
    secondaryCtaHref: "/contact",
  },
];

/** Budget bands shown on contact/estimator surfaces — indicative only, never fixed prices. */
export const BUDGET_BANDS: ReadonlyArray<{ value: BudgetBand; label: string }> = [
  { value: "under-5k", label: "Under £5k" },
  { value: "5k-15k", label: "£5k – £15k" },
  { value: "15k-50k", label: "£15k – £50k" },
  { value: "50k-100k", label: "£50k – £100k" },
  { value: "100k-plus", label: "£100k+" },
  { value: "not-sure", label: "Not sure yet" },
];

export function getService(slug: ServiceSlug): ServiceContent {
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) throw new Error(`Unknown service: ${slug}`);
  return service;
}
