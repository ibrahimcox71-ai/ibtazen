import { cn } from "@ibtatech/utils";
import { useId, type ReactNode } from "react";
import { Input, type InputProps } from "./input";
import { Select, type SelectProps } from "./select";
import { Textarea, type TextareaProps } from "./textarea";

interface FieldChromeProps {
  /** Visible label — required: unlabelled inputs are an accessibility defect. */
  label: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  /** Validation message; switches the field to its error state. */
  error?: string;
  id?: string;
  /** Classes for the outer wrapper. */
  containerClassName?: string;
  required?: boolean;
  /** Content rendered after the label text (e.g. "(optional)"). */
  labelSuffix?: ReactNode;
}

function Label({
  htmlFor,
  label,
  required,
  labelSuffix,
}: { htmlFor: string } & Pick<FieldChromeProps, "label" | "required" | "labelSuffix">) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-text">
      {label}
      {required && (
        <span aria-hidden className="ml-0.5 text-danger">
          *
        </span>
      )}
      {labelSuffix && <span className="ml-1.5 text-text-muted">{labelSuffix}</span>}
    </label>
  );
}

/** Shared ARIA wiring for hint/error ids. */
function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  // FieldMessages swaps the hint out for the error, so a described-by hint id
  // would dangle once an error shows — only reference what is rendered.
  const hintId = hint && !error ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return { fieldId, hintId, errorId, describedBy };
}

export type FieldProps = FieldChromeProps & Omit<InputProps, "id" | "className">;

/** Labelled text field wiring label/hint/error ids to ARIA automatically. */
export function Field({
  label,
  hint,
  error,
  id,
  containerClassName,
  required,
  labelSuffix,
  ...inputProps
}: FieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);

  return (
    <div className={cn("gap-1.5 flex flex-col", containerClassName)}>
      <Label htmlFor={fieldId} label={label} required={required} labelSuffix={labelSuffix} />
      <Input
        id={fieldId}
        required={required}
        invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...inputProps}
      />
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export type FieldSelectProps = FieldChromeProps &
  Omit<SelectProps, "id" | "className"> & {
    options: ReadonlyArray<{ value: string; label: string }>;
  };

/** Labelled select field. */
export function FieldSelect({
  label,
  hint,
  error,
  id,
  containerClassName,
  required,
  labelSuffix,
  options,
  ...selectProps
}: FieldSelectProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);

  return (
    <div className={cn("gap-1.5 flex flex-col", containerClassName)}>
      <Label htmlFor={fieldId} label={label} required={required} labelSuffix={labelSuffix} />
      <Select
        id={fieldId}
        required={required}
        invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export type FieldTextAreaProps = FieldChromeProps & Omit<TextareaProps, "id" | "className">;

/** Labelled textarea field. */
export function FieldTextArea({
  label,
  hint,
  error,
  id,
  containerClassName,
  required,
  labelSuffix,
  ...textareaProps
}: FieldTextAreaProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);

  return (
    <div className={cn("gap-1.5 flex flex-col", containerClassName)}>
      <Label htmlFor={fieldId} label={label} required={required} labelSuffix={labelSuffix} />
      <Textarea
        id={fieldId}
        required={required}
        invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...textareaProps}
      />
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

function FieldMessages({
  hint,
  error,
  hintId,
  errorId,
}: {
  hint?: string;
  error?: string;
  hintId?: string;
  errorId?: string;
}) {
  if (error) {
    return (
      <p id={errorId} role="alert" className="text-xs font-medium text-danger">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={hintId} className="text-xs text-text-muted">
        {hint}
      </p>
    );
  }
  return null;
}
/** Fieldset-style group with an optional description, for radios/checkboxes. */
export function FieldGroup({
  label,
  description,
  error,
  children,
  containerClassName,
}: {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  containerClassName?: string;
}) {
  return (
    <fieldset className={cn("gap-1.5 flex flex-col", containerClassName)}>
      <legend className="text-sm font-medium text-text">{label}</legend>
      {description && !error && <p className="text-xs text-text-muted">{description}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-1">{children}</div>
    </fieldset>
  );
}

/** Single labelled checkbox with a 44px touch target. */
export function FieldCheckbox({
  label,
  containerClassName,
  ...checkboxProps
}: {
  label: string;
  containerClassName?: string;
} & Omit<React.ComponentPropsWithoutRef<"input">, "id" | "type" | "className">) {
  return (
    <label
      className={cn(
        "min-h-11 gap-3 text-sm flex items-center text-text-secondary",
        containerClassName,
      )}
    >
      <input type="checkbox" {...checkboxProps} className="size-4 shrink-0" />
      <span>{label}</span>
    </label>
  );
}
