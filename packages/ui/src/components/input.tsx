import { cn, focusRing } from "@ibtatech/utils";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type InputSize = "sm" | "md";

const base =
  "w-full rounded-md border bg-surface text-text placeholder:text-text-muted transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const sizes: Record<InputSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-3.5 text-sm", // 44px touch target
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  invalid?: boolean;
  /** Optional leading adornment (e.g. icon). */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid = false, icon, className, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      {icon && (
        <span
          aria-hidden
          className="left-3 pointer-events-none absolute top-1/2 -translate-y-1/2 text-text-muted"
        >
          {icon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          base,
          sizes[size],
          icon && "pl-9",
          invalid
            ? "border-danger focus-visible:ring-danger"
            : "border-border-default hover:border-border-strong focus:border-accent",
          focusRing,
          className,
        )}
        {...props}
      />
    </div>
  );
});
