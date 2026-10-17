import type { Metadata } from "next";
import Link from "next/link";
import { canAccessCrm, getBlogPostForActor, parseBlogTags } from "@ibtatech/leads";
import { Card, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { requireUser } from "@/lib/admin/session";
import { BlogDeleteButton } from "../blog-delete-button";
import { BlogPostForm } from "../blog-post-form";

export const metadata: Metadata = {
  title: "Edit blog post",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/admin/blog/${id}`);

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Edit blog post</h1>
        <ErrorState title="Not authorized" description="Managing blog posts requires CRM access." />
      </div>
    );
  }

  let post: Awaited<ReturnType<typeof getBlogPostForActor>> | null = null;
  let failed = false;
  try {
    post = await getBlogPostForActor(user, id);
  } catch {
    failed = true;
  }

  if (failed || !post?.ok) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Edit blog post</h1>
        <ErrorState
          title={failed ? "Could not load post" : "Blog post not found"}
          description={
            failed
              ? "The database query failed. Try again."
              : "That post does not exist (or the link is stale)."
          }
        />
        <Link
          href="/admin/blog"
          className={cn(
            "text-sm font-medium self-start text-accent underline-offset-2 hover:underline",
            focusRing,
          )}
        >
          Back to blog
        </Link>
      </div>
    );
  }

  const row = post.post;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">{row.title}</h1>
        <p className="text-sm text-text-secondary">
          {row.status === "PUBLISHED" ? "Published" : "Draft"} · written by {row.createdBy.name} ·
          edited {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(row.updatedAt)}
        </p>
        {row.status === "PUBLISHED" && (
          <p className="text-sm">
            <Link
              href={`/blog/${row.slug}`}
              className={cn(
                "font-medium text-accent underline-offset-2 hover:underline",
                focusRing,
              )}
              target="_blank"
              rel="noreferrer"
            >
              View public page →
            </Link>
          </p>
        )}
      </div>
      <BlogPostForm
        mode="edit"
        blogId={row.id}
        initial={{
          title: row.title,
          slug: row.slug,
          excerpt: row.excerpt,
          content: row.content,
          tags: parseBlogTags(row.tags),
          status: row.status,
          imagePath: row.imagePath,
          imageAlt: row.imageAlt,
          videoEmbedUrl: row.videoEmbedUrl,
        }}
      />
      <Card className="gap-3 flex flex-col">
        <div className="gap-1 flex flex-col">
          <h2 className="font-medium text-text">Delete this post</h2>
          <p className="text-sm text-text-secondary">
            Permanently removes the article, its cover image and its public URL — /blog/{row.slug}{" "}
            stops resolving. This cannot be undone.
          </p>
        </div>
        <BlogDeleteButton postId={row.id} title={row.title} size="md" />
      </Card>
    </div>
  );
}
