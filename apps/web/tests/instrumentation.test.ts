import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "@/instrumentation";

function warnMessages(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

describe("instrumentation register", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("surfaces env misconfiguration at boot in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("AUTH_SECRET", "too-short");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    await register();

    const envWarnings = warnMessages(warn).filter((m) => m.startsWith("[env] "));
    expect(envWarnings.some((m) => m.includes("RESEND_API_KEY"))).toBe(true);
    expect(envWarnings.some((m) => m.includes("AUTH_SECRET is 9 characters"))).toBe(true);
  });

  it("stays silent outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    await register();

    expect(warn).not.toHaveBeenCalled();
  });

  it("logs the boot line in every environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await register();

    expect(log.mock.calls.some((call) => String(call[0]) === "[web:boot]")).toBe(true);
  });
});
