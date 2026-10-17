/**
 * Motion tokens — the TS mirror of the CSS custom properties in
 * packages/ui/src/styles/tokens.css. Components must use these so web and
 * React Native share one animation language.
 */

/** GPU-friendly, premium deceleration curve for entrances. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Micro-to-cinematic durations. Never exceed `slow` for UI feedback. */
export const DURATIONS = { fast: 0.15, base: 0.3, slow: 0.5 } as const;

export interface TransitionPreset {
  duration: number;
  ease: readonly number[];
}

/** Transition presets for every UI interaction class. */
export const transitions = {
  micro: { duration: DURATIONS.fast, ease: EASE_OUT_EXPO },
  entrance: { duration: DURATIONS.base, ease: EASE_OUT_EXPO },
  cinematic: { duration: DURATIONS.slow, ease: EASE_OUT_EXPO },
} satisfies Record<string, TransitionPreset>;

/** Entrance/exit presets animating only `opacity` + `transform` (GPU-safe). */
export const transitionsGPU = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: transitions.entrance,
  },
  riseIn: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: transitions.entrance,
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    transition: transitions.entrance,
  },
} as const;
