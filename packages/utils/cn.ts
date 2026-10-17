import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The semantic type scale (--text-lead, --text-body, …) does not look like a
 * Tailwind size, so tailwind-merge files it in the colour group and silently
 * drops it as soon as a text-* colour follows it
 * (cn("text-body text-text-secondary") would keep only the colour).
 * Registering the names as font sizes keeps both.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "headline", "title", "lead", "body"] }],
    },
  },
});

/** Conditional Tailwind class composition with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
