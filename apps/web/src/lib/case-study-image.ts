import { CASE_STUDY_IMAGE_FILENAME_PATTERN } from "@ibtatech/leads/domain";

export const CASE_STUDY_IMAGE_ROUTE = "/api/uploads/case-studies";

export function caseStudyImageUrl(key: string | null | undefined): string | null {
  if (!key || !CASE_STUDY_IMAGE_FILENAME_PATTERN.test(key)) return null;
  return `${CASE_STUDY_IMAGE_ROUTE}/${encodeURIComponent(key)}`;
}
