import { describe, expect, it, vi } from "vitest";
import {
  MAX_MESSAGE_LENGTH,
  createWindowCounter,
  errorFingerprint,
  parseErrorReport,
  toErrorReport,
} from "@/lib/telemetry/core";
import { createWebReporter } from "@/lib/telemetry/report";
import { ingestClientError, logErrorReport, logRequestError } from "@/lib/telemetry/ingest";
import { GET as healthGET } from "@/app/api/health/route";
import { POST as ingestPOST } from "@/app/api/client-errors/route";

/** Each ingest test gets its own key so the shared per-IP budget never bleeds. */
let ipSeq = 0;
function nextIp(): string {
  ipSeq += 1;
  return `10.0.0.${ipSeq}`;
}

function validReportBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    v: 1,
    name: "TypeError",
    message: "boom",
    route: "/contact",
    source: "error",
    at: "2026-09-27T12:00:00.000Z",
    ...overrides,
  });
}

describe("toErrorReport", () => {
  it("normalises a real Error and keeps Next's digest", () => {
    const error = Object.assign(new TypeError("render failed"), { digest: "abc123" });
    const report = toErrorReport({ error, route: "/services?x=1#y", source: "error" });

    expect(report).toMatchObject({
      v: 1,
      name: "TypeError",
      message: "render failed",
      digest: "abc123",
      route: "/services",
      source: "error",
    });
    expect(report.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles non-Error throws without blowing up", () => {
    expect(toErrorReport({ error: "just a string", route: "", source: "error" })).toMatchObject({
      name: "NonError",
      message: "just a string",
      route: "/",
    });
    expect(toErrorReport({ error: undefined, route: "/x", source: "error" })).toMatchObject({
      name: "NonError",
      message: "undefined",
    });
    expect(toErrorReport({ error: 42n, route: "/x", source: "error" }).message).toBe("42n");
    expect(
      toErrorReport({ error: { message: { nested: true } }, route: "/x", source: "error" }).message,
    ).toBe('{"message":{"nested":true}}');
  });

  it("clamps oversized fields", () => {
    const report = toErrorReport({
      error: new Error("m".repeat(2_000)),
      route: `/${"p".repeat(500)}`,
      source: "global-error",
    });
    expect(report.message).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(report.route.length).toBeLessThanOrEqual(200);
    expect(report.route.startsWith("/p")).toBe(true);
  });

  it("reads digest only when it is a string", () => {
    expect(
      toErrorReport({
        error: Object.assign(new Error("a"), { digest: 5 }),
        route: "/",
        source: "error",
      }),
    ).not.toHaveProperty("digest");
    expect(toErrorReport({ error: "plain", route: "/", source: "error" })).not.toHaveProperty(
      "digest",
    );
  });
});

describe("errorFingerprint", () => {
  it("separates the same throw on different routes and by source", () => {
    const base = toErrorReport({ error: new Error("x"), route: "/a", source: "error" });
    const otherRoute = toErrorReport({ error: new Error("x"), route: "/b", source: "error" });
    const otherSource = toErrorReport({ error: new Error("x"), route: "/a", source: "request" });
    expect(errorFingerprint(base)).not.toBe(errorFingerprint(otherRoute));
    expect(errorFingerprint(base)).not.toBe(errorFingerprint(otherSource));
  });
});

describe("createWindowCounter", () => {
  it("allows `limit` hits per key per window, then rejects", () => {
    const counter = createWindowCounter({ limit: 2, windowMs: 1_000 });
    const t = 10_000;
    expect(counter.hit("a", t)).toBe(true);
    expect(counter.hit("a", t + 10)).toBe(true);
    expect(counter.hit("a", t + 20)).toBe(false);
    expect(counter.hit("a", t + 999)).toBe(false);
    // keys are independent
    expect(counter.hit("b", t)).toBe(true);
  });

  it("reopens the window after it expires", () => {
    const counter = createWindowCounter({ limit: 1, windowMs: 1_000 });
    expect(counter.hit("a", 0)).toBe(true);
    expect(counter.hit("a", 500)).toBe(false);
    expect(counter.hit("a", 1_000)).toBe(true);
  });

  it("stays bounded under key churn", () => {
    const counter = createWindowCounter({ limit: 1, windowMs: 60_000, maxKeys: 5 });
    for (let i = 0; i < 50; i += 1) counter.hit(`k${i}`, 0);
    expect(counter.size()).toBeLessThanOrEqual(5);
  });
});

describe("parseErrorReport", () => {
  it("accepts a well-formed report and ignores unknown fields", () => {
    const report = parseErrorReport(validReportBody({ injected: true }));
    expect(report).toMatchObject({ name: "TypeError", message: "boom", route: "/contact" });
  });

  it("rejects malformed payloads", () => {
    expect(parseErrorReport("not json")).toBeNull();
    expect(parseErrorReport("[1,2,3]")).toBeNull();
    expect(parseErrorReport(JSON.stringify(null))).toBeNull();
    expect(parseErrorReport(123 as unknown as string)).toBeNull();
    expect(parseErrorReport(validReportBody({ v: 2 }))).toBeNull();
    expect(parseErrorReport(validReportBody({ source: "root" }))).toBeNull();
    expect(parseErrorReport(validReportBody({ message: 42 }))).toBeNull();
    expect(parseErrorReport(validReportBody({ route: 7 }))).toBeNull();
    expect(parseErrorReport(validReportBody({ message: "" }))).toBeNull();
  });

  it("truncates instead of rejecting over-long fields", () => {
    const report = parseErrorReport(validReportBody({ message: "m".repeat(5_000) }));
    expect(report?.message).toHaveLength(MAX_MESSAGE_LENGTH);
  });

  it("keeps only the path when a query string sneaks in", () => {
    const report = parseErrorReport(validReportBody({ route: "/leads?token=secret" }));
    expect(report?.route).toBe("/leads");
  });
});

describe("createWebReporter", () => {
  it("sends once per fingerprint and suppresses the repeat", () => {
    const sent: unknown[] = [];
    let t = 1_000;
    const report = createWebReporter({
      transport: (r) => sent.push(r),
      now: () => t,
      dedupeWindowMs: 30_000,
    });
    const error = new Error("render failed");

    expect(report(error, { route: "/pricing", source: "error" })).toBe(true);
    expect(report(error, { route: "/pricing", source: "error" })).toBe(false);
    expect(report(error, { route: "/faq", source: "error" })).toBe(true);
    t += 31_000;
    expect(report(error, { route: "/pricing", source: "error" })).toBe(true);
    expect(sent).toHaveLength(3);
  });

  it("respects the per-minute send budget", () => {
    const sent: unknown[] = [];
    const report = createWebReporter({
      transport: (r) => sent.push(r),
      now: () => 0,
      limit: 2,
      dedupeWindowMs: 1,
    });
    for (let i = 0; i < 10; i += 1) report(new Error(`e${i}`), { route: "/", source: "error" });
    expect(sent).toHaveLength(2);
  });

  it("never throws when the transport fails", () => {
    const report = createWebReporter({
      transport: () => {
        throw new Error("transport down");
      },
      now: () => 0,
    });
    expect(report(new Error("x"), { route: "/", source: "error" })).toBe(false);
  });
});

describe("ingestClientError", () => {
  it("logs a valid report and answers 204", () => {
    const logs: unknown[] = [];
    const result = ingestClientError({
      body: validReportBody(),
      ip: nextIp(),
      log: (r) => logs.push(r),
    });
    expect(result.status).toBe(204);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ name: "TypeError", source: "error" });
  });

  it("answers 400 for malformed payloads without logging", () => {
    const logs: unknown[] = [];
    expect(
      ingestClientError({ body: "not json", ip: nextIp(), log: (r) => logs.push(r) }).status,
    ).toBe(400);
    expect(
      ingestClientError({ body: validReportBody({ v: 9 }), ip: nextIp(), log: (r) => logs.push(r) })
        .status,
    ).toBe(400);
    expect(logs).toHaveLength(0);
  });

  it("answers 413 when the body exceeds the wire cap", () => {
    const body = validReportBody({ message: "m".repeat(10_000) });
    expect(ingestClientError({ body, ip: nextIp() }).status).toBe(413);
  });

  it("answers 429 once one IP exhausts its budget, others unaffected", () => {
    const ip = nextIp();
    for (let i = 0; i < 20; i += 1) {
      expect(ingestClientError({ body: validReportBody(), ip, now: 0 }).status).toBe(204);
    }
    expect(ingestClientError({ body: validReportBody(), ip, now: 0 }).status).toBe(429);
    expect(ingestClientError({ body: validReportBody(), ip: nextIp(), now: 0 }).status).toBe(204);
  });

  it("still answers 204 when the log sink throws", () => {
    expect(
      ingestClientError({
        body: validReportBody(),
        ip: nextIp(),
        log: () => {
          throw new Error("sink down");
        },
      }).status,
    ).toBe(204);
  });
});

describe("route handlers", () => {
  it("POST /api/client-errors maps the body and the forwarded IP", async () => {
    const request = new Request("http://localhost/api/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: validReportBody(),
    });
    const response = await ingestPOST(request);
    expect(response.status).toBe(204);

    const spam = new Request("http://localhost/api/client-errors", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9" },
      body: "not json",
    });
    expect((await ingestPOST(spam)).status).toBe(400);
  });

  it("GET /api/health reports liveness without caching", async () => {
    const response = await healthGET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = (await response.json()) as { status: string; uptimeSeconds: number };
    expect(payload.status).toBe("ok");
    expect(payload.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe("logRequestError", () => {
  it("emits one structured line with method and route type", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      logRequestError({
        error: Object.assign(new Error("handler exploded"), { digest: "d1" }),
        request: { path: "/admin/leads", method: "POST" },
        context: { routePath: "/admin/leads", routeType: "action" },
      });
      expect(spy).toHaveBeenCalledTimes(1);
      const [prefix, payload] = spy.mock.calls[0] as [string, string];
      expect(prefix).toBe("[web:request-error]");
      expect(JSON.parse(payload)).toMatchObject({
        name: "Error",
        message: "handler exploded",
        digest: "d1",
        route: "/admin/leads",
        method: "POST",
        routeType: "action",
        source: "request",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("swallows anything the sink or input throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(() => logRequestError({ error: undefined })).not.toThrow();
      expect(() => logRequestError({ error: { message: { a: 1 } } })).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});

describe("logErrorReport", () => {
  it("writes a single JSON line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      logErrorReport({
        v: 1,
        name: "Error",
        message: "x",
        route: "/",
        source: "error",
        at: "2026-09-27T12:00:00.000Z",
      });
      expect(spy).toHaveBeenCalledWith("[web:error]", expect.stringContaining('"message":"x"'));
    } finally {
      spy.mockRestore();
    }
  });
});
