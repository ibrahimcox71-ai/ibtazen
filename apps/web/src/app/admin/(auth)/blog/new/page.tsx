import type { Metadata } from "next";
import { requireUser } from "@/lib/admin/session";
import { canAccessCrm } from "@ibtatech/leads";
import { ErrorState } from "@ibtatech/ui";
import { BlogPostForm } from "../blog-post-form";

export const metadata: Metadata = {
  title: "New blog post",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  const user = await requireUser("/admin/blog/new");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">New blog post</h1>
        <ErrorState title="Not authorized" description="Managing blog posts requires CRM access." />
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">New blog post</h1>
        <p className="text-sm text-text-secondary">
          Drafts stay in the CRM. Only published posts appear on /blog, in the sitemap and in the
          RSS feed.
        </p>
      </div>
      <BlogPostForm mode="create" />
    </div>
  );
}
