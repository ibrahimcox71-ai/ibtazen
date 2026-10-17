"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, FieldTextArea } from "@ibtatech/ui";
import { addLeadNoteAction, type NoteResult } from "@/lib/admin/actions";

const initial: NoteResult | null = null;

export function NotesForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<NoteResult | null, FormData>(
    async (_prev, formData) => {
      const body = String(formData.get("body") ?? "");
      return addLeadNoteAction(leadId, body);
    },
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const error =
    state && !state.ok
      ? (state.message ??
        (state.error === "unauthorized"
          ? "You are not allowed to add notes."
          : state.error === "not_found"
            ? "That lead no longer exists."
            : "Note could not be saved."))
      : null;

  return (
    <form ref={formRef} action={formAction} className="gap-3 flex flex-col">
      <FieldTextArea
        label="New internal note"
        name="body"
        rows={3}
        maxLength={2000}
        placeholder="Visible only to CRM operators…"
        hint="Max 2000 characters. Stored with your author identity."
        error={error ?? undefined}
        required
      />
      {state?.ok && (
        <Alert tone="success" title="Note added">
          Saved as {state.note.author.name}.
        </Alert>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Add note
      </Button>
    </form>
  );
}
