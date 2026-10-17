"use client";

/**
 * THEME — light / dark / system with persistence and zero flash.
 * Implemented as an external store read via useSyncExternalStore (no
 * setState-in-effect cascades). The blocking inline script in apps/web layout
 * applies the class before first paint; this module owns it after hydration.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "ibtatech-theme";

interface ThemeSnapshot {
  mode: ThemeMode;
  resolved: "light" | "dark";
}

const SERVER_SNAPSHOT: ThemeSnapshot = { mode: "system", resolved: "light" };

function isMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function resolve(mode: ThemeMode): "light" | "dark" {
  return mode === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : mode;
}

/** Apply a mode to the document and return what was resolved. */
function apply(mode: ThemeMode): "light" | "dark" {
  const resolvedTheme = resolve(mode);
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

let snapshot: ThemeSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function setSnapshot(next: ThemeSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function readStored(): ThemeSnapshot {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const mode: ThemeMode = isMode(stored) ? stored : "system";
    return { mode, resolved: apply(mode) };
  } catch {
    return { mode: "system", resolved: apply("system") };
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeSnapshot {
  return snapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

/** Sync the store from storage once on mount; track OS changes in system mode. */
function initThemeStore(): () => void {
  setSnapshot(readStored());
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onOsChange = () => {
    if (snapshot.mode === "system") setSnapshot(readStored());
  };
  mq.addEventListener("change", onOsChange);
  return () => mq.removeEventListener("change", onOsChange);
}

const SetModeContext = createContext<((mode: ThemeMode) => void) | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(initThemeStore, []);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — theme still applies for the session.
    }
    setSnapshot({ mode: next, resolved: apply(next) });
  }, []);

  const value = useMemo(() => setMode, [setMode]);

  return <SetModeContext.Provider value={value}>{children}</SetModeContext.Provider>;
}

export function useTheme(): ThemeSnapshot & { setMode: (mode: ThemeMode) => void } {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useContext(SetModeContext);
  if (!setMode) throw new Error("useTheme must be used within <ThemeProvider>");
  return { ...snap, setMode };
}

/**
 * Blocking script for the document <head>. Reads localStorage + system
 * preference and sets the `dark` class before first paint — no theme flash.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var m=localStorage.getItem("${STORAGE_KEY}");if(m!=="light"&&m!=="dark"&&m!=="system"){m="system"}var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(e){}})();`;

export { initThemeStore };
