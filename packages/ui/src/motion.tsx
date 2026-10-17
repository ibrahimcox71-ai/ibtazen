"use client";

/**
 * MOTION SYSTEM — the only sanctioned way to animate in Ibtatech.
 *
 * Rules:
 * - Animate only `opacity` and `transform` (GPU-safe). Never width/height/top/left.
 * - Everything renders inside <MotionConfig reducedMotion="user">, so users with
 *   `prefers-reduced-motion: reduce` automatically get opacity-only animation.
 * - Entrances ≤ 0.5s. Feedback ≤ 0.2s. Nothing loops except loading indicators.
 * - Scroll reveals never hide content in the server HTML. The page must be
 *   readable without JS, before hydration, under reduced motion, and inside a
 *   full-page screenshot (a capture does not expand the viewport, so observers
 *   never fire there). Hidden state is applied only once this element has
 *   proven it is scrolling on a live page.
 */

import type { Transition, Variants } from "motion/react";
import { MotionConfig, motion, useAnimationControls } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export { MotionConfig };
export { motion, AnimatePresence, useReducedMotion } from "motion/react";

/** Shared entrance easing — exported so client sections stay on the same curve. */
export const EASE: Transition["ease"] = [0.16, 1, 0.3, 1];

/**
 * Positive bottom margin: trigger 120px BEFORE element enters viewport.
 * threshold 0 fires when 1px intersects - earliest possible trigger.
 */
const REVEAL_MARGIN = 120;
/** If the observer stays silent, reveal instantly after ~1.5s. */
const FALLBACK_MS = 1500;
/** Polling is the safety net for observers that never deliver a callback. */
const POLL_MS = 250;

const VIEWPORT: IntersectionObserverInit = {
  root: null,
  rootMargin: `0px 0px ${REVEAL_MARGIN}px 0px`,
  threshold: 0,
};

/** Parent container that staggers its `StaggerItem` children on scroll-in. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Child of a stagger container — rises + fades in. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** One-off section reveal driven by scroll position. */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Render immediately (hero) instead of waiting for scroll. */
  immediate?: boolean;
}

interface RevealState {
  ref: (node: HTMLDivElement | null) => void;
  controls: ReturnType<typeof useAnimationControls>;
}

/**
 * Scroll-reveal state machine shared by `Reveal` and `StaggerGroup`.
 *
 * 1. Hydration — `initial={false}` + `animate={controls}`: the server HTML ships
 *    visible, and the `animate="visible"` variant leaking from `template.tsx`
 *    cannot reach this subtree (an `animate` that is an AnimationControls object
 *    stops variant context inheritance).
 * 2. One decision after mount: only content that starts below the fold, on a
 *    live page, without reduced motion, gets armed with its own observer.
 * 3. On entry — hide then fade up once, and only when the element is still
 *    below the fold. A late observer must never blank content a reader sees.
 *    If the observer never reports, reveal instantly after ~1.5s (duration 0).
 * 4. Reduced motion: content stays visible without any animation.
 */
function useScrollReveal(immediate: boolean): RevealState {
  const controls = useAnimationControls();
  const [armed, setArmed] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const decided = useRef(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    const node = nodeRef.current;
    if (!node || immediate) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Only arm observer if element starts below the fold
    if (node.getBoundingClientRect().top <= window.innerHeight) return;
    setArmed(true);
  }, [immediate]);

  useEffect(() => {
    if (!armed) return;
    const node = nodeRef.current;
    if (!node) return;

    let settled = false;
    let io: IntersectionObserver | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    function clearTimer() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function clearFallbackTimer() {
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    }

    function inLeadZone() {
      const target = nodeRef.current;
      if (!target) return false;
      const bounds = target.getBoundingClientRect();
      // Element is in lead zone when it's 120px from entering viewport
      return bounds.top <= window.innerHeight + REVEAL_MARGIN;
    }

    function stop() {
      settled = true;
      clearTimer();
      clearFallbackTimer();
      if (poll !== null) {
        clearInterval(poll);
        poll = null;
      }
      if (io !== null) {
        io.disconnect();
        io = null;
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    function onScroll() {
      if (settled) return;
      if (!inLeadZone()) {
        clearTimer();
        return;
      }
      if (timer !== null) return;
      timer = setTimeout(stop, FALLBACK_MS);
    }

    function onIntersect(entries: IntersectionObserverEntry[]) {
      if (settled) return;
      const target = nodeRef.current;
      if (!target) return;
      const entry = entries.find((item) => item.target === target);
      if (!entry?.isIntersecting) return;
      // A late observer must never blank content the reader already sees.
      const isBelowFold = target.getBoundingClientRect().top >= window.innerHeight;
      stop();
      if (!isBelowFold) return;
      // Cancel fallback - observer fired, reveal with animation
      clearFallbackTimer();
      controls.set("hidden");
      const animation = controls.start("visible");
      clearTimer();
      void animation.then(
        () => {},
        () => {},
      );
    }

    // Fallback: if observer never fires, reveal instantly after FALLBACK_MS
    function fallbackReveal() {
      if (settled) return;
      stop();
      // Instant reveal (duration 0) when observer never fires
      controls.set("visible");
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    poll = setInterval(onScroll, POLL_MS);
    io = new IntersectionObserver(onIntersect, VIEWPORT);
    io.observe(node);
    onScroll();

    // Start fallback timer - ensures content is visible even if observer never fires
    fallbackTimer = setTimeout(fallbackReveal, FALLBACK_MS);

    return stop;
  }, [armed, controls]);

  return { ref, controls };
}

/** Scroll-triggered reveal wrapper. Use `immediate` for above-the-fold content. */
export function Reveal({ children, className, immediate = false }: RevealProps) {
  const { ref, controls } = useScrollReveal(immediate);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={controls}
      variants={sectionReveal}
    >
      {children}
    </motion.div>
  );
}

/** Staggered list/grid: wrap children in <StaggerItem>. */
export function StaggerGroup({ children, className, immediate = false }: RevealProps) {
  const { ref, controls } = useScrollReveal(immediate);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={controls}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: RevealProps) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/** Page-transition fade used by template.tsx. Kept subtle to never slow navigation. */
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE } },
};
