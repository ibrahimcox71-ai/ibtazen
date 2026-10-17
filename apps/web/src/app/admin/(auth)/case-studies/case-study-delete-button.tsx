"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@ibtatech/ui";
import type { CaseStudyDeleteResult } from "@ibtatech/leads";
import { deleteCaseStudyAction } from "@/lib/admin/actions";

/** Server error codes → the one sentence the operator should see. */
const MESSAGES: Record<string, string> = {
  unauthorized: "Only CRM users with write access can delete case studies.",
  not_found: "That case study no longer exists.",
  invalid: "The case study could not be deleted.",
  slot_taken: "The case study could not be deleted.",
  slug_taken: "The case study could not be deleted.",
};

type CaseStudyDeleteButtonProps = {
  caseStudyId: string;
  /** Shown in the confirmation copy so the operator knows which story is at stake. */
  title: string;
  size?: "sm" | "md";
};

/**
 * Destructive submit with an explicit confirm step. The server action is the
 * authority (RBAC + existence); on success the router leaves the surface the
 * deleted row used to own, so neither the registry nor the edit page keeps a
 * stale link.
 */
export function CaseStudyDeleteButton({
  caseStudyId,
  title,
  size = "sm",
}: CaseStudyDeleteButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CaseStudyDeleteResult | null, FormData>(
    async (_prev, _formData) => deleteCaseStudyAction(caseStudyId),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push("/admin/case-studies");
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
        data-testid="case-study-delete-form"
      >
        <Button
          type="submit"
          variant="danger"
          size={size}
          loading={pending}
          data-testid="case-study-delete"
        >
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </form>
      {failure && (
        <Alert tone="danger" title="Case study not deleted">
          {failure}
        </Alert>
      )}
    </div>
  );
}
