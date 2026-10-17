import { SITE_ASSET_FILENAME_PATTERN } from "@ibtatech/leads/domain";

export const BRAND_IMAGE_ROUTE = "/api/uploads/brand";

/**
 * Stable URL for the site favicon. The root layout's `metadata.icons` is
 * baked at build time, so it cannot point at a key that only exists after an
 * upload — this alias always resolves (falling back to `/favicon.svg`).
 */
export const FAVICON_ROUTE = `${BRAND_IMAGE_ROUTE}/favicon`;

export function brandImageUrl(key: string | null | undefined): string | null {
  if (!key || !SITE_ASSET_FILENAME_PATTERN.test(key)) return null;
  return `${BRAND_IMAGE_ROUTE}/${encodeURIComponent(key)}`;
}
