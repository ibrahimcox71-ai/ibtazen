import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  SITE_ASSET_FILENAME_PATTERN,
  SITE_ASSET_SLOTS,
  canManageSiteSettings,
  createAdminUser,
  ensureBootstrapAdmin,
  getPrisma,
  getSiteSettings,
  hashPassword,
  isSiteAssetSlot,
  setSiteAsset,
  type CrmUser,
} from "../src/index";

const LOGO_KEY = "logo-deadbeef.png";
const FAVICON_KEY = "favicon-cafebeef.webp";

async function createOperator(
  email: string,
  name: string,
  role: "admin" | "staff",
): Promise<CrmUser> {
  const user = await createAdminUser({
    email,
    name,
    passwordHash: hashPassword("correct-horse-battery-staple"),
    role,
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "admin" | "staff",
  };
}

describe("site asset vocabulary", () => {
  it("only accepts generated brand filenames for the two known slots", () => {
    expect(SITE_ASSET_SLOTS).toEqual(["logo", "favicon"]);
    expect(isSiteAssetSlot("logo")).toBe(true);
    expect(isSiteAssetSlot("favicon")).toBe(true);
    expect(isSiteAssetSlot("banner")).toBe(false);

    expect(SITE_ASSET_FILENAME_PATTERN.test(LOGO_KEY)).toBe(true);
    expect(SITE_ASSET_FILENAME_PATTERN.test(FAVICON_KEY)).toBe(true);
    expect(SITE_ASSET_FILENAME_PATTERN.test("logo-deadbeef.jpeg")).toBe(true);
    expect(SITE_ASSET_FILENAME_PATTERN.test("favicon-deadbeef.avif")).toBe(true);
    expect(SITE_ASSET_FILENAME_PATTERN.test("logo-deadbeef.svg")).toBe(false);
    expect(SITE_ASSET_FILENAME_PATTERN.test("logo-DEADBEEF.png")).toBe(true);
    expect(SITE_ASSET_FILENAME_PATTERN.test("logo-xyz.png")).toBe(false);
    expect(SITE_ASSET_FILENAME_PATTERN.test("../../etc/passwd")).toBe(false);
    expect(SITE_ASSET_FILENAME_PATTERN.test("logo-deadbeef.png.exe")).toBe(false);
    expect(SITE_ASSET_FILENAME_PATTERN.test("deadbeef.png")).toBe(false);
  });

  it("keeps site branding behind the admin gate", () => {
    expect(canManageSiteSettings("admin")).toBe(true);
    expect(canManageSiteSettings("staff")).toBe(false);
    expect(canManageSiteSettings("client")).toBe(false);
  });
});

describe("site settings (integration)", () => {
  let admin: CrmUser;
  let staff: CrmUser;

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    admin = await createOperator("phase28-admin@example.com", "Phase28 Admin", "admin");
    staff = await createOperator("phase28-staff@example.com", "Phase28 Staff", "staff");
    await getPrisma().siteSetting.deleteMany();
  });

  afterAll(async () => {
    await getPrisma().siteSetting.deleteMany();
  });

  it("reports nothing configured until an operator uploads something", async () => {
    expect(await getSiteSettings()).toEqual({ logoPath: null, faviconPath: null });
  });

  it("refuses writes from anonymous and staff actors", async () => {
    expect(await setSiteAsset(null, "logo", LOGO_KEY)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await setSiteAsset(staff, "favicon", FAVICON_KEY)).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await getSiteSettings()).toEqual({ logoPath: null, faviconPath: null });
  });

  it("rejects keys that are not generated brand filenames for that slot", async () => {
    for (const bad of [
      "../../etc/passwd",
      "evil.svg",
      "logo-deadbeef.svg",
      "logo-xyz.png",
      // A favicon key can never be published as the logo, and vice versa.
      FAVICON_KEY,
      "",
    ]) {
      expect(await setSiteAsset(admin, "logo", bad)).toMatchObject({
        ok: false,
        error: "invalid",
      });
    }
    expect(await setSiteAsset(admin, "favicon", LOGO_KEY)).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await getSiteSettings()).toEqual({ logoPath: null, faviconPath: null });
  });

  it("stores, replaces and clears each slot independently", async () => {
    const first = await setSiteAsset(admin, "logo", LOGO_KEY);
    expect(first).toMatchObject({ ok: true, previousKey: null });
    expect(first.ok && first.settings.logoPath).toBe(LOGO_KEY);

    const favicon = await setSiteAsset(admin, "favicon", FAVICON_KEY);
    expect(favicon.ok && favicon.settings).toEqual({
      logoPath: LOGO_KEY,
      faviconPath: FAVICON_KEY,
    });
    expect(favicon.ok && favicon.previousKey).toBeNull();

    const replaced = await setSiteAsset(admin, "logo", "logo-abcd1234.png");
    expect(replaced.ok && replaced.previousKey).toBe(LOGO_KEY);
    expect(replaced.ok && replaced.settings.logoPath).toBe("logo-abcd1234.png");
    expect((await getSiteSettings()).faviconPath).toBe(FAVICON_KEY);

    const cleared = await setSiteAsset(admin, "logo", null);
    expect(cleared.ok && cleared.previousKey).toBe("logo-abcd1234.png");
    expect(cleared.ok && cleared.settings.logoPath).toBeNull();
    expect((await getSiteSettings()).faviconPath).toBe(FAVICON_KEY);

    const clearedFavicon = await setSiteAsset(admin, "favicon", null);
    expect(clearedFavicon.ok && clearedFavicon.settings).toEqual({
      logoPath: null,
      faviconPath: null,
    });
    expect(clearedFavicon.ok && clearedFavicon.previousKey).toBe(FAVICON_KEY);
  });

  it("keeps the singleton to one row no matter how often it is written", async () => {
    await setSiteAsset(admin, "logo", LOGO_KEY);
    await setSiteAsset(admin, "favicon", FAVICON_KEY);
    const rows = await getPrisma().siteSetting.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("site");
  });
});
