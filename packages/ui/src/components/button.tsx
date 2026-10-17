"use client";

import { cn, focusRing } from "@ibtatech/utils";
import { Loader2 } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import type { HTMLMotionProps } from "motion/react";
import { motion } from "../motion";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverted";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-xs hover:bg-accent-strong",
  secondary:
    "border border-border-default bg-surface text-text hover:border-border-strong hover:bg-surface-sunken",
  ghost: "text-text-secondary hover:bg-surface-sunken hover:text-text",
  danger: "bg-danger text-white hover:brightness-110",
  inverted: "bg-surface-inverted text-text-on-inverted hover:opacity-90",
};

/** Sizes keep touch targets ≥ 44px at md/lg (mobile accessibility contract). */
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={cn(base, variants[variant], sizes[size], focusRing, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </motion.button>
  );
});
