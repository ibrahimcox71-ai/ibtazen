import { SITE } from "./site";
import { MEASUREMENT_TOOLS } from "./site-content";
import { SERVICES, type ServiceContent, type ServiceFaq } from "./services";

/**
 * SEO / AEO / GEO helpers — structured data builders and metadata factory.
 * Only factually grounded schema is emitted; no invented awards or ratings.
 */

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Default social-share card — 1200×630 PNG at `apps/web/public/og-image.png`.
 * Every page that declares its own `openGraph` replaces the inherited one
 * outright (Next.js merges metadata key-by-key, not deep), so each of those
 * blocks has to carry `images: [OG_IMAGE]` itself. Pages that inherit, and
 * Twitter cards that do not override `images`, fall back to this same asset.
 */
export const OG_IMAGE = {
  url: absoluteUrl("/og-image.png"),
  width: 1200,
  height: 630,
  alt: `${SITE.name} — Web, Mobile, Email Automation & Paid Ads`,
};

/** Organization + ProfessionalService — entity anchor for AI/search engines. */
export interface OrganizationPerson {
  name: string;
  role: string;
  bio?: string | null;
  photoUrl: string;
  linkedinUrl?: string | null;
}

export function organizationSchema(teamMembers: readonly OrganizationPerson[] = []) {
  const people = teamMembers.filter(
    (person) => person.name.trim() && person.role.trim() && person.photoUrl,
  );
  const personSchema = (person: OrganizationPerson) => ({
    "@type": "Person",
    name: person.name,
    jobTitle: person.role,
    ...(person.bio ? { description: person.bio } : {}),
    image: new URL(person.photoUrl, SITE.url).toString(),
    ...(person.linkedinUrl ? { sameAs: [person.linkedinUrl] } : {}),
  });
  const founders = people.filter((person) => /founder/i.test(person.role)).map(personSchema);
  const employees = people.filter((person) => !/founder/i.test(person.role)).map(personSchema);
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    email: SITE.email,
    description: SITE.description,
    areaServed: ["United Kingdom", "Europe", "International"],
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
      // Street address and region are legal placeholders pending real data.
    },
    knowsAbout: [
      ...SERVICES.map((service) => service.name),
      ...MEASUREMENT_TOOLS.map(
        (tool) => `${tool.name}: tracks ${tool.track} Reports ${tool.report}`,
      ),
    ],
    ...(founders.length ? { founder: founders.length === 1 ? founders[0] : founders } : {}),
    ...(employees.length ? { employee: employees.length === 1 ? employees[0] : employees } : {}),
    makesOffer: SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.tagline,
        url: absoluteUrl(serviceHref(service.slug)),
      },
    })),
  };
}

/** WebSite node with the Organization as publisher. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
  };
}

export function serviceHref(slug: ServiceContent["slug"]): string {
  return `/services/${slug}`;
}

/** Service schema for a pillar page, linked to the Organization. */
export function serviceSchema(service: ServiceContent) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": absoluteUrl(`${serviceHref(service.slug)}#service`),
    name: service.name,
    description: service.metaDescription,
    url: absoluteUrl(serviceHref(service.slug)),
    provider: { "@id": absoluteUrl("/#organization") },
    areaServed: ["United Kingdom", "Europe", "International"],
  };
}

/** WebPage node — binds a URL to the site and organization. */
export function webPageSchema(path: string, name: string, description?: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl(`${path}#webpage`),
    url: absoluteUrl(path),
    name,
    description,
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
  };
}

/** BreadcrumbList matching the visual breadcrumbs exactly. */
export function breadcrumbSchema(items: Array<{ label: string; href?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

/** FAQPage schema — emitted only where genuinely applicable FAQs render. */
export function faqPageSchema(faqs: readonly ServiceFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * BlogPosting schema — emitted only for published `/blog` articles. Dates are
 * the stored publish/edit stamps, never "now", so search engines see a
 * stable publication history.
 */
export function articleSchema(
  path: string,
  post: {
    title: string;
    description: string;
    publishedAt?: Date | null;
    modifiedAt?: Date | null;
    tags?: readonly string[];
  },
) {
  const published = post.publishedAt ?? null;
  const modified = post.modifiedAt ?? published;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": absoluteUrl(`${path}#article`),
    headline: post.title,
    description: post.description,
    url: absoluteUrl(path),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
    ...(published ? { datePublished: published.toISOString() } : {}),
    ...(modified ? { dateModified: modified.toISOString() } : {}),
    author: { "@type": "Organization", "@id": absoluteUrl("/#organization"), name: SITE.name },
    publisher: { "@id": absoluteUrl("/#organization") },
    articleSection: "Blog",
    ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
    inLanguage: "en",
  };
}
