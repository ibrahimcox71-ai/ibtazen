"use client";

import { useActionState, useId } from "react";
import Image from "next/image";
import { Alert, Button, Field, FieldCheckbox, FieldSelect, FieldTextArea } from "@ibtatech/ui";
import {
  BLOG_MAX_CONTENT,
  BLOG_MAX_EXCERPT,
  BLOG_MAX_IMAGE_ALT,
  BLOG_MAX_TAG,
  BLOG_MAX_TAGS,
  BLOG_MAX_TITLE,
  BLOG_MAX_VIDEO_EMBED_URL,
  BLOG_SLUG_MAX,
} from "@ibtatech/leads/domain";
import { createBlogPostAction, updateBlogPostAction, type BlogResult } from "@/lib/admin/actions";
import { blogImageUrl } from "@/lib/blog-image";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
];

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif";

const MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage blog posts.",
  not_found: "That blog post no longer exists.",
  slug_taken: "Another post already uses that URL slug.",
  invalid: "Blog post could not be saved.",
  partial: "The post was saved, but the image could not be updated.",
};

export function BlogPostForm({
  mode,
  blogId,
  initial,
}: {
  mode: "create" | "edit";
  blogId?: string;
  initial?: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    tags: string[];
    status: string;
    imagePath: string | null;
    imageAlt: string | null;
    videoEmbedUrl: string | null;
  };
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState<BlogResult | null, FormData>(
    async (_prev, formData) =>
      mode === "edit" && blogId
        ? updateBlogPostAction(blogId, formData)
        : createBlogPostAction(formData),
    null,
  );

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not save blog post.")
      : null;

  return (
    <form action={formAction} className="gap-4 flex flex-col" data-testid="blog-form">
      <div className="gap-3 sm:grid-cols-2 grid">
        <Field
          label="Title"
          name="title"
          maxLength={BLOG_MAX_TITLE}
          defaultValue={initial?.title ?? ""}
          placeholder="How we cut checkout drop-off by 38%"
          required
          data-testid="blog-title"
        />
        <FieldSelect
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initial?.status ?? "DRAFT"}
          hint="Only published posts appear on /blog, in the sitemap and the feed."
          required
          data-testid="blog-status"
        />
      </div>
      <Field
        label="URL slug"
        name="slug"
        maxLength={BLOG_SLUG_MAX}
        defaultValue={initial?.slug ?? ""}
        placeholder="checkout-drop-off-case-study"
        hint={
          initial
            ? "Public address: /blog/… — blank keeps the current one, so shared links stay alive."
            : "Public address: /blog/… — blank derives it from the title."
        }
        labelSuffix="(optional)"
        data-testid="blog-slug"
      />
      <FieldTextArea
        label="Excerpt"
        name="excerpt"
        rows={3}
        maxLength={BLOG_MAX_EXCERPT}
        defaultValue={initial?.excerpt ?? ""}
        placeholder="One or two sentences summarising what the reader gets."
        hint={`Used for search results, social cards and the article summary. Max ${BLOG_MAX_EXCERPT} characters.`}
        required
        data-testid="blog-excerpt"
      />
      <FieldTextArea
        label="Content"
        name="content"
        rows={16}
        maxLength={BLOG_MAX_CONTENT}
        defaultValue={initial?.content ?? ""}
        placeholder={[
          "## Why this matters",
          "",
          "Paragraph text with **bold**, *italic*, `code` and [links](/services).",
          "",
          "- A bullet point",
          "- Another bullet point",
          "",
          "> A pull quote",
          "",
          "```ts",
          "const example = true;",
          "```",
        ].join("\n")}
        hint={`Markdown subset: ## / ### headings, paragraphs, - and 1. lists, > quotes, --- rules and fenced code, with **bold**, *italic*, \`code\` and [links](/services). Max ${BLOG_MAX_CONTENT} characters.`}
        required
        data-testid="blog-content"
      />
      <Field
        label="Tags"
        name="tags"
        defaultValue={initial?.tags.join(", ") ?? ""}
        placeholder="cro, checkout, case-study"
        hint={`Comma-separated, up to ${BLOG_MAX_TAGS} tags of ${BLOG_MAX_TAG} characters — shown as chips and in the article schema.`}
        labelSuffix="(optional)"
        data-testid="blog-tags"
      />

      <fieldset className="gap-3 p-4 flex flex-col rounded-lg border border-border-subtle bg-surface-sunken">
        <legend className="px-1 text-sm font-medium text-text">Cover image &amp; video</legend>
        <p className="text-xs text-text-muted">
          Optional. The cover shows on /blog cards and at the top of the article; the video plays
          above the article as a 16:9 embed.
        </p>
        {initial?.imagePath && blogImageUrl(initial.imagePath) && (
          <div className="gap-3 flex items-start">
            <div className="h-20 w-32 relative shrink-0 overflow-hidden rounded-md border border-border-subtle">
              <Image
                src={blogImageUrl(initial.imagePath) ?? ""}
                alt={initial.imageAlt || initial.title}
                fill
                sizes="128px"
                className="object-cover"
                unoptimized
              />
            </div>
            <FieldCheckbox
              label="Remove current image on save"
              name="removeImage"
              data-testid="blog-remove-image"
            />
          </div>
        )}
        <div className="gap-1.5 flex flex-col">
          <label htmlFor={`${formId}-image`} className="text-sm font-medium text-text">
            Upload cover image
          </label>
          <input
            id={`${formId}-image`}
            type="file"
            name="image"
            accept={IMAGE_ACCEPT}
            className="text-sm file:mr-3 file:px-3 file:py-1.5 file:text-xs file:font-medium text-text-secondary file:rounded-md file:border file:border-border-default file:bg-surface file:text-text hover:file:bg-surface-sunken"
            data-testid="blog-image"
          />
          <p className="text-xs text-text-muted">
            Max 5 MB — PNG, JPEG, WebP, AVIF or GIF. Leaving this empty keeps the current cover.
          </p>
        </div>
        <div className="gap-3 sm:grid-cols-2 grid">
          <Field
            label="Image alt text"
            name="imageAlt"
            maxLength={BLOG_MAX_IMAGE_ALT}
            defaultValue={initial?.imageAlt ?? ""}
            placeholder="Rebuilt checkout flow on mobile"
            hint="Describes the image for screen readers. Blank falls back to the title."
            labelSuffix="(optional)"
            data-testid="blog-image-alt"
          />
          <Field
            label="Video (YouTube or Vimeo)"
            name="videoEmbedUrl"
            maxLength={BLOG_MAX_VIDEO_EMBED_URL}
            defaultValue={initial?.videoEmbedUrl ?? ""}
            placeholder="https://www.youtube.com/shorts/…"
            hint="Optional. Full https YouTube/Vimeo link (watch, shorts, live, youtu.be) — saved in the form an iframe can actually play."
            labelSuffix="(optional)"
            data-testid="blog-video-url"
          />
        </div>
      </fieldset>

      {errorMessage && (
        <Alert
          tone="danger"
          title={
            state && !state.ok && state.error === "partial"
              ? "Saved, but the image failed"
              : mode === "edit"
                ? "Not updated"
                : "Not saved"
          }
          data-testid="blog-error"
        >
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <Alert
          tone="success"
          title={mode === "edit" ? "Post updated" : "Post created"}
          data-testid="blog-success"
        >
          “{state.post.title}” is {state.post.status === "PUBLISHED" ? "Published" : "a Draft"}.
          {state.post.status === "PUBLISHED"
            ? ` Public page: /blog/${state.post.slug}`
            : " — publish it to make it public."}
        </Alert>
      )}
      <Button
        type="submit"
        loading={pending}
        disabled={pending}
        className="self-start"
        data-testid="blog-submit"
      >
        {mode === "edit" ? "Save post" : "Create post"}
      </Button>
    </form>
  );
}
