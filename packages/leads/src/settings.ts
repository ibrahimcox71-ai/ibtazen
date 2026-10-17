import type { SiteSetting } from "@prisma/client";
import { getSiteSettingRow, setSiteAssetRow } from "./repository";
import { canManageSiteSettings, type CrmUser } from "./auth/rbac";
import { SITE_ASSET_FILENAME_PATTERN, isSiteAssetSlot, type SiteAssetSlot } from "./domain";

/**
 * Site settings service (Phase 28) — one singleton row holding the brand
 * keys behind the admin Settings page. The bytes live on disk in apps/web;
 * this module only decides which filenames the row is allowed to point at,
 * so a forged key never reaches the serving route.
 *
 * Reads are unauthenticated (the public header and the favicon alias need
 * them); writes are admin-only, the same gate as user management.
 */

export interface SiteSettings {
  /** Logo key under uploads/brand/ — null means the text wordmark is rendered. */
  logoPath: string | null;
  /** Favicon key under uploads/brand/ — null means /favicon.svg is served. */
  faviconPath: string | null;
}

export type SiteSettingsErrorCode = "unauthorized" | "invalid";

export type SiteSettingsResult =
  | {
      ok: true;
      settings: SiteSettings;
      /** Key the slot gave up, so the caller can drop its bytes. */ previousKey: string | null;
    }
  | { ok: false; error: SiteSettingsErrorCode; message?: string };

/** No row yet — every caller renders its own fallback for these. */
const EMPTY_SETTINGS: SiteSettings = { logoPath: null, faviconPath: null };

function toSettings(row: Pick<SiteSetting, "logoPath" | "faviconPath"> | null): SiteSettings {
  if (!row) return EMPTY_SETTINGS;
  return { logoPath: row.logoPath, faviconPath: row.faviconPath };
}

/** Public read — never throws, so a database hiccup cannot break the header. */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return toSettings(await getSiteSettingRow());
  } catch (error) {
    console.error("[settings] read failed", error);
    return EMPTY_SETTINGS;
  }
}

/**
 * Link (or clear) one brand key. The slot picks the column and the key must
 * both match the generated-filename pattern *and* belong to that slot, so a
 * favicon key can never be published as the logo (or vice versa).
 */
export async function setSiteAsset(
  actor: CrmUser | null,
  slot: SiteAssetSlot,
  key: string | null,
): Promise<SiteSettingsResult> {
  if (!actor || !canManageSiteSettings(actor.role)) {
    return { ok: false, error: "unauthorized" };
  }
  if (!isSiteAssetSlot(slot)) {
    return { ok: false, error: "invalid", message: "Unknown brand asset." };
  }
  if (key !== null && (!SITE_ASSET_FILENAME_PATTERN.test(key) || !key.startsWith(`${slot}-`))) {
    return { ok: false, error: "invalid", message: "Unsupported image filename." };
  }
  try {
    const current = await getSiteSettingRow();
    const previousKey =
      slot === "logo" ? (current?.logoPath ?? null) : (current?.faviconPath ?? null);
    const row = await setSiteAssetRow(slot, key);
    return { ok: true, settings: toSettings(row), previousKey };
  } catch (error) {
    console.error("[settings] save failed", error);
    return { ok: false, error: "invalid", message: "The setting could not be saved." };
  }
}
