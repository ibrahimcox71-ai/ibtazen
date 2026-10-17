import { Alert } from "@ibtatech/ui";
import { Breadcrumbs } from "@ibtatech/ui";
import type { ReactNode } from "react";

/**
 * Shared legal-page shell. Renders the placeholder notice that keeps every
 * legal page honest until Ibtatech's counsel supplies final wording.
 */
export function LegalPage({
  title,
  updated,
  intro,
  crumbs,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  crumbs: Array<{ label: string; href?: string }>;
  children: ReactNode;
}) {
  return (
    <>
      <div className="max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 mx-auto w-full">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 mx-auto w-full">
        <Alert tone="warning" title="Placeholder document" role="status" className="mb-10">
          This template must be reviewed and completed by Ibtatech&apos;s legal counsel before
          publication. Bracketed text marks exactly where company-specific legal information is
          required.
        </Alert>

        <h1 className="font-display text-headline">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: {updated}</p>
        <p className="mt-6 text-lead text-text-secondary">{intro}</p>

        <div className="legal-prose mt-10 gap-8 flex flex-col">{children}</div>
      </div>
    </>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-title">{heading}</h2>
      <div className="gap-3 text-sm leading-relaxed flex flex-col text-text-secondary">
        {children}
      </div>
    </section>
  );
}

/** Marked placeholder for facts only counsel can supply. */
export function LegalPlaceholder({ children }: { children: ReactNode }) {
  return (
    <span className="rounded px-1 py-0.5 font-medium bg-warning-soft text-warning">
      [{children}]
    </span>
  );
}
