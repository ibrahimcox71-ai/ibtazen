import { cn, focusRing } from "@ibtatech/utils";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Native select — styled, keyboard-complete, with invalid state. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 px-3.5 pr-9 text-sm w-full appearance-none rounded-md border bg-surface text-text transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60",
          invalid
            ? "border-danger focus-visible:ring-danger"
            : "border-border-default hover:border-border-strong focus:border-accent",
          focusRing,
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="right-3 size-4 pointer-events-none absolute top-1/2 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
});
