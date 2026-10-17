import { BLOG_IMAGE_FILENAME_PATTERN } from "@ibtatech/leads/domain";

export const BLOG_IMAGE_ROUTE = "/api/uploads/blog";

export function blogImageUrl(key: string | null | undefined): string | null {
  if (!key || !BLOG_IMAGE_FILENAME_PATTERN.test(key)) return null;
  return `${BLOG_IMAGE_ROUTE}/${encodeURIComponent(key)}`;
}
