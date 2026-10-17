"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ibtatech/ui";
import { deleteTeamMemberAction } from "@/lib/admin/actions";

export function DeleteTeamMemberButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="gap-2 flex items-center">
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete ${name}'s profile?`)) return;
          setError("");
          startTransition(async () => {
            const result = await deleteTeamMemberAction(id);
            if (!result.ok) setError("Could not delete profile.");
            else router.refresh();
          });
        }}
      >
        Delete
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
