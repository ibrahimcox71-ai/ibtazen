import { cn, focusRing } from "@ibtatech/utils";
import Link from "next/link";
import { CONTAINER } from "../layout";

export interface FooterLinkGroup {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}

interface FooterProps {
  groups: ReadonlyArray<FooterLinkGroup>;
  copyright: string;
  /** Public contact address — from site config, never hard-coded here. */
  email?: string;
  className?: string;
}

export function Footer({ groups, copyright, email, className }: FooterProps) {
  return (
    <footer className={cn("border-t border-border-subtle bg-surface-sunken", className)}>
      <div className={cn(CONTAINER, "py-12")}>
        <div className="gap-8 sm:grid-cols-3 lg:grid-cols-4 grid grid-cols-2">
          <div className="sm:col-span-3 lg:col-span-1 col-span-2">
            <Link
              href="/"
              className={cn(
                "min-h-11 text-lg font-semibold tracking-tight flex w-fit items-center font-display text-text",
                focusRing,
              )}
            >
              Ibtatech
            </Link>
            <p className="mt-3 max-w-xs text-body text-text-secondary">
              Digital technology &amp; growth partner for ambitious businesses in the UK, Europe and
              worldwide.
            </p>
          </div>
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col">
              <p className="mb-1 text-sm font-semibold text-text">{group.title}</p>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "min-h-11 min-w-11 text-sm flex w-fit items-center text-text-secondary transition-colors hover:text-text",
                    focusRing,
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        {/* One baseline for copyright, email and the remote-first note at sm+
            (the email link keeps its 44px target, so baseline — not center —
            alignment is what keeps the text rows level); below sm the three
            stack as clean single lines. */}
        <div className="mt-10 gap-2 pt-6 text-xs sm:flex-row sm:items-baseline sm:justify-between flex flex-col border-t border-border-subtle text-text-muted">
          <p>{copyright}</p>
          <p className="gap-x-3 gap-y-1 sm:flex-row sm:items-baseline flex flex-col items-start">
            {email && (
              <a
                href={`mailto:${email}`}
                className={cn(
                  "min-h-11 min-w-11 underline decoration-border-default underline-offset-4 transition-colors hover:text-text",
                  focusRing,
                )}
              >
                {email}
              </a>
            )}
            <span>Remote-first · UK, Europe &amp; worldwide</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
