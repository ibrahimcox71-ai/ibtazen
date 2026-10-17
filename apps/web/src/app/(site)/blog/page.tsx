import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import {
  Breadcrumbs,
  CTASection,
  JsonLd,
  PageHero,
  Section,
  StaggerGroup,
  StaggerItem,
} from "@ibtatech/ui";
import { OG_IMAGE, breadcrumbSchema, webPageSchema } from "@ibtatech/config";
import { cn, focusRing } from "@ibtatech/utils";
import { listPublishedBlogPosts } from "@ibtatech/leads";
import { blogImageUrl } from "@/lib/blog-image";

/** Published posts are edited in the CRM — refresh on the same window as `/`. */
export const revalidate = 60;

const TITLE = "Blog - Ibtatech";
const DESCRIPTION =
  "Practical notes on web, mobile, growth and the engineering behind both — written by the team that ships it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/blog",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const CRUMBS = [{ label: "Home", href: "/" }, { label: "Blog" }];

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

export default async function BlogPage() {
  const posts = await listPublishedBlogPosts();

  return (
    <>
      <JsonLd data={webPageSchema("/blog", "Blog", DESCRIPTION)} />
      <JsonLd data={breadcrumbSchema(CRUMBS)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={CRUMBS} />
      </div>

      <PageHero
        eyebrow="Insights"
        title="Blog"
        description="What we learn shipping websites, apps and growth systems — written for the people who have to make the next call."
        primaryCta={{ label: "Discuss a project", href: "/contact" }}
        secondaryCta={{ label: "All case studies", href: "/case-studies" }}
      />

      <Section ariaLabel="Articles">
        {posts.length === 0 ? (
          <div className="max-w-2xl gap-4 flex flex-col">
            <h2 className="font-semibold font-display text-title">Nothing published yet</h2>
            <p className="text-sm leading-relaxed text-text-secondary">
              Articles go live once they have been reviewed for accuracy. In the meantime, our{" "}
              <Link
                href="/case-studies"
                className={cn(
                  "font-medium text-accent underline-offset-2 hover:underline",
                  focusRing,
                )}
              >
                case studies
              </Link>{" "}
              cover the same work with client-approved numbers.
            </p>
            <Link
              href="/contact"
              className={cn(
                "gap-2 text-sm font-medium inline-flex items-center text-accent",
                focusRing,
              )}
            >
              Talk to us about relevant work
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        ) : (
          <StaggerGroup className="gap-5 sm:grid-cols-2 lg:grid-cols-3 grid">
            {posts.map((post) => {
              const cover = blogImageUrl(post.imagePath);
              return (
                <StaggerItem key={post.id} className="h-full">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group gap-4 p-6 flex h-full flex-col rounded-xl border border-border-subtle bg-surface transition-colors hover:bg-surface-sunken"
                    data-testid="blog-card"
                  >
                    {cover && (
                      <div className="relative aspect-[2/1] overflow-hidden rounded-md border border-border-subtle">
                        <Image
                          src={cover}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="gap-2 flex flex-wrap">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full border border-border-subtle bg-surface-sunken text-text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold font-display text-text transition-colors group-hover:text-accent">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed line-clamp-4 text-text-secondary">
                        {post.excerpt}
                      </p>
                    </div>
                    <p className="gap-3 text-xs mt-auto flex items-center text-text-muted">
                      <span>
                        {post.publishedAt ? dateFormat.format(post.publishedAt) : "Published"}
                      </span>
                      <span className="gap-1 inline-flex items-center">
                        <Clock aria-hidden className="size-3.5" />
                        {post.readingMinutes} min read
                      </span>
                    </p>
                    <span className="gap-2 text-sm font-medium inline-flex items-center text-accent">
                      Read the article
                      <ArrowRight
                        aria-hidden
                        className="size-4 group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </Section>

      <CTASection
        title="Want us to solve a problem like this?"
        description="Tell us where you want the business to go. We'll map the shortest technical route."
        primaryLabel="Discuss a project"
        primaryHref="/contact"
        secondaryLabel="Get a Project Estimate"
        secondaryHref="/estimate"
      />
    </>
  );
}
