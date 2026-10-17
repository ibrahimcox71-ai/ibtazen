"use client";

import { MotionConfig } from "./motion";
import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Global motion config: users with `prefers-reduced-motion: reduce` get an
 * opacity-only experience automatically across every animated component.
 */
export function MotionConfigProvider({ children }: { children: ReactNode }) {
  // Hydration signal for MOTION_FALLBACK_SCRIPT: once the app has booted the
  // head timer must leave the document alone, otherwise it would freeze every
  // entrance that is still running (and any scroll reveal) at 3s.
  useEffect(() => {
    document.documentElement.setAttribute("data-motion-ready", "");
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Blocking script for the document <head> — the motion half of the failsafe
 * pair started by THEME_BOOTSTRAP_SCRIPT. Entrance variants render
 * `opacity:0` in the server HTML, so if the client bundle has not booted
 * within 3s (slow or failed JS) the `data-motion-fallback` attribute lets
 * tokens.css force every hidden element back to visible. The timer checks
 * `data-motion-ready` first, so a normal load — where the bundle boots long
 * before the timer — is untouched.
 */
export const MOTION_FALLBACK_SCRIPT = `(function(){setTimeout(function(){if(!document.documentElement.hasAttribute("data-motion-ready"))document.documentElement.setAttribute("data-motion-fallback","")},3000)})();`;
