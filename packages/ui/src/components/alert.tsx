import { cn } from "@ibtatech/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "border-transparent bg-info-soft text-info" },
  success: { icon: CheckCircle2, className: "border-transparent bg-success-soft text-success" },
  warning: { icon: AlertTriangle, className: "border-transparent bg-warning-soft text-warning" },
  danger: { icon: XCircle, className: "border-transparent bg-danger-soft text-danger" },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  /**
   * Defaults to `alert` (errors/results the user just caused). Static
   * informational banners should pass `status` so they aren't announced on
   * every render.
   */
  role?: "alert" | "status";
}

export function Alert({
  tone = "info",
  title,
  role = "alert",
  className,
  children,
  ...rest
}: AlertProps) {
  const { icon: Icon, className: toneClass } = tones[tone];
  return (
    <div
      {...rest}
      role={role}
      className={cn("gap-3 p-4 text-sm flex rounded-md", toneClass, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="gap-0.5 flex flex-col">
        {title && <p className="font-semibold">{title}</p>}
        <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div>
      </div>
    </div>
  );
}
