import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedCaseStudy } from "@ibtatech/leads";
import {
  caseStudyGridClass,
  HOME_CASE_STUDY_SLOTS,
  loadHomeCaseStudies,
  planHomeCaseStudies,
} from "@/lib/home-case-studies";

/**
 * Homepage "Selected work" data logic — the three states the section must
 * handle (0 published, 1 published, 3 published) plus a failing database read.
 * In every one of them the page either renders real cards or renders no
 * section at all: never an empty slot, never a placeholder, never an error.
 */

const { listPublishedCaseStudies } = vi.hoisted(() => ({
  listPublishedCaseStudies: vi.fn(),
}));

vi.mock("@ibtatech/leads", () => ({ listPublishedCaseStudies }));

function study(id: string, slotNumber = 1): PublishedCaseStudy {
  return {
    id,
    slug: `story-${id}`,
    title: `Story ${id}`,
    clientName: `Client ${id}`,
    description: "What was built and what changed.",
    metrics: [],
    slotNumber,
    status: "PUBLISHED",
    imagePath: null,
    imageAlt: null,
    videoEmbedUrl: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

beforeEach(() => {
  listPublishedCaseStudies.mockReset();
});

describe("planHomeCaseStudies", () => {
  it("hides the section when nothing is published", () => {
    expect(planHomeCaseStudies([])).toEqual({ mode: "empty" });
  });

  it("renders one wide card for a single published story", () => {
    const plan = planHomeCaseStudies([study("a")]);
    expect(plan).toMatchObject({ mode: "grid", wide: true });
    expect(plan.mode === "grid" && plan.studies).toHaveLength(1);
  });

  it("renders a grid (not wide) for three published stories", () => {
    const plan = planHomeCaseStudies([study("a"), study("b", 2), study("c", 3)]);
    expect(plan).toMatchObject({ mode: "grid", wide: false });
    expect(plan.mode === "grid" && plan.studies).toHaveLength(3);
  });

  it("never shows more than the four landing slots", () => {
    const many = Array.from({ length: 6 }, (_, index) => study(`s${index}`, index + 1));
    const plan = planHomeCaseStudies(many);
    expect(plan.mode === "grid" && plan.studies).toHaveLength(HOME_CASE_STUDY_SLOTS);
  });

  it("hides the section for an empty array, even when it came from an error", () => {
    expect(planHomeCaseStudies([]).mode).toBe("empty");
  });
});

describe("loadHomeCaseStudies", () => {
  it("returns the published stories, capped at the landing slots", async () => {
    listPublishedCaseStudies.mockResolvedValue([
      study("a"),
      study("b", 2),
      study("c", 3),
      study("d", 4),
      study("e", 1),
    ]);
    await expect(loadHomeCaseStudies()).resolves.toHaveLength(HOME_CASE_STUDY_SLOTS);
  });

  it("degrades to [] when the read fails, so the section still hides", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    listPublishedCaseStudies.mockRejectedValue(new Error("database unavailable"));
    await expect(loadHomeCaseStudies()).resolves.toEqual([]);
    expect(planHomeCaseStudies(await loadHomeCaseStudies()).mode).toBe("empty");
    spy.mockRestore();
  });
});

describe("caseStudyGridClass", () => {
  it("sizes the grid to the published count", () => {
    expect(caseStudyGridClass(1)).toContain("grid-cols-1");
    expect(caseStudyGridClass(2)).toContain("sm:grid-cols-2");
    expect(caseStudyGridClass(3)).toContain("lg:grid-cols-3");
    expect(caseStudyGridClass(4)).toContain("lg:grid-cols-4");
  });

  it("never returns a class for an empty grid", () => {
    expect(caseStudyGridClass(0)).toContain("grid-cols-1");
  });
});

describe("homepage source guard", () => {
  const homepage = readFileSync(new URL("../src/app/(site)/page.tsx", import.meta.url), "utf8");
  const selectedWork = readFileSync(
    new URL("../src/components/selected-work.tsx", import.meta.url),
    "utf8",
  );

  it("renders the Selected work section only when the plan has studies", () => {
    expect(homepage).toContain('{plan.mode === "grid" && (');
    expect(homepage).not.toContain("SelectedWorkEmptyCard");
    expect(homepage).not.toContain("case-study-empty");
  });

  it("ships no placeholder card or 'Case studies on request' button", () => {
    expect(selectedWork).not.toContain("SelectedWorkEmptyCard");
    expect(selectedWork).not.toContain("case-study-empty");
    expect(selectedWork).not.toContain("Case studies on request");
    expect(homepage).not.toContain("Case studies on request");
  });
});
