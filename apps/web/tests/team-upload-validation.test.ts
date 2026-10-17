import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  prepareTeamImage,
  readTeamImage,
  removeTeamImage,
  storeTeamImage,
  TEAM_MAX_IMAGE_BYTES,
} from "@/lib/uploads";

describe("team image upload validation", () => {
  it("rejects files above 2 MB before reading their content", async () => {
    const file = new File([new Uint8Array(TEAM_MAX_IMAGE_BYTES + 1)], "photo.jpg", {
      type: "image/jpeg",
    });
    await expect(prepareTeamImage(file)).resolves.toMatchObject({
      ok: false,
      message: "Photos must be 2 MB or smaller.",
    });
  });

  it("rejects unsupported types and mismatched content signatures", async () => {
    await expect(
      prepareTeamImage(new File(["gif89a"], "person.gif", { type: "image/gif" })),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      prepareTeamImage(new File(["not a jpeg"], "person.jpg", { type: "image/jpeg" })),
    ).resolves.toMatchObject({ ok: false, message: "That file does not match its image type." });
  });

  it("accepts bytes based on JPEG/PNG/WebP signatures and generates the extension from MIME", async () => {
    await expect(
      prepareTeamImage(
        new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "evil.png", { type: "image/jpeg" }),
      ),
    ).resolves.toMatchObject({ ok: true, extension: "jpg" });
    await expect(
      prepareTeamImage(
        new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.png", { type: "image/png" }),
      ),
    ).resolves.toMatchObject({ ok: true, extension: "png" });
    await expect(
      prepareTeamImage(
        new File(
          [new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])],
          "image.webp",
          { type: "image/webp" },
        ),
      ),
    ).resolves.toMatchObject({ ok: true, extension: "webp" });
  });

  it("stores under a generated safe key and refuses traversal keys", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "ibtatech-team-upload-"));
    const previous = process.env.TEAM_UPLOAD_DIR;
    process.env.TEAM_UPLOAD_DIR = directory;
    try {
      const image = await prepareTeamImage(
        new File([new Uint8Array([0xff, 0xd8, 0xff])], "Ibrahim Khan portrait.jpg", {
          type: "image/jpeg",
        }),
      );
      expect(image.ok).toBe(true);
      if (!image.ok) return;
      const saved = await storeTeamImage(image);
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      expect(saved.key).toMatch(/^[a-f0-9]{40}\.jpg$/);
      expect(saved.key).not.toContain("Ibrahim");
      await expect(readTeamImage(saved.key)).resolves.toMatchObject({ contentType: "image/jpeg" });
      await expect(readTeamImage("../../package.json")).resolves.toBeNull();
      await removeTeamImage(saved.key);
      await expect(readTeamImage(saved.key)).resolves.toBeNull();
    } finally {
      if (previous === undefined) delete process.env.TEAM_UPLOAD_DIR;
      else process.env.TEAM_UPLOAD_DIR = previous;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
