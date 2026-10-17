import { cn, focusRing } from "@ibtatech/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail — last item is the current page. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
      <ol className="gap-1.5 text-sm flex flex-wrap items-center text-text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="gap-1.5 flex items-center">
              {index > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 opacity-60" />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "min-h-11 inline-flex items-center rounded-sm transition-colors hover:text-text",
                    focusRing,
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-text" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
