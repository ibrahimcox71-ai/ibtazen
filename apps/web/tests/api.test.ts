import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/leads/route";
import { MAX_JSON_BODY_BYTES, readJsonBody, requestClientIp } from "@/lib/api";

const { submitLeadMock } = vi.hoisted(() => ({ submitLeadMock: vi.fn() }));
vi.mock("@ibtatech/leads", () => ({ submitLead: submitLeadMock }));

beforeEach(() => {
  submitLeadMock.mockReset();
});

const URL_ = "http://localhost:3000/api/leads";

function leadBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "We need a checkout rebuild for our storefront.",
    consent: true,
    ...overrides,
  };
}

function post(body: string, contentType = "application/json"): Request {
  return new Request(URL_, {
    method: "POST",
    body,
    headers: { "content-type": contentType, "x-forwarded-for": "203.0.113.7" },
  });
}

function errorBody(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("readJsonBody", () => {
  it("accepts a JSON object", async () => {
    const read = await readJsonBody(post(JSON.stringify({ a: 1 })));
    expect(read).toEqual({ ok: true, body: { a: 1 } });
  });

  it("rejects a missing or non-JSON content type", async () => {
    const read = await readJsonBody(post(JSON.stringify({}), "text/plain"));
    expect(read).toMatchObject({
      ok: false,
      status: 415,
      error: { code: "unsupported_media_type" },
    });
  });

  it("rejects malformed JSON and non-object roots", async () => {
    expect(await readJsonBody(post("{nope"))).toMatchObject({
      ok: false,
      status: 400,
      error: { code: "invalid_request" },
    });
    expect(await readJsonBody(post("[1,2]"))).toMatchObject({
      ok: false,
      status: 400,
      error: { code: "invalid_request" },
    });
    expect(await readJsonBody(post("null"))).toMatchObject({
      ok: false,
      status: 400,
      error: { code: "invalid_request" },
    });
  });

  it("rejects bodies over the size cap before parsing", async () => {
    const oversized = JSON.stringify({ message: "m".repeat(MAX_JSON_BODY_BYTES) });
    const read = await readJsonBody(post(oversized));
    expect(read).toMatchObject({ ok: false, status: 413, error: { code: "payload_too_large" } });
  });
});

describe("requestClientIp", () => {
  it("reads the first forwarded hop, then real-ip, then unknown", () => {
    expect(requestClientIp(post("{}", "application/json"))).toBe("203.0.113.7");
    const realIp = new Request(URL_, { headers: { "x-real-ip": "198.51.100.4" } });
    expect(requestClientIp(realIp)).toBe("198.51.100.4");
    expect(requestClientIp(new Request(URL_))).toBe("unknown");
  });
});

describe("POST /api/leads", () => {
  it("creates a contact lead and returns 201 with the id", async () => {
    submitLeadMock.mockResolvedValueOnce({ ok: true, leadId: "c1" });

    const response = await POST(post(JSON.stringify(leadBody())));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, leadId: "c1" });
    const [payload, ip, source] = submitLeadMock.mock.calls[0] as [unknown, string, string];
    expect(payload).toEqual(leadBody());
    expect(ip).toBe("203.0.113.7");
    expect(source).toBe("contact");
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("forwards an explicit estimate source and strips it from the payload", async () => {
    submitLeadMock.mockResolvedValueOnce({ ok: true, leadId: "c2" });

    const response = await POST(post(JSON.stringify(leadBody({ source: "estimate" }))));

    expect(response.status).toBe(201);
    const [payload, , source] = submitLeadMock.mock.calls[0] as [
      Record<string, unknown>,
      string,
      string,
    ];
    expect(source).toBe("estimate");
    expect(payload).not.toHaveProperty("source");
  });

  it("rejects a source outside the public allowlist", async () => {
    const response = await POST(post(JSON.stringify(leadBody({ source: "won" }))));

    expect(response.status).toBe(400);
    expect(await errorBody(response)).toMatchObject({
      code: "invalid_request",
      field: "source",
    });
    expect(submitLeadMock).not.toHaveBeenCalled();
  });

  it("maps invalid payloads to 400 with field and fieldErrors", async () => {
    submitLeadMock.mockResolvedValueOnce({
      ok: false,
      error: "invalid",
      fieldErrors: { email: "Enter a valid email address", consent: "Consent is required" },
    });

    const response = await POST(post(JSON.stringify(leadBody())));

    expect(response.status).toBe(400);
    expect(await errorBody(response)).toMatchObject({
      code: "invalid",
      message: "Enter a valid email address",
      field: "email",
      fieldErrors: { email: "Enter a valid email address", consent: "Consent is required" },
    });
  });

  it("maps rate limiting to 429 with Retry-After", async () => {
    submitLeadMock.mockResolvedValueOnce({ ok: false, error: "rate_limited" });

    const response = await POST(post(JSON.stringify(leadBody())));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
    expect(await errorBody(response)).toMatchObject({ code: "rate_limited" });
  });

  it("maps a duplicate open lead to 409", async () => {
    submitLeadMock.mockResolvedValueOnce({ ok: false, error: "duplicate" });

    const response = await POST(post(JSON.stringify(leadBody())));

    expect(response.status).toBe(409);
    expect(await errorBody(response)).toMatchObject({ code: "duplicate", field: "email" });
  });

  it("never leaks persistence details on 500", async () => {
    submitLeadMock.mockResolvedValueOnce({ ok: false, error: "persistence_failed" });

    const response = await POST(post(JSON.stringify(leadBody())));

    expect(response.status).toBe(500);
    const body = await errorBody(response);
    expect(body).toEqual({
      code: "internal_error",
      message: "The lead could not be saved. Try again later.",
    });
  });

  it("rejects a non-JSON content type without calling the engine", async () => {
    const response = await POST(
      post(JSON.stringify(leadBody()), "application/x-www-form-urlencoded"),
    );

    expect(response.status).toBe(415);
    expect(await errorBody(response)).toMatchObject({ code: "unsupported_media_type" });
    expect(submitLeadMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/leads", () => {
  it("answers 405 with the ApiError contract and Allow header", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(await errorBody(response)).toMatchObject({ code: "method_not_allowed" });
  });
});
