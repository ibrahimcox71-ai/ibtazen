"use client";

import { useState, useTransition } from "react";
import { Alert, Badge, Button, Field, FieldTextArea } from "@ibtatech/ui";
import {
  changeProjectStatusAction,
  createProjectFromContractAction,
  type ProjectResult,
} from "@/lib/admin/actions";
import { PROJECT_STATUS_LABELS } from "@/lib/admin/labels";

const MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage projects.",
  not_found: "That client or contract no longer exists.",
  invalid_status: "Only an active contract can open a project.",
  already_exists: "A project already exists for this contract.",
  invalid_transition: "That project status change is not allowed.",
  invalid: "Could not complete this project action.",
};

/**
 * Create-project form shown only when the contract is active and has no
 * project yet. Submits ids + presentation fields only — actor, status, and
 * ownership are server-authoritative.
 */
export function CreateProjectCard({
  clientId,
  contractId,
  contractTitle,
}: {
  clientId: string;
  contractId: string;
  contractTitle: string;
}) {
  const [state, setState] = useState<ProjectResult | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not complete this action.")
      : null;

  if (state?.ok) {
    return (
      <Alert tone="success" title="Project created" data-testid="project-created">
        {state.project.name} is now in{" "}
        {PROJECT_STATUS_LABELS[state.project.status] ?? state.project.status}.
      </Alert>
    );
  }

  const submit = (formData: FormData) => {
    if (pending) return;
    startTransition(async () => {
      const result = await createProjectFromContractAction(clientId, contractId, formData);
      setState(result);
    });
  };

  return (
    <form action={submit} className="gap-3 flex flex-col" data-testid="create-project-form">
      <p className="text-sm text-text-secondary">
        Open a delivery project from this active contract. Name and schedule fields are presentation
        only — status starts as Planning on the server.
      </p>
      {errorMessage && (
        <Alert tone="danger" title="Not created" data-testid="project-error">
          {errorMessage}
        </Alert>
      )}
      <Field
        label="Project name"
        name="name"
        required
        defaultValue={contractTitle}
        data-testid="project-name-input"
      />
      <FieldTextArea
        label="Description"
        name="description"
        rows={2}
        data-testid="project-description"
      />
      <div className="gap-3 sm:grid-cols-2 grid grid-cols-1">
        <Field label="Start date" name="startDate" type="date" data-testid="project-start-date" />
        <Field
          label="Target end date"
          name="targetEndDate"
          type="date"
          data-testid="project-target-end-date"
        />
      </div>
      <Button
        type="submit"
        loading={pending}
        disabled={pending}
        className="self-start"
        data-testid="create-project"
      >
        Create Project
      </Button>
    </form>
  );
}

/**
 * Explicit status actions for a project row. Only valid next transitions
 * are offered; the server remains authoritative.
 */
export function ProjectStatusActions({
  projectId,
  currentStatus,
  allowedNext,
}: {
  projectId: string;
  currentStatus: string;
  allowedNext: readonly string[];
}) {
  const [state, setState] = useState<ProjectResult | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not complete this action.")
      : null;

  const transition = (to: string) => {
    if (pending) return;
    startTransition(async () => {
      const result = await changeProjectStatusAction(projectId, to);
      setState(result);
    });
  };

  return (
    <div className="gap-2 flex flex-col" data-testid="project-status-actions">
      {errorMessage && (
        <Alert tone="danger" title="Status change failed" data-testid="project-status-error">
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <p className="text-xs text-text-success" data-testid="project-status-ok">
          Status is now {PROJECT_STATUS_LABELS[state.project.status] ?? state.project.status}.
        </p>
      )}
      <div className="gap-2 flex flex-wrap">
        <Badge tone="neutral" data-testid="project-current-status">
          {PROJECT_STATUS_LABELS[currentStatus] ?? currentStatus}
        </Badge>
        {allowedNext.map((to) => (
          <Button
            key={to}
            type="button"
            variant="secondary"
            size="sm"
            loading={pending}
            disabled={pending}
            onClick={() => transition(to)}
            data-testid={`project-status-${to}`}
          >
            {PROJECT_STATUS_LABELS[to] ?? to}
          </Button>
        ))}
      </div>
    </div>
  );
}
