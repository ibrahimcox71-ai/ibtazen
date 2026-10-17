import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmailMessage } from "../src/email";
import { createConsoleTransport, createResendTransport } from "../src/email";
import {
  renderInvoiceIssuedEmail,
  renderProposalSentEmail,
  type ContactPerson,
} from "../src/email-templates";
import type { InvoiceWithRelations, ProposalWithCreator } from "../src/repository";
import {
  invoicePdfFromRow,
  proposalPdfFromRow,
  renderInvoicePdf,
  renderProposalPdf,
  type InvoicePdfInput,
} from "../src/pdf";

function decode(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
}

function expectValidPdf(text: string): void {
  expect(text.startsWith("%PDF-1.4\n")).toBe(true);
  expect(text.endsWith("%%EOF\n")).toBe(true);

  const match = /startxref\n(\d+)\n%%EOF\n$/.exec(text);
  expect(match).not.toBeNull();
  const xrefOffset = Number(match![1]);
  expect(text.startsWith("xref\n", xrefOffset)).toBe(true);

  const xrefLines = text.slice(xrefOffset).split("\n");
  expect(xrefLines[0]).toBe("xref");
  const header = xrefLines[1]!.split(" ");
  expect(header[0]).toBe("0");
  const objectCount = Number(header[1]) - 1;
  expect(objectCount).toBeGreaterThanOrEqual(6);

  for (let num = 1; num <= objectCount; num++) {
    const entry = xrefLines[num + 2]!.replace(/\r$/, "");
    expect(entry).toHaveLength(18);
    expect(entry.slice(11, 16)).toBe("00000");
    expect(entry.slice(17)).toBe("n");
    const offset = Number(entry.slice(0, 10));
    expect(text.startsWith(`${num} 0 obj\n`, offset)).toBe(true);
  }

  const streamPattern = /<< \/Length (\d+) >>\nstream\n/g;
  let stream: RegExpExecArray | null;
  let streamCount = 0;
  while ((stream = streamPattern.exec(text)) !== null) {
    streamCount += 1;
    const dataStart = stream.index + stream[0].length;
    expect(text.startsWith("\nendstream", dataStart + Number(stream[1]))).toBe(true);
  }
  expect(streamCount).toBeGreaterThan(0);
}

function invoiceInput(): InvoicePdfInput {
  return {
    invoiceNumber: "INV-2026-0042",
    title: "Website rebuild",
    status: "issued",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    currency: "GBP",
    lines: [
      { description: "Discovery", quantity: 1, unitPriceMinor: 150000 },
      { description: "Build", quantity: 2, unitPriceMinor: 500000 },
    ],
    subtotalMinor: 1150000,
    totalMinor: 1150000,
    engagement: "Platform rebuild",
    billedTo: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      organization: "Analytical Engines Ltd",
    },
    reference: "cmo0invoice000000000000001",
  };
}

function invoiceRowFixture(): InvoiceWithRelations {
  return {
    id: "cmo0invoice000000000000001",
    invoiceNumber: "INV-2026-0042",
    status: "issued",
    currency: "GBP",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    title: "Website rebuild",
    lines: JSON.stringify([{ description: "Discovery", quantity: 1, unitPriceMinor: 150000 }]),
    subtotalMinor: 150000,
    totalMinor: 150000,
    contractId: "cmo0contract00000000000001",
    createdById: "cmo0admin0000000000000001",
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    contract: {
      title: "Platform rebuild",
      client: {
        id: "cmo0client000000000000001",
        name: "Ada Lovelace",
        email: "ada@example.com",
        organizationName: "Analytical Engines Ltd",
        leadId: "cmo0lead0000000000000001",
      },
      projects: [],
    },
    createdBy: { id: "cmo0admin0000000000000001", name: "Admin", email: "admin@ibtatech.com" },
  } as unknown as InvoiceWithRelations;
}

function proposalRowFixture(): ProposalWithCreator {
  return {
    id: "cmo0proposal0000000000001",
    version: 3,
    status: "sent",
    title: "CRM build",
    currency: "GBP",
    validUntil: "2026-10-31",
    notes: "Two phases, fixed price.",
    lines: JSON.stringify([
      { description: "Design", quantity: 1, unitPriceMinor: 1000000 },
      { description: "Build", quantity: 1, unitPriceMinor: 1500000 },
    ]),
    subtotalMinor: 2500000,
    totalMinor: 2500000,
    leadId: "cmo0lead0000000000000001",
    createdById: "cmo0admin0000000000000001",
    createdAt: new Date("2026-09-10T10:00:00.000Z"),
    createdBy: { id: "cmo0admin0000000000000001", name: "Admin", email: "admin@ibtatech.com" },
  } as unknown as ProposalWithCreator;
}

const leadContact: ContactPerson = {
  id: "cmo0lead0000000000000001",
  name: "Ada Lovelace",
  email: "ada@example.com",
};

describe("invoice PDF rendering", () => {
  it("produces a structurally valid PDF with the invoice facts", () => {
    const doc = renderInvoicePdf(invoiceInput());
    const text = decode(doc.bytes);

    expectValidPdf(text);
    expect(doc.contentType).toBe("application/pdf");
    expect(doc.filename).toBe("invoice-INV-2026-0042.pdf");
    expect(text).toContain("INVOICE");
    expect(text).toContain("INV-2026-0042");
    expect(text).toContain("BILLED TO");
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("Analytical Engines Ltd");
    expect(text).toContain("Website rebuild");
    expect(text).toContain("Platform rebuild");
    expect(text).toContain("Discovery");
    expect(text).toContain("1500.00");
    expect(text).toContain("11500.00 GBP");
    expect(text).toContain("Ref cmo0invoice000000000000001");
    expect(text).toContain("Page 1 of 1");
  });

  it("escapes PDF string delimiters in user content", () => {
    const doc = renderInvoicePdf({
      ...invoiceInput(),
      title: "Phase 1 (draft) \\ notes",
      lines: [{ description: "Notes (v2) \\ final", quantity: 1, unitPriceMinor: 1000 }],
      subtotalMinor: 1000,
      totalMinor: 1000,
    });
    const text = decode(doc.bytes);

    expectValidPdf(text);
    expect(text).toContain("Phase 1 \\(draft\\) \\\\ notes");
    expect(text).toContain("Notes \\(v2\\) \\\\ final");
  });

  it("paginates long line-item tables", () => {
    const lines = Array.from({ length: 40 }, (_, index) => ({
      description: `Work item ${index + 1}`,
      quantity: 1,
      unitPriceMinor: 10000,
    }));
    const doc = renderInvoicePdf({
      ...invoiceInput(),
      lines,
      subtotalMinor: 400000,
      totalMinor: 400000,
    });
    const text = decode(doc.bytes);

    expectValidPdf(text);
    const pageCount = (text.match(/\/Type \/Page(?!s)/g) ?? []).length;
    expect(pageCount).toBeGreaterThanOrEqual(2);
    expect(text).toContain(`Page 1 of ${pageCount}`);
    expect(text).toContain(`Page ${pageCount} of ${pageCount}`);
    expect(text).toContain("continued");
    expect(text).toContain("Work item 40");
  });

  it("maps a stored invoice row into PDF input", () => {
    const input = invoicePdfFromRow(invoiceRowFixture());

    expect(input.invoiceNumber).toBe("INV-2026-0042");
    expect(input.lines).toEqual([
      { description: "Discovery", quantity: 1, unitPriceMinor: 150000 },
    ]);
    expect(input.billedTo).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      organization: "Analytical Engines Ltd",
    });
    expect(input.engagement).toBe("Platform rebuild");
    expect(input.reference).toBe("cmo0invoice000000000000001");
  });
});

describe("proposal PDF rendering", () => {
  it("produces a valid PDF with prepared-for, totals and notes", () => {
    const doc = renderProposalPdf(proposalPdfFromRow(proposalRowFixture(), "Ada Lovelace"));
    const text = decode(doc.bytes);

    expectValidPdf(text);
    expect(doc.filename).toBe("proposal-v3-crm-build.pdf");
    expect(text).toContain("PROPOSAL");
    expect(text).toContain("Version 3");
    expect(text).toContain("PREPARED FOR");
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("CRM build");
    expect(text).toContain("2026-10-31");
    expect(text).toContain("Design");
    expect(text).toContain("25000.00 GBP");
    expect(text).toContain("Two phases, fixed price.");
  });
});

describe("document emails carry the PDF attachment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the invoice PDF to the issued-invoice email", () => {
    const message = renderInvoiceIssuedEmail(invoiceRowFixture());
    expect(message).not.toBeNull();

    const attachments = message!.attachments ?? [];
    expect(attachments).toHaveLength(1);
    const attachment = attachments[0]!;
    expect(attachment.filename).toBe("invoice-INV-2026-0042.pdf");
    const text = decode(attachment.content);
    expectValidPdf(text);
    expect(text).toContain("INV-2026-0042");
  });

  it("attaches the proposal PDF to the proposal-sent email", () => {
    const message = renderProposalSentEmail(proposalRowFixture(), leadContact);
    expect(message).not.toBeNull();

    const attachments = message!.attachments ?? [];
    expect(attachments).toHaveLength(1);
    const attachment = attachments[0]!;
    expect(attachment.filename).toBe("proposal-v3-crm-build.pdf");
    const text = decode(attachment.content);
    expectValidPdf(text);
    expect(text).toContain("CRM build");
  });
});

describe("transport attachment handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts attachments to resend as base64", async () => {
    const calls: { init: RequestInit }[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      calls.push({ init });
      return { ok: true, status: 200, text: async () => "" } as unknown as Response;
    }) as unknown as typeof fetch;

    const bytes = renderInvoicePdf(invoiceInput()).bytes;
    const transport = createResendTransport({ apiKey: "re_test_key", fetchImpl });
    const result = await transport({
      to: "ada@example.com",
      subject: "Invoice INV-2026-0042",
      html: "<p>invoice</p>",
      text: "invoice",
      attachments: [{ filename: "invoice-INV-2026-0042.pdf", content: bytes }],
    });

    expect(result).toEqual({ delivered: true });
    const body = JSON.parse(String(calls[0]!.init.body)) as Record<string, unknown>;
    expect(body.attachments).toEqual([
      { filename: "invoice-INV-2026-0042.pdf", content: Buffer.from(bytes).toString("base64") },
    ]);
  });

  it("logs attachment filenames without claiming delivery on the console transport", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const message: EmailMessage = {
      to: "ada@example.com",
      subject: "Invoice INV-2026-0042",
      html: "<p>invoice</p>",
      text: "invoice",
      attachments: [
        { filename: "invoice-INV-2026-0042.pdf", content: new Uint8Array([37, 80, 68, 70]) },
      ],
    };

    const result = await createConsoleTransport()(message);

    expect(result).toEqual({ delivered: false, error: "no provider configured" });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]?.[0])).toContain("invoice-INV-2026-0042.pdf");
  });
});
