"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, Field, FieldSelect, FieldTextArea } from "@ibtatech/ui";
import { createFollowUpAction, type FollowUpResult } from "@/lib/admin/actions";

const initial: FollowUpResult | null = null;

const FOLLOW_UP_MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage follow-ups.",
  not_found: "That lead no longer exists.",
  invalid: "Follow-up could not be saved.",
  invalid_assignee: "That person cannot receive follow-ups.",
  invalid_due_date: "Enter a valid due date (YYYY-MM-DD).",
};

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function FollowUpForm({
  leadId,
  assignees,
  defaultAssigneeId,
}: {
  leadId: string;
  assignees: ReadonlyArray<{ id: string; name: string; email: string }>;
  defaultAssigneeId: string | null;
}) {
  const [state, formAction, pending] = useActionState<FollowUpResult | null, FormData>(
    async (_prev, formData) => createFollowUpAction(leadId, formData),
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const errorMessage =
    state && !state.ok
      ? (state.message ?? FOLLOW_UP_MESSAGES[state.error] ?? "Could not save follow-up.")
      : null;

  const options = [
    { value: "", label: "Same as lead assignee" },
    ...assignees.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
  ];

  return (
    <form ref={formRef} action={formAction} className="gap-3 flex flex-col">
      <Field
        label="Title"
        name="title"
        maxLength={200}
        placeholder="Call back about proposal"
        required
      />
      <FieldTextArea
        label="Details"
        name="body"
        rows={2}
        maxLength={2000}
        placeholder="Optional context for the owner…"
        labelSuffix="(optional)"
      />
      <div className="gap-3 sm:grid-cols-2 grid">
        <Field
          label="Due date"
          name="dueDate"
          type="date"
          defaultValue={defaultDueDate()}
          required
        />
        <FieldSelect
          label="Assignee"
          name="assigneeId"
          options={options}
          defaultValue={defaultAssigneeId ?? ""}
          hint="Defaults to the lead owner when left as-is."
        />
      </div>
      {errorMessage && (
        <Alert tone="danger" title="Follow-up not saved">
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <Alert tone="success" title="Follow-up created">
          “{state.followUp.title}” is due {state.followUp.dueDate}.
        </Alert>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Add follow-up
      </Button>
    </form>
  );
}
