import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE } from "@ibtatech/config";
import type { EmailMessage } from "../src/email";
import type { Lead } from "../src/repository";
import { submitLead } from "../src/leads";
import { notifyNewLead } from "../src/notifications";
import { resetRateLimiter } from "../src/rate-limit";
import {
  createConsoleTransport,
  createResendTransport,
  describeEmailTransport,
  sendEmail,
  setEmailTransport,
} from "../src/email";
import {
  escapeHtml,
  renderLeadAcknowledgementEmail,
  renderLeadNoticeEmail,
} from "../src/email-templates";

function leadFixture(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "cmo0leadfixture00000000001",
    createdAt: new Date("2026-01-05T10:00:00.000Z"),
    updatedAt: new Date("2026-01-05T10:00:00.000Z"),
    openLeadKey: "ada@example.com::contact",
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+44 20 7946 0000",
    company: "Analytical Engines Ltd",
    website: "https://example.com",
    country: "United Kingdom",
    source: "contact",
    status: "new",
    budgetBand: "10k-50k",
    timeline: "1-3-months",
    message: "We need a new platform for order tracking.",
    consent: true,
    marketingConsent: false,
    notes: null,
    detail: null,
    assignedToId: null,
    ...overrides,
  } as Lead;
}

function clearEmailEnv(): void {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_TRANSPORT;
  delete process.env.LEAD_NOTIFY_EMAIL;
  delete process.env.EMAIL_FROM;
}

function captureTransport(seen: EmailMessage[]) {
  return vi.fn(async (message: EmailMessage) => {
    seen.push(message);
    return { delivered: true };
  });
}

describe("lead notification emails", () => {
  beforeEach(() => {
    clearEmailEnv();
    setEmailTransport(undefined);
  });

  afterEach(() => {
    setEmailTransport(undefined);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearEmailEnv();
  });

  it("sends an admin notice and a submitter acknowledgement", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    const result = await notifyNewLead({ lead: leadFixture() });

    expect(result.delivered).toBe(true);
    expect(result.provider).toBe("console");
    expect(seen).toHaveLength(2);

    const notice = seen[0]!;
    const acknowledgement = seen[1]!;

    expect(notice.to).toBe(SITE.email);
    expect(notice.subject).toContain("New contact form lead: Ada Lovelace");
    expect(notice.replyTo).toBe("ada@example.com");
    expect(notice.tags).toContainEqual({ name: "type", value: "lead-notice" });
    expect(notice.html).toContain("Analytical Engines Ltd");
    expect(notice.text).toContain("Lead ID: cmo0leadfixture00000000001");
    expect(notice.html).toContain("/admin/leads/cmo0leadfixture00000000001");

    expect(acknowledgement.to).toBe("ada@example.com");
    expect(acknowledgement.subject).toContain("Thanks Ada");
    expect(acknowledgement.replyTo).toBe(SITE.email);
    expect(acknowledgement.html).toContain("Thanks for contacting Ibtatech");
    expect(acknowledgement.text).toContain("order tracking");
  });

  it("routes the admin notice to LEAD_NOTIFY_EMAIL when configured", async () => {
    vi.stubEnv("LEAD_NOTIFY_EMAIL", "ops@ibtatech.com");
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    await notifyNewLead({ lead: leadFixture() });

    expect(seen[0]!.to).toBe("ops@ibtatech.com");
  });

  it("skips the acknowledgement when the lead has no email address", async () => {
    const seen: EmailMessage[] = [];
    setEmailTransport(captureTransport(seen));

    const result = await notifyNewLead({ lead: leadFixture({ email: "  " }) });

    expect(result.delivered).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.subject).toContain("New contact form lead");
  });

  it("reports failure instead of throwing when the transport rejects", async () => {
    setEmailTransport(async () => {
      throw new Error("provider exploded");
    });

    const result = await notifyNewLead({ lead: leadFixture() });

    expect(result.delivered).toBe(false);
    expect(result.error).toContain("provider exploded");
  });

  it("logs delivered: true when the submit's mail goes out", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    setEmailTransport(async () => ({ delivered: true }));

    await notifyNewLead({ lead: leadFixture() });

    expect(info).toHaveBeenCalledWith(
      "[notifications] lead notice delivered: true (provider=console)",
    );
  });

  it("logs delivered: false with the provider and error", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    setEmailTransport(async () => ({ delivered: false, error: "smtp down" }));

    const result = await notifyNewLead({ lead: leadFixture() });

    expect(result.delivered).toBe(false);
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining(
        "[notifications] lead notice delivered: false (provider=console): smtp down",
      ),
    );
  });

  it("still stores the lead when email delivery fails", async () => {
    resetRateLimiter();
    setEmailTransport(async () => ({ delivered: false, error: "smtp down" }));

    const result = await submitLead(
      {
        name: "Grace Hopper",
        email: "grace-email-test@example.com",
        message: "Compiler work needs a platform.",
        consent: true,
      },
      "203.0.113.90",
      "contact",
    );

    expect(result.ok).toBe(true);
    expect(result.leadId).toBeTruthy();
  });

  it("escapes lead content before it reaches the HTML body", () => {
    const notice = renderLeadNoticeEmail(
      leadFixture({ name: '<script>alert("x")</script>', message: "Hello <b>there</b>" }),
    );

    expect(notice.html).not.toContain("<script>alert");
    expect(notice.html).toContain(escapeHtml('<script>alert("x")</script>'));
    expect(notice.html).not.toContain("<b>there</b>");
    expect(notice.text).toContain('<script>alert("x")</script>');
  });

  it("renders no acknowledgement for an empty recipient", () => {
    expect(renderLeadAcknowledgementEmail(leadFixture({ email: "" }))).toBeNull();
  });
});

describe("email transport selection", () => {
  beforeEach(() => {
    clearEmailEnv();
    setEmailTransport(undefined);
  });

  afterEach(() => {
    setEmailTransport(undefined);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearEmailEnv();
  });

  it("defaults to the console transport and never claims delivery", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await sendEmail({
      to: "someone@example.com",
      subject: "Hi",
      html: "<p>hi</p>",
      text: "hi",
    });

    expect(result).toEqual({ delivered: false, error: "no provider configured" });
    expect(describeEmailTransport()).toBe("console");
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]?.[0])).toContain("someone@example.com");
  });

  it("selects resend when RESEND_API_KEY is set and console when forced", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    expect(describeEmailTransport()).toBe("resend");

    vi.stubEnv("EMAIL_TRANSPORT", "console");
    expect(describeEmailTransport()).toBe("console");
  });
});

describe("resend transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the expected payload to the resend API", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => "" } as unknown as Response;
    }) as unknown as typeof fetch;

    const transport = createResendTransport({ apiKey: "re_test_key", fetchImpl });
    const result = await transport({
      to: "ada@example.com",
      subject: "Welcome",
      html: "<p>Welcome</p>",
      text: "Welcome",
      replyTo: "hello@ibtatech.com",
      tags: [{ name: "type", value: "lead-notice" }],
    });

    expect(result).toEqual({ delivered: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test_key",
    );

    const body = JSON.parse(String(calls[0]!.init.body)) as Record<string, unknown>;
    expect(body.from).toContain(SITE.email);
    expect(body.to).toEqual(["ada@example.com"]);
    expect(body.subject).toBe("Welcome");
    expect(body.html).toBe("<p>Welcome</p>");
    expect(body.text).toBe("Welcome");
    expect(body.reply_to).toBe("hello@ibtatech.com");
    expect(body.tags).toEqual([{ name: "type", value: "lead-notice" }]);
  });

  it("surfaces API rejections as an undelivered result", async () => {
    const fetchImpl = (async () =>
      ({
        ok: false,
        status: 422,
        text: async () => "Invalid from address",
      }) as unknown as Response) as unknown as typeof fetch;

    const transport = createResendTransport({ apiKey: "re_test_key", fetchImpl });
    const result = await transport({
      to: "a@example.com",
      subject: "x",
      html: "<p>x</p>",
      text: "x",
    });

    expect(result.delivered).toBe(false);
    expect(result.error).toContain("resend 422");
    expect(result.error).toContain("Invalid from address");
  });

  it("surfaces network errors as an undelivered result", async () => {
    const fetchImpl = (async () => {
      throw new Error("connect ETIMEDOUT");
    }) as unknown as typeof fetch;

    const transport = createResendTransport({ apiKey: "re_test_key", fetchImpl });
    const result = await transport({
      to: "a@example.com",
      subject: "x",
      html: "<p>x</p>",
      text: "x",
    });

    expect(result).toEqual({ delivered: false, error: "connect ETIMEDOUT" });
  });

  it("reports console delivery when no API key exists", async () => {
    const transport = createConsoleTransport();
    const result = await transport({
      to: "a@example.com",
      subject: "x",
      html: "<p>x</p>",
      text: "x",
    });

    expect(result).toEqual({ delivered: false, error: "no provider configured" });
  });
});
