import { beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Test bootstrap: throwaway SQLite database per run via `prisma db push`.
 * Real persistence, real queries — no mocks for the core behavior.
 */

const pkgDir = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(pkgDir, "prisma", "test.db");
const dbUrl = `file:${dbFile.replace(/\\/g, "/")}`;

beforeAll(() => {
  process.env.DATABASE_URL = dbUrl;
  if (existsSync(dbFile)) rmSync(dbFile);
  mkdirSync(path.dirname(dbFile), { recursive: true });
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  execSync(`${npx} prisma db push --skip-generate`, {
    cwd: pkgDir,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });
});

export { dbUrl };
