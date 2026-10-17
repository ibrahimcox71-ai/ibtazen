"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, FieldSelect } from "@ibtatech/ui";
import { assignLeadAction, type AssignResult } from "@/lib/admin/actions";

const initial: AssignResult | null = null;

const ASSIGN_MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to assign leads.",
  not_found: "That lead no longer exists.",
  invalid_assignee: "That person cannot receive lead assignments.",
  invalid: "Assignment could not be saved.",
};

export function AssignForm({
  leadId,
  assignees,
  currentAssigneeId,
}: {
  leadId: string;
  assignees: ReadonlyArray<{ id: string; name: string; email: string }>;
  currentAssigneeId: string | null;
}) {
  const [state, formAction, pending] = useActionState<AssignResult | null, FormData>(
    async (_prev, formData) => {
      const assigneeId = String(formData.get("assigneeId") ?? "");
      return assignLeadAction(leadId, assigneeId);
    },
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const errorMessage =
    state && !state.ok ? (ASSIGN_MESSAGES[state.error] ?? "Could not assign lead.") : null;

  const options = [
    { value: "", label: "Unassigned" },
    ...assignees.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.email})`,
    })),
  ];

  return (
    <form ref={formRef} action={formAction} className="gap-3 flex flex-col">
      <FieldSelect
        label="Assigned to"
        name="assigneeId"
        options={options}
        defaultValue={currentAssigneeId ?? ""}
        hint="Admin and staff can own leads. Unassigned leads show on the dashboard."
      />
      {errorMessage && (
        <Alert tone="danger" title="Assignment not saved">
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <Alert tone="success" title="Assignment updated">
          {state.assignedToName
            ? `Now owned by ${state.assignedToName}.`
            : "Lead is now unassigned."}
        </Alert>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Save assignment
      </Button>
    </form>
  );
}
