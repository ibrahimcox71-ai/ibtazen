"use client";

import { useTransition } from "react";
import { Button } from "@ibtatech/ui";
import { completeFollowUpAction } from "@/lib/admin/actions";

export function FollowUpCompleteButton({
  leadId,
  followUpId,
  completed,
}: {
  leadId: string;
  followUpId: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={completed ? "secondary" : "primary"}
      size="sm"
      loading={pending}
      onClick={() => {
        startTransition(async () => {
          await completeFollowUpAction(leadId, followUpId, !completed);
        });
      }}
    >
      {completed ? "Reopen" : "Mark done"}
    </Button>
  );
}
