import { cn, focusRing } from "@ibtatech/utils";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "px-3.5 py-2.5 text-sm w-full rounded-md border bg-surface text-text transition-[border-color,box-shadow] duration-150 placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-60",
        invalid
          ? "border-danger focus-visible:ring-danger"
          : "border-border-default hover:border-border-strong focus:border-accent",
        focusRing,
        className,
      )}
      {...props}
    />
  );
});
