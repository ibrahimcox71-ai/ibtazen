import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OG_IMAGE } from "@ibtatech/config";

/**
 * The default social card (check.md #18): a real 1200×630 PNG in `public/`,
 * one shared constant to point at it — and a guard for the Next.js metadata
 * merge rule that silently drops it.
 */

const APP_DIR = fileURLToPath(new URL("../src/app", import.meta.url));
const PNG_FILE = fileURLToPath(new URL("../public/og-image.png", import.meta.url));

/** PNG signature, then the IHDR chunk: width/height are big-endian at 16/20. */
function pngDimensions(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function tsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...tsxFiles(full));
    else if (entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

describe("default og:image asset", () => {
  it("is a 1200×630 PNG served from /og-image.png", () => {
    expect(pngDimensions(readFileSync(PNG_FILE))).toEqual({ width: 1200, height: 630 });
  });

  it("is declared once, with matching dimensions and alt text", () => {
    expect(OG_IMAGE.url).toMatch(/\/og-image\.png$/);
    expect(OG_IMAGE.width).toBe(1200);
    expect(OG_IMAGE.height).toBe(630);
    expect(OG_IMAGE.alt).toContain("Ibtatech");
  });
});

describe("page metadata", () => {
  /**
   * Next merges metadata key-by-key: a child that declares `openGraph` replaces
   * the parent's object outright, images included (resolve-metadata.js). So a
   * page-level block without `images` loses the default card with no warning —
   * every declaration carries `OG_IMAGE` itself, and this enforces it.
   */
  it("declares OG_IMAGE alongside every openGraph and twitter block", () => {
    const offenders = tsxFiles(APP_DIR).filter((file) => {
      const source = readFileSync(file, "utf8");
      const declaresCard = source.includes("openGraph:") || source.includes("twitter: {");
      return declaresCard && !(source.includes("images:") && source.includes("OG_IMAGE"));
    });

    expect(offenders.map((file) => file.slice(APP_DIR.length + 1))).toEqual([]);
  });
});
