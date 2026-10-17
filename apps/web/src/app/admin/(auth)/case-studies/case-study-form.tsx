"use client";

import { useCallback, useActionState, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Alert, Button, Field, FieldCheckbox, FieldSelect, FieldTextArea } from "@ibtatech/ui";
import {
  BLOG_MAX_VIDEO_EMBED_URL,
  CASE_STUDY_MAX_CLIENT_NAME,
  CASE_STUDY_MAX_DESCRIPTION,
  CASE_STUDY_MAX_IMAGE_ALT,
  CASE_STUDY_MAX_METRICS,
  CASE_STUDY_MAX_METRIC_LABEL,
  CASE_STUDY_MAX_METRIC_VALUE,
  CASE_STUDY_MAX_SORT_ORDER,
  CASE_STUDY_MAX_TITLE,
  CASE_STUDY_SLUG_MAX,
  CASE_STUDY_SLOTS,
} from "@ibtatech/leads/domain";
import {
  createCaseStudyAction,
  updateCaseStudyAction,
  type CaseStudyResult,
} from "@/lib/admin/actions";
import { caseStudyImageUrl } from "@/lib/case-study-image";

type MetricRow = { label: string; value: string };

const SLOT_OPTIONS = CASE_STUDY_SLOTS.map((slot) => ({
  value: String(slot),
  label: slot === 1 ? "Slot 1 — featured" : `Slot ${slot}`,
}));

const STATUS_OPTIONS = [
  { value: "IN_PRODUCTION", label: "In production" },
  { value: "PUBLISHED", label: "Published" },
];

const MESSAGES: Record<string, string> = {
  unauthorized: "You are not allowed to manage case studies.",
  not_found: "That case study no longer exists.",
  slot_taken: "Another case study already uses that slot.",
  slug_taken: "Another case study already uses that URL slug.",
  invalid: "Case study could not be saved.",
  partial: "The case study was saved, but the image could not be updated.",
};

const emptyRow = (): MetricRow => ({ label: "", value: "" });

export function CaseStudyForm({
  mode,
  caseStudyId,
  initial,
}: {
  mode: "create" | "edit";
  caseStudyId?: string;
  initial?: {
    title: string;
    clientName: string;
    slug: string;
    slotNumber: number;
    description: string;
    status: string;
    metrics: Array<{ label: string; value: string }>;
    imagePath: string | null;
    imageAlt: string | null;
    videoEmbedUrl: string | null;
    sortOrder: number;
  };
}) {
  const formId = useId();
  const [rows, setRows] = useState<MetricRow[]>(
    initial && initial.metrics.length > 0 ? initial.metrics.map((m) => ({ ...m })) : [emptyRow()],
  );
  const [state, formAction, pending] = useActionState<CaseStudyResult | null, FormData>(
    async (_prev, formData) =>
      mode === "edit" && caseStudyId
        ? updateCaseStudyAction(caseStudyId, formData)
        : createCaseStudyAction(formData),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const lastSuccessKey = useRef<unknown>(null);

  useEffect(() => {
    if (!state?.ok || mode !== "create") return;
    if (lastSuccessKey.current === state) return;
    lastSuccessKey.current = state;
    formRef.current?.reset();
    setRows([emptyRow()]);
  }, [state, mode]);

  const addRow = useCallback(() => {
    setRows((prev) => (prev.length >= CASE_STUDY_MAX_METRICS ? prev : [...prev, emptyRow()]));
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const updateRow = useCallback((index: number, patch: Partial<MetricRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const errorMessage =
    state && !state.ok
      ? (state.message ?? MESSAGES[state.error] ?? "Could not save case study.")
      : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="gap-4 flex flex-col"
      data-testid="case-study-form"
    >
      <div className="gap-3 sm:grid-cols-2 grid">
        <Field
          label="Title"
          name="title"
          maxLength={CASE_STUDY_MAX_TITLE}
          defaultValue={initial?.title ?? ""}
          placeholder="How a UK retailer cut checkout drop-off"
          required
          data-testid="case-study-title"
        />
        <Field
          label="Client name"
          name="clientName"
          maxLength={CASE_STUDY_MAX_CLIENT_NAME}
          defaultValue={initial?.clientName ?? ""}
          placeholder="Northwind Retail"
          required
          data-testid="case-study-client"
        />
      </div>
      <div className="gap-3 sm:grid-cols-2 grid">
        <FieldSelect
          label="Landing slot"
          name="slotNumber"
          options={SLOT_OPTIONS}
          defaultValue={String(initial?.slotNumber ?? 1)}
          hint="Slot 1 is the featured story in the public Selected work section."
          required
          data-testid="case-study-slot"
        />
        <FieldSelect
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={initial?.status ?? "IN_PRODUCTION"}
          hint="Only published case studies appear on the website."
          required
          data-testid="case-study-status"
        />
      </div>
      <Field
        label="URL slug"
        name="slug"
        maxLength={CASE_STUDY_SLUG_MAX}
        defaultValue={initial?.slug ?? ""}
        placeholder="checkout-rebuild-uk-retail"
        hint={
          initial
            ? "Public address: /case-studies/… — blank keeps the current one, so shared links stay alive."
            : "Public address: /case-studies/… — blank derives it from the title."
        }
        data-testid="case-study-slug"
      />
      <FieldTextArea
        label="Description"
        name="description"
        rows={5}
        maxLength={CASE_STUDY_MAX_DESCRIPTION}
        defaultValue={initial?.description ?? ""}
        placeholder="What the client needed, what we built, and what changed."
        hint={`Shown on the landing page. Max ${CASE_STUDY_MAX_DESCRIPTION} characters.`}
        required
        data-testid="case-study-description"
      />

      <fieldset className="gap-3 p-4 flex flex-col rounded-lg border border-border-subtle bg-surface-sunken">
        <legend className="px-1 text-sm font-medium text-text">Image &amp; video</legend>
        <p className="text-xs text-text-muted">
          Optional. Shown on the landing tiles, /case-studies and the detail page. Max 5 MB — PNG,
          JPEG, WebP, AVIF or GIF.
        </p>
        {initial?.imagePath && caseStudyImageUrl(initial.imagePath) && (
          <div className="gap-3 flex items-start">
            <div className="h-20 w-32 relative shrink-0 overflow-hidden rounded-md border border-border-subtle">
              <Image
                src={caseStudyImageUrl(initial.imagePath) ?? ""}
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
              data-testid="case-study-remove-image"
            />
          </div>
        )}
        <div className="gap-1.5 flex flex-col">
          <label htmlFor={`${formId}-image`} className="text-sm font-medium text-text">
            Upload new image
          </label>
          <input
            id={`${formId}-image`}
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            className="text-sm file:mr-3 file:px-3 file:py-1.5 file:text-xs file:font-medium text-text-secondary file:rounded-md file:border file:border-border-default file:bg-surface file:text-text hover:file:bg-surface-sunken"
            data-testid="case-study-image"
          />
          <p className="text-xs text-text-muted">Leaving this empty keeps the current image.</p>
        </div>
        <div className="gap-3 sm:grid-cols-2 grid">
          <Field
            label="Image alt text"
            name="imageAlt"
            maxLength={CASE_STUDY_MAX_IMAGE_ALT}
            defaultValue={initial?.imageAlt ?? ""}
            placeholder="Dashboard of the rebuilt checkout"
            hint="Describes the image for screen readers. Blank falls back to the title."
            labelSuffix="(optional)"
            data-testid="case-study-image-alt"
          />
          <Field
            label="Sort order"
            name="sortOrder"
            type="number"
            min={0}
            max={CASE_STUDY_MAX_SORT_ORDER}
            defaultValue={String(initial?.sortOrder ?? 0)}
            hint="Order on /case-studies, independent of the landing slot. Lower numbers show first."
            labelSuffix="(optional)"
            data-testid="case-study-sort-order"
          />
        </div>
        <Field
          label="Video link"
          name="videoEmbedUrl"
          maxLength={BLOG_MAX_VIDEO_EMBED_URL}
          defaultValue={initial?.videoEmbedUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=…"
          hint="Optional. Full https YouTube/Vimeo link — shown as a 16:9 embed on the story page."
          labelSuffix="(optional)"
          data-testid="case-study-video-url"
        />
      </fieldset>

      <fieldset className="gap-3 p-4 flex flex-col rounded-lg border border-border-subtle bg-surface-sunken">
        <legend className="px-1 text-sm font-medium text-text">Results</legend>
        <p className="text-xs text-text-muted" id={`${formId}-metrics-hint`}>
          Up to {CASE_STUDY_MAX_METRICS} short metric pairs — e.g. “Conversion rate” / “+38%”.
          Publish only numbers the client has approved.
        </p>
        {rows.map((row, index) => (
          <div
            key={`${formId}-metric-${index}`}
            className="gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] grid rounded-md border border-border-subtle bg-surface"
          >
            <Field
              label={`Metric ${index + 1} label`}
              name="metricLabel"
              value={row.label}
              onChange={(e) => updateRow(index, { label: e.target.value })}
              maxLength={CASE_STUDY_MAX_METRIC_LABEL}
              placeholder="Conversion rate"
            />
            <Field
              label="Value"
              name="metricValue"
              value={row.value}
              onChange={(e) => updateRow(index, { value: e.target.value })}
              maxLength={CASE_STUDY_MAX_METRIC_VALUE}
              placeholder="+38%"
            />
            <div className="pb-1 flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(index)}
                disabled={rows.length <= 1}
                aria-label={`Remove metric ${index + 1}`}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addRow}
            disabled={rows.length >= CASE_STUDY_MAX_METRICS}
          >
            Add metric
          </Button>
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
          data-testid="case-study-error"
        >
          {errorMessage}
        </Alert>
      )}
      {state?.ok && (
        <Alert
          tone="success"
          title={mode === "edit" ? "Case study updated" : "Case study created"}
          data-testid="case-study-success"
        >
          Slot {state.caseStudy.slotNumber} is “{state.caseStudy.title}” — status is{" "}
          {state.caseStudy.status === "PUBLISHED" ? "Published" : "In production"}.
          {state.caseStudy.status === "PUBLISHED"
            ? ` Public page: /case-studies/${state.caseStudy.slug}`
            : ""}
        </Alert>
      )}
      <Button
        type="submit"
        loading={pending}
        disabled={pending}
        className="self-start"
        data-testid="case-study-submit"
      >
        {mode === "edit" ? "Save case study" : "Create case study"}
      </Button>
    </form>
  );
}
