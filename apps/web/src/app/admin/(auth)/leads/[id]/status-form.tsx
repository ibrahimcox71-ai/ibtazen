"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, FieldSelect } from "@ibtatech/ui";
import { updateLeadStatusAction, type StatusChangeResult } from "@/lib/admin/actions";

const initial: StatusChangeResult | null = null;

const STATUS_MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to change lead status.",
  not_found: "That lead no longer exists.",
  invalid_status: "Unknown status value.",
  invalid_transition: "That status change is not allowed from the current status.",
};

export function StatusForm({
  leadId,
  currentStatus,
  allowedNext,
  statusOptions,
}: {
  leadId: string;
  currentStatus: string;
  allowedNext: ReadonlyArray<{ value: string; label: string }>;
  statusOptions: ReadonlyArray<{ value: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState<StatusChangeResult | null, FormData>(
    async (_prev, formData) => {
      const toStatus = String(formData.get("toStatus") ?? "");
      return updateLeadStatusAction(leadId, toStatus);
    },
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const errorMessage =
    state && !state.ok ? (STATUS_MESSAGES[state.error] ?? "Could not update status.") : null;

  return (
    <form ref={formRef} action={formAction} className="gap-3 flex flex-col">
      <FieldSelect
        label="Current status"
        name="toStatus"
        options={
          allowedNext.length > 0
            ? statusOptions.filter(
                (option) =>
                  option.value === currentStatus ||
                  allowedNext.some((next) => next.value === option.value),
              )
            : [
                {
                  value: currentStatus,
                  label:
                    statusOptions.find((o) => o.value === currentStatus)?.label ?? currentStatus,
                },
              ]
        }
        defaultValue={allowedNext[0]?.value ?? currentStatus}
        disabled={allowedNext.length === 0}
        hint={
          allowedNext.length === 0
            ? "Terminal status — no further transitions."
            : "Only valid pipeline transitions are listed."
        }
      />
      {errorMessage && (
        <Alert tone="danger" title="Status not updated">
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <Alert tone="success" title="Status updated">
          Lead is now “{state.status}”.
        </Alert>
      )}
      <Button
        type="submit"
        loading={pending}
        disabled={allowedNext.length === 0}
        className="self-start"
      >
        Update status
      </Button>
    </form>
  );
}
