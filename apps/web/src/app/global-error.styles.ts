import type { CSSProperties } from "react";

/**
 * Design-token styles for the root-error boundary (see ./global-error.tsx).
 *
 * Every colour and shape is written as `var(--token, <the token's own value>)`:
 * when tokens.css is present the page follows the live light/dark theme, and
 * when it is not — precisely the case this boundary exists for — the fallback
 * is the token's value verbatim, so the page still reads as the design system
 * instead of a hand-picked colour. `apps/web/tests/global-error.styles.test.ts`
 * checks both halves against `packages/ui/tokens.css`.
 *
 * The font stack is the one exception: `--font-sans` resolves through
 * `var(--font-inter)`, which only the root layout — the layout this boundary
 * replaces — injects, so it would resolve to nothing here. The system stack
 * tokens.css itself falls back to is used instead.
 */

const systemFont = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const globalErrorStyles = {
  body: {
    margin: 0,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    fontFamily: systemFont,
    backgroundColor: "var(--surface, #ffffff)",
    color: "var(--text-primary, #0f151d)",
  },
  main: {
    width: "100%",
    maxWidth: 480,
    textAlign: "center",
  },
  code: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    padding: "0 16px",
    borderRadius: "var(--radius-lg, 1rem)",
    backgroundColor: "var(--danger-soft, #fef2f2)",
    color: "var(--danger, #dc2626)",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.08em",
  },
  title: {
    margin: "16px 0 8px",
    fontSize: "var(--text-title, clamp(1.25rem, 1vw + 1rem, 1.75rem))",
    lineHeight: 1.25,
    fontWeight: 600,
    color: "var(--text-primary, #0f151d)",
  },
  description: {
    margin: "0 auto 24px",
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 1.6,
    color: "var(--text-secondary, #384351)",
  },
  button: {
    height: 44,
    padding: "0 20px",
    border: "1px solid var(--accent, #274de4)",
    borderRadius: "var(--radius-md, 0.75rem)",
    backgroundColor: "var(--accent, #274de4)",
    color: "var(--on-accent, #ffffff)",
    boxShadow: "var(--shadow-xs, 0 1px 2px rgb(15 21 29 / 0.05))",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
} satisfies Record<string, CSSProperties>;
