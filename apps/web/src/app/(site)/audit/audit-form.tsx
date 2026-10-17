"use client";

import {
  Alert,
  Button,
  Field,
  FieldSelect,
  FieldTextArea,
  trackLeadFormCompleted,
  trackLeadFormFailed,
  trackLeadFormStarted,
} from "@ibtatech/ui";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitAuditRequest, type AuditResult } from "./actions";
const AUDIT_KIND_OPTIONS = [
  { value: "website", label: "Website experience & performance" },
  { value: "seo", label: "SEO & search visibility" },
  { value: "ads", label: "Paid advertising account" },
];

const AD_PLATFORM_OPTIONS = [
  { value: "google-ads", label: "Google Ads" },
  { value: "meta-ads", label: "Meta Ads (Facebook / Instagram)" },
  { value: "linkedin-ads", label: "LinkedIn Ads" },
  { value: "other", label: "Other / mixed" },
];

const AD_SPEND_OPTIONS = [
  { value: "under-2k", label: "Under £2k / month" },
  { value: "2k-10k", label: "£2k – £10k / month" },
  { value: "10k-50k", label: "£10k – £50k / month" },
  { value: "50k-plus", label: "£50k+ / month" },
  { value: "not-sure", label: "Not sure yet" },
];

const initial: AuditResult | null = null;

export function AuditForm() {
  const [state, formAction, pending] = useActionState(submitAuditRequest, initial);
  const [focus, setFocus] = useState("");
  const started = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackLeadFormStarted("audit");
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.ok) trackLeadFormCompleted("audit");
    else trackLeadFormFailed("audit", state.error ?? "unknown");
  }, [state]);

  // Focus the confirmation when the form unmounts on success.
  useEffect(() => {
    if (state?.ok) successRef.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        aria-live="polite"
        className="gap-5 flex flex-col focus:outline-none"
      >
        <Alert tone="success" title="Audit request received">
          Thanks — your request is in. A specialist will review it and reply with the findings and
          recommended next steps.
        </Alert>
        <p className="text-sm text-text-muted">
          No automated report is generated — a person reads every request.
        </p>
      </div>
    );
  }

  const errorKey = state && !state.ok && state.error ? state.error : undefined;
  const fields = errorKey === "invalid" ? (state!.fieldErrors ?? {}) : {};
  const isAds = focus === "ads";

  return (
    <form action={formAction} className="gap-5 flex flex-col" noValidate>
      {errorKey && (
        <Alert
          tone="danger"
          title={errorKey === "rate_limited" ? "Too many attempts" : "Check the highlighted fields"}
        >
          {errorKey === "rate_limited"
            ? "Several requests have come from your network recently. Please try again shortly."
            : "Some fields need attention before we can review your request."}
        </Alert>
      )}

      <div className="gap-5 sm:grid-cols-2 grid">
        <Field label="Full name" name="name" autoComplete="name" required error={fields.name} />
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fields.email}
        />
        <Field
          label="Company"
          name="company"
          autoComplete="organization"
          labelSuffix="(optional)"
          error={fields.company}
          containerClassName="sm:col-span-2"
        />
        <Field
          label="Website"
          name="website"
          type="url"
          inputMode="url"
          placeholder="yourcompany.com"
          required
          error={fields.website}
          hint="We review the live site you enter — no credentials needed."
          containerClassName="sm:col-span-2"
        />
        <FieldSelect
          label="Audit focus"
          name="serviceInterest"
          required
          defaultValue={focus}
          error={fields.serviceInterest}
          options={AUDIT_KIND_OPTIONS}
          onChange={(e) => setFocus(e.currentTarget.value)}
        />
        <Field
          label="Main challenge"
          name="challenge"
          labelSuffix="(optional)"
          placeholder="e.g. traffic without conversions"
          error={fields.challenge}
        />
      </div>

      {/* Ads-audit extras — only relevant for the paid-account focus. */}
      {isAds && (
        <div className="gap-5 sm:grid-cols-2 grid">
          <FieldSelect
            label="Advertising platform"
            name="adPlatform"
            required
            error={fields.adPlatform}
            options={AD_PLATFORM_OPTIONS}
            hint="Where the budget mainly goes."
          />
          <FieldSelect
            label="Monthly ad spend"
            name="monthlyAdSpend"
            required
            error={fields.monthlyAdSpend}
            options={AD_SPEND_OPTIONS}
            hint="Indicative band — never shared."
          />
          <Field
            label="Primary advertising goal"
            name="primaryGoal"
            required
            placeholder="e.g. qualified leads at a sustainable CPA"
            hint="What would make the account a win?"
            error={fields.primaryGoal}
            containerClassName="sm:col-span-2"
          />
        </div>
      )}

      <FieldTextArea
        label="Anything else we should know"
        name="message"
        rows={4}
        labelSuffix="(optional)"
        error={fields.message}
        placeholder="Goals, constraints, deadlines — anything that sharpens the review."
      />

      {/* Honeypot — hidden from humans, catches bots. */}
      <div aria-hidden className="h-0 w-0 absolute left-[-9999px] overflow-hidden">
        <label htmlFor="audit-websiteUrl">Website URL</label>
        <input
          id="audit-websiteUrl"
          name="websiteUrl"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label className="min-h-11 max-w-xl gap-3 text-sm flex items-start text-text-secondary">
        <input
          type="checkbox"
          name="consent"
          className="mt-0.5 size-4 shrink-0"
          required
          aria-invalid={fields.consent ? true : undefined}
          aria-describedby={fields.consent ? "audit-consent-error" : undefined}
        />
        <span>Ibtatech may contact me about this audit request. Required.</span>
      </label>
      {fields.consent && (
        <p id="audit-consent-error" role="alert" className="text-sm text-danger">
          {fields.consent}
        </p>
      )}

      <div className="gap-3 sm:flex-row sm:items-center flex flex-col">
        <Button type="submit" size="lg" loading={pending}>
          {pending ? "Sending…" : "Request my free audit"}
        </Button>
        <p className="text-xs text-text-muted">
          Manual review by a specialist — no automated scraping.
        </p>
      </div>
    </form>
  );
}
