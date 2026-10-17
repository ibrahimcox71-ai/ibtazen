"use client";

import { reportWebError } from "@/lib/telemetry/report";
import { Button, ButtonLink, ErrorState } from "@ibtatech/ui";
import { useEffect } from "react";

/**
 * Shared route-level error UI. Rendered by `app/error.tsx` (no site chrome —
 * the boundary sits above the (site) layout) and `app/(site)/error.tsx`
 * (header/footer intact) so both fail the same way visually.
 */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportWebError(error, {
      route: typeof window === "undefined" ? "/" : window.location.pathname,
      source: "error",
    });
  }, [error]);

  return (
    <div className="max-w-7xl px-4 py-16 sm:px-6 lg:px-8 mx-auto w-full">
      <ErrorState
        title="Something went wrong"
        titleAs="h1"
        description="An unexpected error occurred while rendering this page. The incident has been reported."
        action={
          <div className="gap-3 flex items-center justify-center">
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/">Back to homepage</ButtonLink>
          </div>
        }
      />
    </div>
  );
}
