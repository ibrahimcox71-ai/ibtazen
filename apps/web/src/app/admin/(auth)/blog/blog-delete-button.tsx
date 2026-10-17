"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@ibtatech/ui";
import type { BlogDeleteResult } from "@ibtatech/leads";
import { deleteBlogPostAction } from "@/lib/admin/actions";

/** Server error codes → the one sentence the operator should see. */
const MESSAGES: Record<string, string> = {
  unauthorized: "Only CRM users with write access can delete posts.",
  not_found: "That post no longer exists.",
  invalid: "The post could not be deleted.",
  slug_taken: "The post could not be deleted.",
};

type BlogDeleteButtonProps = {
  postId: string;
  /** Shown in the confirmation copy so the operator knows which post is at stake. */
  title: string;
  size?: "sm" | "md";
};

/**
 * Destructive submit with an explicit confirm step. The server action is the
 * authority (RBAC + existence); on success the router leaves the surface the
 * deleted row used to own, so neither the registry nor the edit page keeps a
 * stale link.
 */
export function BlogDeleteButton({ postId, title, size = "sm" }: BlogDeleteButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<BlogDeleteResult | null, FormData>(
    async (_prev, _formData) => deleteBlogPostAction(postId),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push("/admin/blog");
      router.refresh();
    }
  }, [state, router]);

  const failure = state && !state.ok ? (state.message ?? MESSAGES[state.error]) : null;

  return (
    <div className="gap-2 flex flex-col">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) event.preventDefault();
        }}
        data-testid="blog-delete-form"
      >
        <Button
          type="submit"
          variant="danger"
          size={size}
          loading={pending}
          data-testid="blog-delete"
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </form>
      {failure && (
        <Alert tone="danger" title="Post not deleted">
          {failure}
        </Alert>
      )}
    </div>
  );
}
