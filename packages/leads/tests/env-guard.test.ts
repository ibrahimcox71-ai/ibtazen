import { describe, expect, it } from "vitest";
import { collectProductionEnvWarnings, type EnvLike } from "../src/env-guard";

const FULL: EnvLike = {
  RESEND_API_KEY: "re_live_key",
  EMAIL_FROM: "Ibtatech <hello@ibtatech.com>",
  LEAD_NOTIFY_EMAIL: "ops@ibtatech.com",
  AUTH_SECRET: "a".repeat(48),
  ADMIN_BOOTSTRAP_EMAIL: "admin@ibtatech.com",
  ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-strong-password-1",
};

function warnings(env: EnvLike): string[] {
  return collectProductionEnvWarnings(env);
}

function joined(env: EnvLike): string {
  return warnings(env).join("\n");
}

describe("collectProductionEnvWarnings", () => {
  it("returns nothing for a fully configured production environment", () => {
    expect(warnings(FULL)).toEqual([]);
  });

  it("flags a missing RESEND_API_KEY as silent undelivered email", () => {
    const out = joined({ ...FULL, RESEND_API_KEY: undefined });
    expect(out).toContain("RESEND_API_KEY is not set");
    expect(out).toContain("delivered:false");
  });

  it("flags EMAIL_TRANSPORT=console as intentional non-delivery", () => {
    const out = joined({ ...FULL, EMAIL_TRANSPORT: "console" });
    expect(out).toContain("EMAIL_TRANSPORT=console");
    expect(out).not.toContain("RESEND_API_KEY is not set");
  });

  it("flags an unrecognised EMAIL_TRANSPORT value", () => {
    const out = joined({ ...FULL, EMAIL_TRANSPORT: "smtp" });
    expect(out).toContain('"smtp" is not recognised');
  });

  it("flags missing sender and recipient only when Resend is actually in play", () => {
    const noFrom = joined({ ...FULL, EMAIL_FROM: "" });
    expect(noFrom).toContain("EMAIL_FROM is not set");
    const noRecipient = joined({ ...FULL, LEAD_NOTIFY_EMAIL: undefined });
    expect(noRecipient).toContain("LEAD_NOTIFY_EMAIL is not set");

    const withoutKey = joined({
      ...FULL,
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
      LEAD_NOTIFY_EMAIL: undefined,
    });
    expect(withoutKey).not.toContain("EMAIL_FROM is not set");
    expect(withoutKey).not.toContain("LEAD_NOTIFY_EMAIL is not set");
  });

  it("flags a missing AUTH_SECRET with the generator command", () => {
    const out = joined({ ...FULL, AUTH_SECRET: undefined });
    expect(out).toContain("AUTH_SECRET is not set");
    expect(out).toContain("openssl rand -hex 32");
  });

  it("flags a short AUTH_SECRET with its actual length", () => {
    const out = joined({ ...FULL, AUTH_SECRET: "x".repeat(31) });
    expect(out).toContain("AUTH_SECRET is 31 characters (needs 32+)");
    expect(warnings({ ...FULL, AUTH_SECRET: "x".repeat(32) })).toEqual([]);
  });

  it("flags a bootstrap admin that can never be created", () => {
    expect(joined({ ...FULL, ADMIN_BOOTSTRAP_PASSWORD: undefined })).toContain(
      "without ADMIN_BOOTSTRAP_PASSWORD",
    );
    expect(joined({ ...FULL, ADMIN_BOOTSTRAP_PASSWORD: "short" })).toContain(
      "ADMIN_BOOTSTRAP_PASSWORD is 5 characters (needs 12+)",
    );
    expect(joined({ ...FULL, ADMIN_BOOTSTRAP_EMAIL: undefined })).toContain(
      "without ADMIN_BOOTSTRAP_EMAIL",
    );
    expect(warnings(FULL)).toEqual([]);
  });

  it("does not complain about an unset bootstrap admin", () => {
    const out = warnings({
      ...FULL,
      ADMIN_BOOTSTRAP_EMAIL: undefined,
      ADMIN_BOOTSTRAP_PASSWORD: undefined,
    });
    expect(out).toEqual([]);
  });

  it("reports every problem in one pass", () => {
    const out = warnings({});
    expect(out).toHaveLength(2);
    expect(out.join("\n")).toContain("RESEND_API_KEY");
    expect(out.join("\n")).toContain("AUTH_SECRET");
  });
});
