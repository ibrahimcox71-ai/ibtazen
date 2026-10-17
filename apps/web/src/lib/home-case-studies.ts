import { listPublishedCaseStudies, type PublishedCaseStudy } from "@ibtatech/leads";

/**
 * Homepage "Selected work" data logic.
 *
 * Real published case studies are the single biggest credibility lever on a
 * marketing page, so the section renders as many of them as exist — but it
 * must never render an empty slot, a placeholder box or a stack trace. Three
 * outcomes cover every state:
 *
 * - 0 published (or the read failed) → the section does not render at all
 * - 1 published                      → one wide card
 * - 2–4 published                    → a grid sized to the count
 */

/** Landing slots 1–4 — never show more than the section was designed for. */
export const HOME_CASE_STUDY_SLOTS = 4;

export type HomeCaseStudyPlan =
  { mode: "empty" } | { mode: "grid"; studies: PublishedCaseStudy[]; wide: boolean };

/**
 * Published stories for the homepage. Fail-soft by contract: a rejected read
 * degrades to `[]`, which the plan turns into "hide the section".
 */
export async function loadHomeCaseStudies(): Promise<PublishedCaseStudy[]> {
  try {
    const studies = await listPublishedCaseStudies();
    return studies.slice(0, HOME_CASE_STUDY_SLOTS);
  } catch (error) {
    console.error("[home] case study read failed", error);
    return [];
  }
}

/** Turn a (possibly empty, possibly failed) read into what the section renders. */
export function planHomeCaseStudies(studies: readonly PublishedCaseStudy[]): HomeCaseStudyPlan {
  const visible = studies.slice(0, HOME_CASE_STUDY_SLOTS);
  if (visible.length === 0) return { mode: "empty" };
  return { mode: "grid", studies: visible, wide: visible.length === 1 };
}

/** Grid template for the card area — sized to the published count. */
export function caseStudyGridClass(count: number): string {
  if (count <= 1) return "gap-5 grid grid-cols-1";
  if (count === 2) return "gap-5 grid sm:grid-cols-2";
  if (count === 3) return "gap-5 grid sm:grid-cols-2 lg:grid-cols-3";
  return "gap-5 grid sm:grid-cols-2 lg:grid-cols-4";
}
