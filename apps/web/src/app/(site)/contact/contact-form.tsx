"use client";

import {
  Alert,
  Button,
  Field,
  FieldSelect,
  FieldTextArea,
  FieldGroup,
  trackLeadFormCompleted,
  trackLeadFormFailed,
  trackLeadFormStarted,
} from "@ibtatech/ui";
import { BUDGET_BANDS, SERVICES } from "@ibtatech/config";
import { useActionState, useEffect, useRef } from "react";
import { submitContactLead, type ContactResult } from "./actions";

const SERVICE_OPTIONS = [
  ...SERVICES.map((service) => ({ value: service.slug, label: service.name })),
  { value: "multiple", label: "Multiple services" },
  { value: "not-sure", label: "Not sure yet" },
];

const TIMELINE_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3-months", label: "Within 1–3 months" },
  { value: "3-6-months", label: "In 3–6 months" },
  { value: "exploring", label: "Just exploring" },
];

const initial: ContactResult | null = null;

const ERROR_TITLES: Record<string, string> = {
  rate_limited: "Too many attempts",
  duplicate: "Enquiry already received",
  persistence_failed: "Something went wrong on our side",
  invalid: "Check the highlighted fields",
};

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "You've submitted several enquiries recently. Please try again in a little while.",
  duplicate: "We already have an open enquiry with this email address — our team will be in touch.",
  persistence_failed:
    "Your enquiry could not be stored just now. Please try again, or email hello@ibtatech.com directly.",
  invalid: "Some fields need attention before we can send this.",
};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactLead, initial);
  const started = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackLeadFormStarted("contact");
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.ok) trackLeadFormCompleted("contact");
    else trackLeadFormFailed("contact", state.error ?? "unknown");
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
        <Alert tone="success" title="Enquiry received">
          Thanks — your enquiry has been received. Our team will review the details and get back to
          you shortly.
        </Alert>
        <p className="text-sm text-text-muted">
          Prefer to talk now?{" "}
          <a href="/book" className="font-medium text-accent underline-offset-4 hover:underline">
            Book a free discovery call
          </a>
          .
        </p>
      </div>
    );
  }

  const errorKey = state && !state.ok && state.error ? state.error : undefined;
  const fields = errorKey === "invalid" ? (state!.fieldErrors ?? {}) : {};

  return (
    // noValidate: the server action owns validation UX (aria-invalid + alerts)
    // consistently across all fields, instead of native bubbles.
    <form action={formAction} className="gap-5 flex flex-col" noValidate>
      {errorKey && (
        <Alert tone="danger" title={ERROR_TITLES[errorKey] ?? "Something went wrong"}>
          {ERROR_MESSAGES[errorKey] ?? "Please try again."}
        </Alert>
      )}

      <div className="gap-5 sm:grid-cols-2 grid">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          required
          error={fields.name}
          containerClassName="sm:col-span-1"
        />
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fields.email}
          containerClassName="sm:col-span-1"
        />
        <Field
          label="Company"
          name="company"
          autoComplete="organization"
          labelSuffix="(optional)"
          error={fields.company}
          containerClassName="sm:col-span-2"
        />
        <FieldSelect
          label="Service"
          name="service"
          required
          error={fields.service}
          options={SERVICE_OPTIONS}
        />
        <FieldSelect
          label="Budget range"
          name="budgetBand"
          required
          error={fields.budgetBand}
          hint="Indicative — helps us scope honestly."
          options={BUDGET_BANDS.map((band) => ({ value: band.value, label: band.label }))}
        />
        <FieldSelect
          label="Preferred timeline"
          name="timeline"
          labelSuffix="(optional)"
          error={fields.timeline}
          options={TIMELINE_OPTIONS}
          containerClassName="sm:col-span-2"
        />
      </div>

      <FieldTextArea
        label="Project description"
        name="message"
        rows={5}
        required
        error={fields.message}
        placeholder="What are you building, what problem does it solve, and what does success look like?"
      />

      {/* Honeypot — hidden from humans, catches bots. */}
      <div aria-hidden className="h-0 w-0 absolute left-[-9999px] overflow-hidden">
        <label htmlFor="websiteUrl">Website URL</label>
        <input id="websiteUrl" name="websiteUrl" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FieldGroup
        label="Consent"
        error={fields.consent}
        description="We use your details only to respond to this enquiry — see our Privacy Policy."
      >
        <label className="min-h-11 max-w-xl gap-3 text-sm flex items-start text-text-secondary">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0" />
          <span>
            Ibtatech may contact me about this enquiry. No marketing lists without separate consent.
          </span>
        </label>
      </FieldGroup>

      <div className="gap-3 sm:flex-row sm:items-center flex flex-col">
        <Button type="submit" size="lg" loading={pending}>
          {pending ? "Sending…" : "Send enquiry"}
        </Button>
        <p className="text-xs text-text-muted">
          Replies within one business day. Your details are never shared.
        </p>
      </div>
    </form>
  );
}
