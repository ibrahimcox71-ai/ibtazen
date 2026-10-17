"use client";

import { cn, focusRing } from "@ibtatech/utils";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme, type ThemeMode } from "../theme";

const emptySubscribe = () => () => undefined;
const getMounted = () => true;
const getNotMounted = () => false;

export function getNextThemeMode(mode: ThemeMode, resolved: "light" | "dark"): ThemeMode {
  if (mode === "system") return resolved === "dark" ? "light" : "dark";
  return mode === "dark" ? "light" : "system";
}

/**
 * Single theme control. It starts in system mode, switches between the current
 * appearance and its opposite, and offers system mode again after an explicit
 * light selection. `mounted` keeps the server and first client render aligned.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, resolved, setMode } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getMounted, getNotMounted);
  const activeTheme = mounted ? resolved : "light";
  const nextMode = getNextThemeMode(mode, activeTheme);
  const actionLabel =
    nextMode === "system" ? "Use the system theme" : `Switch to ${nextMode} theme`;
  const Icon = activeTheme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={actionLabel}
      aria-pressed={activeTheme === "dark"}
      title={`${mounted ? mode : "system"} theme · ${actionLabel}`}
      onClick={() => setMode(nextMode)}
      className={cn(
        "size-11 flex items-center justify-center rounded-md border border-border-subtle bg-surface-raised text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text",
        focusRing,
        className,
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
