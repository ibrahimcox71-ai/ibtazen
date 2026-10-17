import type { MetadataRoute } from "next";
import { SERVICES, absoluteUrl, serviceHref } from "@ibtatech/config";
import { listPublishedBlogPosts, listPublishedCaseStudies } from "@ibtatech/leads";

/** Rebuilt on the same window as the marketing pages, not frozen at build. */
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/services"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    {
      url: absoluteUrl("/case-studies"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.9 },
    { url: absoluteUrl("/audit"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/estimate"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/book"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/cookies"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = SERVICES.map((service) => ({
    url: absoluteUrl(serviceHref(service.slug)),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  // Published stories only — drafts and unpublished slugs stay out of the index.
  const caseStudyRoutes: MetadataRoute.Sitemap = (await listPublishedCaseStudies()).map(
    (study) => ({
      url: absoluteUrl(`/case-studies/${study.slug}`),
      lastModified: study.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  // Published posts only — same rule as the case studies above.
  const blogRoutes: MetadataRoute.Sitemap = (await listPublishedBlogPosts()).map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...serviceRoutes, ...caseStudyRoutes, ...blogRoutes];
}
