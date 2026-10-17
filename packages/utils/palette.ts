/**
 * Shared color primitives — values mirror packages/ui/tokens.css exactly so
 * web and mobile share one visual identity. Web components use the CSS custom
 * properties; React Native imports these.
 */

export const brand = {
  50: "#eef4ff",
  100: "#dce7fd",
  200: "#c0d4fc",
  300: "#94b8fa",
  400: "#6192f6",
  500: "#3d6df0",
  600: "#274de4",
  700: "#1f3ad1",
  800: "#2031a9",
  900: "#1f2f86",
  950: "#171f52",
} as const;

export const ink = {
  50: "#f6f7f9",
  100: "#eceef2",
  200: "#d4d9e2",
  300: "#b0b9c9",
  400: "#8594ab",
  500: "#667891",
  600: "#506077",
  700: "#414e60",
  800: "#384351",
  900: "#0f151d",
  950: "#080b10",
} as const;

export const lightTheme = {
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceSunken: ink[50],
  text: ink[900],
  textSecondary: ink[600],
  textMuted: ink[500],
  border: ink[200],
  accent: brand[600],
  onAccent: "#ffffff",
  overlay: "rgb(8 11 16 / 0.55)",
} as const satisfies AppTheme;

export const darkTheme = {
  surface: ink[950],
  surfaceRaised: "#10161f",
  surfaceSunken: "#06090d",
  text: "#f2f4f8",
  textSecondary: "#a6b1c2",
  textMuted: "#7d899c",
  border: "rgb(255 255 255 / 0.12)",
  accent: brand[400],
  onAccent: ink[950],
  overlay: "rgb(3 5 8 / 0.7)",
} as const satisfies AppTheme;

/** Structural theme contract — both themes satisfy it. */
export interface AppTheme {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  onAccent: string;
  overlay: string;
}
