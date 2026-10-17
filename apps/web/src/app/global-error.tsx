"use client";

import { reportWebError } from "@/lib/telemetry/report";
import { initThemeStore, THEME_BOOTSTRAP_SCRIPT } from "@ibtatech/ui";
import { globalErrorStyles } from "./global-error.styles";
import { useEffect } from "react";
import "@ibtatech/ui/tokens.css";

/**
 * Last-resort boundary: it renders *instead of* the root layout, so neither the
 * layout's markup nor its stylesheets can be assumed. tokens.css is imported
 * here so the tokens travel with this entry, and every value still carries the
 * token's own literal as a `var()` fallback — see ./global-error.styles.ts.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportWebError(error, {
      route: typeof window === "undefined" ? "/" : window.location.pathname,
      source: "global-error",
    });
  }, [error]);

  // The layout's ThemeProvider and bootstrap script left with it — restore the
  // stored light/dark preference so the token values resolve against the right
  // theme instead of defaulting to light for dark-mode visitors.
  useEffect(() => initThemeStore(), []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body style={globalErrorStyles.body}>
        {/* role lives on a child — on <main> it would override the landmark. */}
        <main style={globalErrorStyles.main}>
          <div role="alert">
            <p style={globalErrorStyles.code}>500</p>
            <h1 style={globalErrorStyles.title}>Something went wrong</h1>
            <p style={globalErrorStyles.description}>
              The site hit an unexpected error and has reported it. Try again, or come back shortly.
            </p>
            <button type="button" onClick={reset} style={globalErrorStyles.button}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
