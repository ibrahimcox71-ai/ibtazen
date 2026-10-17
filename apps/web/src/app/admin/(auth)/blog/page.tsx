import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  canAccessCrm,
  listBlogPostsForActor,
  parseBlogTags,
  type BlogPostWithCreator,
} from "@ibtatech/leads";
import { BLOG_STATUS_LABELS, BLOG_STATUS_TONES } from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { BlogDeleteButton } from "./blog-delete-button";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export default async function AdminBlogPage() {
  const user = await requireUser("/admin/blog");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Blog</h1>
        <ErrorState title="Not authorized" description="The blog registry requires CRM access." />
      </div>
    );
  }

  let posts: BlogPostWithCreator[] | null = null;
  let failed = false;
  try {
    const result = await listBlogPostsForActor(user);
    if (result.ok) posts = result.posts;
  } catch {
    failed = true;
  }

  if (!posts) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Blog</h1>
        <ErrorState
          title="Could not load posts"
          description={
            failed ? "The database query failed. Try again." : "The registry requires CRM access."
          }
        />
      </div>
    );
  }

  const publishedCount = posts.filter((post) => post.status === "PUBLISHED").length;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Blog</h1>
        <p className="text-sm text-text-secondary">
          {posts.length} post{posts.length === 1 ? "" : "s"} · {publishedCount} published on /blog
        </p>
      </div>

      <div>
        <ButtonLink href="/admin/blog/new" data-testid="new-blog-post">
          <Plus aria-hidden className="size-4" />
          New post
        </ButtonLink>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Publish the first article to open /blog for readers and answer engines."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[840px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tags
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Published
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Updated
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {posts.map((post) => {
                    const tags = parseBlogTags(post.tags);
                    return (
                      <tr
                        key={post.id}
                        className="hover:bg-surface-sunken/60"
                        data-testid="blog-row"
                      >
                        <td
                          className="px-4 py-3 font-medium text-text"
                          data-testid="blog-title-cell"
                        >
                          {post.title}
                          <span className="text-xs font-normal block text-text-muted">
                            /blog/{post.slug}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={BLOG_STATUS_TONES[post.status] ?? "neutral"}
                            data-testid="blog-status-badge"
                          >
                            {BLOG_STATUS_LABELS[post.status] ?? post.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {tags.length > 0 ? tags.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                          {post.publishedAt ? dateFormat.format(post.publishedAt) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                          {dateFormat.format(post.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="gap-4 flex flex-wrap items-center">
                            <Link
                              href={`/admin/blog/${post.id}`}
                              className={cn(
                                "min-h-11 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                                focusRing,
                              )}
                              data-testid="blog-edit-link"
                            >
                              Edit
                            </Link>
                            <BlogDeleteButton postId={post.id} title={post.title} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {posts.map((post) => (
              <li key={post.id} data-testid="blog-row">
                <Card>
                  <div className="gap-3 p-4 flex flex-col">
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-text" data-testid="blog-title-cell">
                          {post.title}
                        </p>
                        <p className="text-xs truncate text-text-muted">/blog/{post.slug}</p>
                      </div>
                      <Badge
                        tone={BLOG_STATUS_TONES[post.status] ?? "neutral"}
                        data-testid="blog-status-badge"
                      >
                        {BLOG_STATUS_LABELS[post.status] ?? post.status}
                      </Badge>
                    </div>
                    <div className="gap-4 flex flex-wrap items-center">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className={cn(
                          "min-h-11 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                          focusRing,
                        )}
                        data-testid="blog-edit-link"
                      >
                        Edit
                      </Link>
                      <BlogDeleteButton postId={post.id} title={post.title} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
