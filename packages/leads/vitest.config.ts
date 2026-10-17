import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // `prisma db push` bootstrap can be slow on Windows — allow it.
    hookTimeout: 60000,
    testTimeout: 15000,
    // All test files share one SQLite file — run them serially.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@ibtatech/types": fileURLToPath(new URL("../types/index.ts", import.meta.url)),
    },
  },
});
