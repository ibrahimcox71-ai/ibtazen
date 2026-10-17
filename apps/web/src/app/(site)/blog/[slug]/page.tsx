import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { Breadcrumbs, CTASection, JsonLd, PageHero, Section } from "@ibtatech/ui";
import { OG_IMAGE, articleSchema, breadcrumbSchema } from "@ibtatech/config";
import { cn, focusRing } from "@ibtatech/utils";
import { blogVideoEmbedSrc, getPublishedBlogPostBySlug } from "@ibtatech/leads";
import { blogImageUrl } from "@/lib/blog-image";
import { clampText } from "@/lib/blog/markdown";
import { BlogContent } from "../blog-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Published posts can change in the CRM — refresh on the same window as `/`. */
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  // Unknown / unpublished slugs render 404 — keep them out of the index.
  if (!post) return { robots: { index: false, follow: false } };

  const title = `${post.title} - Ibtatech blog`;
  const description = clampText(post.excerpt);
  const url = `/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const url = `/blog/${post.slug}`;
  const summary = clampText(post.excerpt);
  const cover = blogImageUrl(post.imagePath);
  const embedSrc = blogVideoEmbedSrc(post.videoEmbedUrl);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];
  const published = post.publishedAt ?? post.updatedAt;
  const editedAfterPublish =
    post.publishedAt !== null && post.updatedAt.getTime() > post.publishedAt.getTime();

  return (
    <>
      <JsonLd
        data={articleSchema(url, {
          title: post.title,
          description: summary,
          publishedAt: post.publishedAt,
          modifiedAt: post.updatedAt,
          tags: post.tags,
        })}
      />
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={crumbs} />
      </div>

      <PageHero
        eyebrow={post.tags[0] ?? "Insights"}
        title={post.title}
        description={summary}
        primaryCta={{ label: "Discuss a project", href: "/contact" }}
        secondaryCta={{ label: "All articles", href: "/blog" }}
      />

      <Section ariaLabel="Article">
        <article className="max-w-3xl gap-6 flex flex-col">
          {cover && (
            <figure className="relative aspect-[2/1] overflow-hidden rounded-xl border border-border-subtle">
              <Image
                src={cover}
                alt={post.imageAlt ?? post.title}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
                unoptimized
              />
            </figure>
          )}

          {embedSrc && (
            <div className="aspect-video relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken">
              <iframe
                src={embedSrc}
                title={`${post.title} - video`}
                className="inset-0 absolute h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
                data-testid="blog-video"
              />
            </div>
          )}

          <p className="gap-4 text-sm flex flex-wrap items-center text-text-muted">
            <time dateTime={published.toISOString()}>{dateFormat.format(published)}</time>
            <span className="gap-1 inline-flex items-center">
              <Clock aria-hidden className="size-3.5" />
              {post.readingMinutes} min read
            </span>
            {editedAfterPublish && <span>· updated {dateFormat.format(post.updatedAt)}</span>}
          </p>

          <BlogContent markdown={post.content} />

          {post.tags.length > 0 && (
            <ul className="gap-2 pt-2 flex flex-wrap border-t border-border-subtle">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-full border border-border-subtle bg-surface-sunken text-text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <p>
            <Link
              href="/blog"
              className={cn(
                "gap-2 text-sm font-medium inline-flex items-center text-accent",
                focusRing,
              )}
            >
              Back to all articles
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </p>
        </article>
      </Section>

      <CTASection
        title="Want results like these?"
        description="Tell us where you want the business to go. We'll map the shortest technical route."
        primaryLabel="Discuss a project"
        primaryHref="/contact"
        secondaryLabel="Get a Project Estimate"
        secondaryHref="/estimate"
      />
    </>
  );
}
