import { cn } from "@ibtatech/utils";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Full-area loading state — pairs with route-level skeletons. */
export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "gap-3 py-16 flex flex-col items-center justify-center text-text-secondary",
        className,
      )}
    >
      <Loader2 aria-hidden className="size-6 animate-spin text-accent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("gap-3 py-16 flex flex-col items-center justify-center text-center", className)}
    >
      {Icon && (
        <div className="size-12 flex items-center justify-center rounded-xl bg-surface-sunken text-text-muted">
          <Icon aria-hidden className="size-6" />
        </div>
      )}
      <div className="gap-1 flex flex-col">
        <p className="font-semibold text-text">{title}</p>
        {description && (
          <p className="max-w-sm mx-auto text-body text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Rendered as a retry affordance — usually a <Button onClick={refetch}>. */
  action?: ReactNode;
  className?: string;
  /** Heading level for the title — use "h1" when this is the page's only heading. */
  titleAs?: "p" | "h1" | "h2";
}

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  action,
  className,
  titleAs = "p",
}: ErrorStateProps) {
  const Title = titleAs;
  return (
    <div
      role="alert"
      className={cn("gap-3 py-16 flex flex-col items-center justify-center text-center", className)}
    >
      <div className="size-12 flex items-center justify-center rounded-xl bg-danger-soft text-danger">
        <AlertTriangle aria-hidden className="size-6" />
      </div>
      <div className="gap-1 flex flex-col">
        <Title
          className={cn("font-semibold text-text", titleAs !== "p" && "font-display text-title")}
        >
          {title}
        </Title>
        <p className="max-w-sm mx-auto text-body text-text-secondary">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Layout-stable skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-sunken", className)} />
  );
}
