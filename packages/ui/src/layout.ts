/**
 * SPACING CONTRACT — declared once so every section, hero, CTA and footer
 * shares the same container and vertical rhythm. Pages compose these strings
 * instead of re-typing padding, which is how sections drift apart.
 *
 * Kept in its own module (no React, no motion) so server components such as
 * the Footer can import it without pulling the animation layer along.
 */

/** Page container: max width, gutter, horizontal padding. */
export const CONTAINER = "max-w-page px-page-gutter mx-auto w-full";

/** Section vertical rhythm: compact, consistent page cadence. */
export const SECTION_SPACING = "py-10 md:py-12 lg:py-14";

/**
 * Give the section directly under the hero 24px more top padding than the
 * previous rhythm, separating the hero mockup from the trust strip.
 */
export const SECTION_SPACING_UNDER_HERO = "pt-12 md:pt-14 lg:pt-16 pb-10 md:pb-12 lg:pb-14";

/** Gap between a SectionHeader and the section body. */
export const SECTION_GAP = "mt-8";

/** Gutter between cards in a grid. */
export const CARD_GAP = "gap-5";
