import { cn } from "@ibtatech/utils";
import type { ReactNode } from "react";

export type CardTone = "default" | "interactive" | "inverted" | "sunken";

const tones: Record<CardTone, string> = {
  default: "border border-border-subtle bg-surface",
  interactive:
    "border border-border-subtle bg-surface transition-[border-color,box-shadow,transform] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md motion-reduce:transition-none",
  inverted: "border border-transparent bg-surface-inverted text-text-on-inverted",
  sunken: "border border-transparent bg-surface-sunken",
};

export interface CardProps {
  tone?: CardTone;
  className?: string;
  children: ReactNode;
}

/** Surface primitive — compose page sections from this, never raw shadow classes. */
export function Card({ tone = "default", className, children }: CardProps) {
  return <div className={cn("rounded-xl", tones[tone], className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("gap-1.5 p-6 pb-0 flex flex-col", className)}>{children}</div>;
}

export function CardTitle({
  className,
  children,
  as: Heading = "h3",
}: {
  className?: string;
  children: ReactNode;
  /** Heading level — pass "h2" when the title is the first heading after the page h1. */
  as?: "h2" | "h3";
}) {
  return <Heading className={cn("font-card-title text-card-title", className)}>{children}</Heading>;
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn("text-card-description text-text-secondary", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("gap-3 p-6 pt-0 flex items-center", className)}>{children}</div>;
}
