import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BLOG_IMAGE_FILENAME_PATTERN,
  CASE_STUDY_IMAGE_FILENAME_PATTERN,
  SITE_ASSET_FILENAME_PATTERN,
  isSiteAssetSlot,
  type SiteAssetSlot,
} from "@ibtatech/leads/domain";

/** One ceiling for every uploaded image — case-study media, blog covers, brand assets. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CASE_STUDY_MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
export const BLOG_MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
export const BRAND_MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
export const TEAM_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

const CUID_LIKE = /^[c][a-z0-9]{20,}$/i;

export interface PreparedImage {
  ok: true;
  bytes: Uint8Array;
  extension: string;
}

export type ImageFailure = { ok: false; message: string };

function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  const has = (offset: number, ...expected: number[]): boolean =>
    expected.every((byte, index) => bytes[offset + index] === byte);
  switch (mime) {
    case "image/png":
      return has(0, 0x89, 0x50, 0x4e, 0x47);
    case "image/jpeg":
      return has(0, 0xff, 0xd8, 0xff);
    case "image/gif":
      return has(0, 0x47, 0x49, 0x46, 0x38);
    case "image/webp":
      return has(0, 0x52, 0x49, 0x46, 0x46) && has(8, 0x57, 0x45, 0x42, 0x50);
    case "image/avif":
      return has(4, 0x66, 0x74, 0x79, 0x70);
    default:
      return false;
  }
}

/** Shared validation: size, declared MIME type, then magic bytes. */
async function prepareImage(file: File): Promise<PreparedImage | ImageFailure> {
  if (file.size === 0) return { ok: false, message: "The selected image is empty." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Images must be 5 MB or smaller." };
  }
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) {
    return { ok: false, message: "Images must be PNG, JPEG, WebP, AVIF or GIF." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, file.type)) {
    return { ok: false, message: "That file does not look like a valid image." };
  }
  return { ok: true, bytes, extension };
}

export async function prepareCaseStudyImage(file: File): Promise<PreparedImage | ImageFailure> {
  return prepareImage(file);
}

export async function prepareBlogImage(file: File): Promise<PreparedImage | ImageFailure> {
  return prepareImage(file);
}

/** Same rules as every other upload — brand art is not a loophole. */
export async function prepareBrandImage(file: File): Promise<PreparedImage | ImageFailure> {
  return prepareImage(file);
}

export async function prepareTeamImage(file: File): Promise<PreparedImage | ImageFailure> {
  if (!file.size) return { ok: false, message: "The selected image is empty." };
  if (file.size > TEAM_MAX_IMAGE_BYTES)
    return { ok: false, message: "Photos must be 2 MB or smaller." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, message: "Photos must be JPEG, PNG or WebP." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, file.type))
    return { ok: false, message: "That file does not match its image type." };
  return {
    ok: true,
    bytes,
    extension: file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length),
  };
}

export function caseStudyUploadDir(): string {
  const override = process.env.CASE_STUDY_UPLOAD_DIR?.trim();
  if (override) return override;
  return path.join(process.cwd(), "uploads", "case-studies");
}

export function blogUploadDir(): string {
  const override = process.env.BLOG_UPLOAD_DIR?.trim();
  if (override) return override;
  return path.join(process.cwd(), "uploads", "blog");
}

export function brandUploadDir(): string {
  const override = process.env.BRAND_UPLOAD_DIR?.trim();
  if (override) return override;
  return path.join(process.cwd(), "uploads", "brand");
}

export function teamUploadDir(): string {
  const override = process.env.TEAM_UPLOAD_DIR?.trim();
  return override || path.join(process.cwd(), "uploads", "team");
}

async function storeImage(
  directory: string,
  ownerId: string,
  ownerLabel: string,
  image: PreparedImage,
): Promise<{ ok: true; key: string } | ImageFailure> {
  if (!CUID_LIKE.test(ownerId)) {
    return { ok: false, message: `Invalid ${ownerLabel} reference.` };
  }
  const key = `${ownerId}-${randomBytes(4).toString("hex")}.${image.extension}`;
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, key), image.bytes, { flag: "wx" });
    return { ok: true, key };
  } catch (error) {
    console.error(`[uploads] ${ownerLabel} image write failed`, error);
    return { ok: false, message: "The image could not be saved to disk." };
  }
}

export async function storeCaseStudyImage(
  caseStudyId: string,
  image: PreparedImage,
): Promise<{ ok: true; key: string } | ImageFailure> {
  return storeImage(caseStudyUploadDir(), caseStudyId, "case study", image);
}

export async function storeBlogImage(
  blogId: string,
  image: PreparedImage,
): Promise<{ ok: true; key: string } | ImageFailure> {
  return storeImage(blogUploadDir(), blogId, "blog post", image);
}

/**
 * Brand assets have no owning row — the slot *is* the identity, so the key is
 * `<slot>-<8 hex>.<ext>` and never a path built from client input.
 */
export async function storeBrandImage(
  slot: SiteAssetSlot,
  image: PreparedImage,
): Promise<{ ok: true; key: string } | ImageFailure> {
  if (!isSiteAssetSlot(slot)) return { ok: false, message: "Unknown brand asset." };
  const key = `${slot}-${randomBytes(4).toString("hex")}.${image.extension}`;
  try {
    const directory = brandUploadDir();
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, key), image.bytes, { flag: "wx" });
    return { ok: true, key };
  } catch (error) {
    console.error(`[uploads] ${slot} image write failed`, error);
    return { ok: false, message: "The image could not be saved to disk." };
  }
}

export async function storeTeamImage(
  image: PreparedImage,
): Promise<{ ok: true; key: string } | ImageFailure> {
  const key = `${randomBytes(20).toString("hex")}.${image.extension}`;
  try {
    const directory = teamUploadDir();
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ directory, key), image.bytes, {
      flag: "wx",
    });
    return { ok: true, key };
  } catch (error) {
    console.error("[uploads] team image write failed", error);
    return { ok: false, message: "The photo could not be saved to disk." };
  }
}

async function removeImage(
  directory: string,
  key: string | null | undefined,
  pattern: RegExp,
): Promise<void> {
  if (!key || !pattern.test(key)) return;
  try {
    await rm(path.join(directory, key), { force: true });
  } catch (error) {
    console.error("[uploads] image delete failed", error);
  }
}

export async function removeCaseStudyImage(key: string | null | undefined): Promise<void> {
  await removeImage(caseStudyUploadDir(), key, CASE_STUDY_IMAGE_FILENAME_PATTERN);
}

export async function removeBlogImage(key: string | null | undefined): Promise<void> {
  await removeImage(blogUploadDir(), key, BLOG_IMAGE_FILENAME_PATTERN);
}

export async function removeBrandImage(key: string | null | undefined): Promise<void> {
  await removeImage(brandUploadDir(), key, SITE_ASSET_FILENAME_PATTERN);
}

export async function removeTeamImage(key: string | null | undefined): Promise<void> {
  await removeImage(teamUploadDir(), key, /^[a-f0-9]{40}\.(?:jpg|png|webp)$/i);
}

export async function readTeamImage(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!/^[a-f0-9]{40}\.(?:jpg|png|webp)$/i.test(key)) return null;
  const extension = key.split(".").at(-1);
  try {
    return {
      bytes: new Uint8Array(
        await readFile(path.join(/* turbopackIgnore: true */ teamUploadDir(), key)),
      ),
      contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
    };
  } catch {
    return null;
  }
}

async function readImage(
  directory: string,
  key: string,
  pattern: RegExp,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!pattern.test(key)) return null;
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const contentType = EXTENSION_CONTENT_TYPES[extension];
  if (!contentType) return null;
  try {
    const bytes = await readFile(path.join(directory, key));
    return { bytes: Uint8Array.from(bytes), contentType };
  } catch {
    return null;
  }
}

export async function readCaseStudyImage(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  return readImage(caseStudyUploadDir(), key, CASE_STUDY_IMAGE_FILENAME_PATTERN);
}

export async function readBlogImage(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  return readImage(blogUploadDir(), key, BLOG_IMAGE_FILENAME_PATTERN);
}

export async function readBrandImage(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  return readImage(brandUploadDir(), key, SITE_ASSET_FILENAME_PATTERN);
}

/**
 * The bundled `/favicon.svg` — what `/api/uploads/brand/favicon` serves until
 * an operator uploads a real one, so the stable URL in the root metadata is
 * never a 404.
 */
export async function readDefaultFavicon(): Promise<{
  bytes: Uint8Array;
  contentType: string;
} | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "favicon.svg"));
    return { bytes: Uint8Array.from(bytes), contentType: "image/svg+xml" };
  } catch (error) {
    console.error("[uploads] default favicon read failed", error);
    return null;
  }
}
