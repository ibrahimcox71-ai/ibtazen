import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { submitLead, type SubmitResult } from "../src/leads";
import { resetRateLimiter } from "../src/rate-limit";
import { setNotificationSender } from "../src/notifications";
import { getPrisma } from "../src/index";
import { dbUrl } from "./setup";

// Real integration tests — the PrismaClient in repository.ts picks up the
// test DATABASE_URL from tests/setup.ts before its first instantiation.
// (Vitest module setup order guarantees env is set before any test imports
// instantiate the client.)

const IP = "203.0.113.7";

const validContact = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines Ltd",
  message: "We need a new customer portal built for our B2B clients.",
  consent: true,
};

describe("submitLead (contact flow)", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("persists a valid contact lead and reports ok", async () => {
    const result: SubmitResult = await submitLead(validContact, IP);
    expect(result.ok).toBe(true);
    expect(result.leadId).toBeDefined();

    const stored = await getPrisma().lead.findUnique({ where: { id: result.leadId! } });
    expect(stored).not.toBeNull();
    expect(stored!.source).toBe("contact");
    expect(stored!.status).toBe("new");
    expect(stored!.consent).toBe(true);
  });

  it("rejects invalid payloads with field errors", async () => {
    const result = await submitLead(
      { name: "A", email: "not-an-email", message: "short", consent: false },
      IP,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid");
    expect(result.fieldErrors).toBeDefined();
    expect(Object.keys(result.fieldErrors!).length).toBeGreaterThan(0);
  });

  it("normalises email and collapses whitespace", async () => {
    const result = await submitLead(
      { ...validContact, email: "  Mixed.Case@Example.COM  ", name: "  Grace   Hopper  " },
      IP,
    );
    expect(result.ok).toBe(true);
    const stored = await getPrisma().lead.findUnique({ where: { id: result.leadId! } });
    expect(stored!.email).toBe("mixed.case@example.com");
    expect(stored!.name).toBe("Grace Hopper");
  });

  it("rejects client-provided privileged fields (mass assignment)", async () => {
    const result = await submitLead(
      { ...validContact, status: "won", notes: "injected", id: "attacker-id" },
      IP,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid");
  });

  it("returns duplicate on resubmission of the identical open lead", async () => {
    const first = await submitLead(
      { ...validContact, email: "dup-check@example.com" },
      "203.0.113.8",
    );
    expect(first.ok).toBe(true);
    const second = await submitLead(
      { ...validContact, email: "dup-check@example.com" },
      "203.0.113.9",
    );
    expect(second.ok).toBe(false);
    expect(second.error).toBe("duplicate");
  });

  it("enforces the per-IP rate limit", async () => {
    resetRateLimiter();
    for (let i = 0; i < 5; i++) {
      const r = await submitLead(
        { ...validContact, email: `ratelimit${i}@example.com` },
        "198.51.100.1",
      );
      expect(r.ok).toBe(true);
    }
    const sixth = await submitLead({ ...validContact, email: "sixth@example.com" }, "198.51.100.1");
    expect(sixth.ok).toBe(false);
    expect(sixth.error).toBe("rate_limited");
  });

  it("reports persistence_failed honestly when the database errors", async () => {
    // Force a storage failure by dropping the table; restore with db push
    // (single-statement raw SQL would work too, but db push stays schema-true).
    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(`DROP TABLE "Lead"`);
    try {
      const r = await submitLead(
        { name: "X Y", email: "x@example.com", message: "Something descriptive.", consent: true },
        "203.0.113.10",
      );
      expect(r.ok).toBe(false);
      expect(r.error).toBe("persistence_failed");
    } finally {
      const npx = process.platform === "win32" ? "npx.cmd" : "npx";
      execSync(`${npx} prisma db push --skip-generate`, {
        cwd: join(__dirname, ".."),
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: "pipe",
      });
    }
  });
});

describe("estimate flow (source=estimate)", () => {
  beforeEach(() => {
    resetRateLimiter();
    setNotificationSender(undefined);
  });

  it("persists an estimate lead with detail JSON", async () => {
    const result = await submitLead(
      {
        name: "Ken Thompson",
        email: "ken-estimate@example.com",
        company: "Bell Labs",
        message: "Multi-service engagement across web and mobile with an ads budget of 6k/month.",
        consent: true,
        detail: {
          services: "web-app,mobile-app",
          features: "auth,payments,analytics",
          pages: "6-12",
          budgetBand: "50k-100k",
          timeline: "2-3-months",
        },
      },
      "203.0.113.11",
      "estimate",
    );
    expect(result.ok).toBe(true);
    const stored = await getPrisma().lead.findUnique({ where: { id: result.leadId! } });
    expect(stored!.source).toBe("estimate");
    const detail = JSON.parse(stored!.detail!) as Record<string, string>;
    expect(detail.services).toBe("web-app,mobile-app");
    expect(detail.features).toBe("auth,payments,analytics");
  });

  it("fires the notification seam once per accepted lead", async () => {
    const seen: string[] = [];
    setNotificationSender(async (p) => {
      seen.push(p.lead.id);
      return { delivered: true };
    });
    const r = await submitLead(
      {
        name: "Notes Taker",
        email: "notes-estimate@example.com",
        message: "Please send over the tailored proposal for our migration.",
        consent: true,
      },
      "203.0.113.12",
      "estimate",
    );
    expect(r.ok).toBe(true);
    expect(seen).toEqual([r.leadId!]);
    setNotificationSender(undefined);
  });

  it("rejects payloads carrying a client-supplied source", async () => {
    const r = await submitLead(
      {
        name: "Sneaky Source",
        email: "sneaky-source@example.com",
        message: "Attempting to set an arbitrary source value here.",
        consent: true,
        source: "admin",
      },
      "203.0.113.13",
      "contact",
    );
    // Strict schema: unknown fields are a mass-assignment attempt → rejected.
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid");
  });
});

afterAll(async () => {
  await getPrisma().$disconnect();
});
