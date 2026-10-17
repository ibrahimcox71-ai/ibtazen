"use client";

import {
  Alert,
  Button,
  Field,
  FieldCheckbox,
  FieldGroup,
  FieldSelect,
  FieldTextArea,
  trackEstimateStep,
  trackLeadFormCompleted,
  trackLeadFormFailed,
  trackLeadFormStarted,
} from "@ibtatech/ui";
import {
  ESTIMATOR_BUDGETS,
  ESTIMATOR_ENGAGEMENT,
  ESTIMATOR_FEATURES,
  ESTIMATOR_SCALES,
  ESTIMATOR_SERVICES,
  ESTIMATOR_STEPS,
  ESTIMATOR_TIMELINES,
  type EstimatorServiceKey,
} from "@ibtatech/config";
import { motion } from "@ibtatech/ui";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitEstimateRequest } from "./actions";

const TOTAL_STEPS = ESTIMATOR_STEPS.length;

/** Human labels for server field keys — used by the review-step error summary. */
const FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  email: "Work email",
  company: "Company",
  message: "Anything else",
  budgetBand: "Budget range",
  timeline: "Preferred start",
  "detail.scale": "Overall scale",
  "detail.services": "Services",
  "detail.pages": "Key pages or screens",
};

const STEP_VARIANTS = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
};

export function Estimator() {
  const [state, formAction, pending] = useActionState(submitEstimateRequest, null);
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<EstimatorServiceKey[]>([]);
  const [snapshot, setSnapshot] = useState({ services: [] as EstimatorServiceKey[] });
  const [scope, setScope] = useState({ scale: "", features: [] as string[], pages: "" });
  const [contact, setContact] = useState({ name: "", email: "", company: "", message: "" });
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");

  const current = ESTIMATOR_STEPS[step] ?? ESTIMATOR_STEPS[0]!;
  const isReview = current.id === "review";
  const started = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackLeadFormStarted("estimate");
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.ok) trackLeadFormCompleted("estimate");
    else trackLeadFormFailed("estimate", state.error ?? "unknown");
  }, [state]);

  // The form unmounts on success — move focus to the confirmation so keyboard
  // and screen-reader users aren't dropped back on <body>.
  useEffect(() => {
    if (state?.ok) successRef.current?.focus();
  }, [state]);

  useEffect(() => {
    trackEstimateStep(step + 1);
  }, [step]);

  if (state?.ok) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        aria-live="polite"
        className="gap-6 flex flex-col focus:outline-none"
      >
        <Alert tone="success" title="Request received">
          Thanks — your project summary is with our team. We&apos;ll reply with a tailored proposal
          and next-step options.
        </Alert>
        <p className="text-sm text-text-muted">
          No prices were calculated here — the proposal you receive will be scoped precisely.
        </p>
      </div>
    );
  }

  const errorKey = state && !state.ok && state.error ? state.error : undefined;
  const fields = errorKey === "invalid" ? (state!.fieldErrors ?? {}) : {};

  const toggleService = (value: EstimatorServiceKey) => {
    setServices((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  /** Snapshot every step's fields before leaving it — the panel remounts on
      step change, so uncontrolled DOM state would otherwise be lost. */
  const snapshotCurrentStep = () => {
    const form = document.querySelector("form");
    const fd = form ? new FormData(form) : new FormData();
    const get = (k: string) => (fd.get(k) as string) ?? "";
    const getAll = (k: string) => fd.getAll(k).filter((v): v is string => typeof v === "string");
    if (current.id === "services") setSnapshot({ services: [...services] });
    if (current.id === "scope") {
      setScope({
        scale: get("detail.scale"),
        features: getAll("detail.features"),
        pages: get("detail.pages"),
      });
    }
    if (current.id === "budget") setBudget(get("budgetBand"));
    if (current.id === "timeline") setTimeline(get("timeline"));
    if (current.id === "contact") {
      setContact({
        name: get("name"),
        email: get("email"),
        company: get("company"),
        message: get("message"),
      });
    }
  };

  const goNext = () => {
    snapshotCurrentStep();
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const reviewFieldErrors = Object.entries(fields).filter(([key]) => key !== "consent");

  return (
    <form action={formAction} className="gap-8 flex flex-col" noValidate>
      {/* Failure banner sits above the step so it is never scrolled out of
          view — `invalid` used to render nothing at all on the review step. */}
      {errorKey && (
        <Alert
          tone="danger"
          title={
            errorKey === "rate_limited"
              ? "Too many attempts"
              : errorKey === "invalid"
                ? "Check your answers"
                : "Something went wrong"
          }
        >
          {errorKey === "rate_limited" ? (
            "Several requests have come from your network recently. Please try again shortly."
          ) : errorKey === "invalid" ? (
            isReview && reviewFieldErrors.length > 0 ? (
              <div className="gap-1 flex flex-col">
                <p>These answers need attention before we can send your request:</p>
                <ul className="mt-1 pl-5 list-disc">
                  {reviewFieldErrors.map(([key, message]) => (
                    <li key={key}>
                      <span className="font-medium">{FIELD_LABELS[key] ?? key}:</span> {message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              "Some fields need attention before we can send your request."
            )
          ) : (
            "Your request could not be stored just now. Please try again, or email hello@ibtatech.com directly."
          )}
        </Alert>
      )}

      {/* Progress indicator */}
      <div>
        <div className="text-sm flex items-baseline justify-between">
          <p className="font-medium text-text">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
          <p className="text-text-muted">{current.title}</p>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label="Estimator progress"
        >
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Step panel — remounts per step so the enter transition always plays
          (AnimatePresence mode="wait" deadlocked between step changes here). */}
      <motion.div
        key={current.id}
        variants={STEP_VARIANTS}
        initial="enter"
        animate="center"
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="gap-5 flex flex-col"
      >
        <div>
          <h2 className="text-xl font-semibold text-text">{current.title}</h2>
          <p className="mt-1 text-sm text-text-secondary">{current.description}</p>
        </div>

        {current.id === "services" && (
          <FieldGroup label="Services" error={fields["detail.services"]}>
            <div className="gap-3 sm:grid-cols-2 grid">
              {ESTIMATOR_SERVICES.map((s) => (
                <label
                  key={s.value}
                  className={`min-h-11 gap-3 p-3 flex cursor-pointer items-start rounded-lg border transition-colors ${
                    services.includes(s.value)
                      ? "border-accent bg-accent-soft/40"
                      : "border-border-subtle hover:border-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="detail.services"
                    value={s.value}
                    checked={services.includes(s.value)}
                    onChange={() => toggleService(s.value)}
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span>
                    <span className="text-sm font-medium block text-text">{s.label}</span>
                    <span className="text-xs block text-text-muted">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </FieldGroup>
        )}

        {current.id === "scope" && (
          <>
            <FieldSelect
              label="Overall scale"
              name="detail.scale"
              defaultValue={scope.scale}
              error={fields["detail.scale"]}
              options={ESTIMATOR_SCALES}
              hint="Rough size of the build — refine later."
            />
            <FieldGroup label="Features" description="Select everything that applies.">
              <div className="gap-2 sm:grid-cols-2 grid">
                {ESTIMATOR_FEATURES.map((f) => (
                  <FieldCheckbox
                    key={f.value}
                    name="detail.features"
                    value={f.value}
                    label={f.label}
                    defaultChecked={scope.features.includes(f.value)}
                  />
                ))}
              </div>
            </FieldGroup>
            <Field
              label="Key pages or screens"
              name="detail.pages"
              labelSuffix="(optional)"
              placeholder="e.g. 6–12"
              defaultValue={scope.pages}
              error={fields["detail.pages"]}
            />
          </>
        )}

        {current.id === "budget" && (
          <FieldSelect
            label="Budget range"
            name="budgetBand"
            required
            defaultValue={budget}
            error={fields.budgetBand}
            options={ESTIMATOR_BUDGETS.map((b) => ({ value: b.value, label: b.label }))}
            hint="Indicative — never shared, only used to scope honestly."
          />
        )}

        {current.id === "timeline" && (
          <FieldSelect
            label="Preferred start"
            name="timeline"
            defaultValue={timeline}
            error={fields.timeline}
            options={ESTIMATOR_TIMELINES}
          />
        )}

        {current.id === "contact" && (
          <div className="gap-5 sm:grid-cols-2 grid">
            <Field
              label="Full name"
              name="name"
              autoComplete="name"
              required
              defaultValue={contact.name}
              error={fields.name}
            />
            <Field
              label="Work email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={contact.email}
              error={fields.email}
            />
            <Field
              label="Company"
              name="company"
              autoComplete="organization"
              labelSuffix="(optional)"
              defaultValue={contact.company}
              error={fields.company}
              containerClassName="sm:col-span-2"
            />
            <FieldTextArea
              label="Anything else"
              name="message"
              rows={4}
              labelSuffix="(optional)"
              placeholder="Context, links, constraints…"
              defaultValue={contact.message}
              error={fields.message}
              containerClassName="sm:col-span-2"
            />
          </div>
        )}

        {isReview && (
          <>
            {/* Collected answers as hidden inputs — earlier steps' fields are
                  not mounted on this step, so the submission needs them here. */}
            <input type="hidden" name="name" value={contact.name} />
            <input type="hidden" name="email" value={contact.email} />
            <input type="hidden" name="company" value={contact.company} />
            <input type="hidden" name="message" value={contact.message} />
            <input type="hidden" name="budgetBand" value={budget} />
            <input type="hidden" name="timeline" value={timeline} />
            {snapshot.services.map((s) => (
              <input key={s} type="hidden" name="detail.services" value={s} />
            ))}
            {scope.scale && <input type="hidden" name="detail.scale" value={scope.scale} />}
            {scope.features.map((f) => (
              <input key={f} type="hidden" name="detail.features" value={f} />
            ))}
            {scope.pages && <input type="hidden" name="detail.pages" value={scope.pages} />}

            <Alert tone="info" role="status" title="What happens next">
              {snapshot.services.length > 0 && snapshot.services[0] !== undefined && (
                <p className="mb-2">{ESTIMATOR_ENGAGEMENT[snapshot.services[0]]}.</p>
              )}
              <p>
                This isn&apos;t a quote — you&apos;ll receive a tailored proposal after a short
                discovery call.
              </p>
            </Alert>

            {/* Review summary — human-readable, from the same state. */}
            <dl className="gap-2 p-4 text-sm flex flex-col rounded-lg border border-border-subtle">
              <div className="gap-4 flex justify-between">
                <dt className="text-text-muted">Services</dt>
                <dd className="font-medium text-right text-text">
                  {snapshot.services
                    .map((s) => ESTIMATOR_SERVICES.find((e) => e.value === s)?.label ?? s)
                    .join(", ") || "—"}
                </dd>
              </div>
              {scope.scale && (
                <div className="gap-4 flex justify-between">
                  <dt className="text-text-muted">Scale</dt>
                  <dd className="font-medium text-right text-text">
                    {ESTIMATOR_SCALES.find((s) => s.value === scope.scale)?.label}
                  </dd>
                </div>
              )}
              {budget && (
                <div className="gap-4 flex justify-between">
                  <dt className="text-text-muted">Budget</dt>
                  <dd className="font-medium text-right text-text">
                    {ESTIMATOR_BUDGETS.find((b) => b.value === budget)?.label}
                  </dd>
                </div>
              )}
              {timeline && (
                <div className="gap-4 flex justify-between">
                  <dt className="text-text-muted">Timeline</dt>
                  <dd className="font-medium text-right text-text">
                    {ESTIMATOR_TIMELINES.find((t) => t.value === timeline)?.label}
                  </dd>
                </div>
              )}
              <div className="gap-4 flex justify-between">
                <dt className="text-text-muted">Contact</dt>
                <dd className="font-medium text-right text-text">{contact.email || "—"}</dd>
              </div>
            </dl>

            <label className="min-h-11 max-w-xl gap-3 text-sm flex items-start text-text-secondary">
              <input
                type="checkbox"
                name="consent"
                className="mt-0.5 size-4 shrink-0"
                required
                aria-invalid={fields.consent ? true : undefined}
                aria-describedby={fields.consent ? "estimate-consent-error" : undefined}
              />
              <span>
                Ibtatech may contact me about this request. Required — see our Privacy Policy.
              </span>
            </label>
            {fields.consent && (
              <p id="estimate-consent-error" role="alert" className="text-sm text-danger">
                {fields.consent}
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Hidden honeypot */}
      <div aria-hidden className="h-0 w-0 absolute left-[-9999px] overflow-hidden">
        <label htmlFor="estimate-websiteUrl">Website URL</label>
        <input
          id="estimate-websiteUrl"
          name="websiteUrl"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Navigation */}
      <div className="gap-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={goBack}
          disabled={step === 0 || pending}
          className={step === 0 ? "invisible" : ""}
        >
          Back
        </Button>
        {isReview ? (
          <Button type="submit" size="lg" loading={pending}>
            {pending ? "Sending…" : "Request tailored proposal"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        )}
      </div>
    </form>
  );
}
