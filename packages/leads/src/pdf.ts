import { SITE } from "@ibtatech/config";
import { formatMinorToMajor, type ProposalLine } from "./domain";
import {
  parseProposalLines,
  type InvoiceWithRelations,
  type ProposalWithCreator,
} from "./repository";

export interface PdfAttachment {
  filename: string;
  contentType: "application/pdf";
  bytes: Uint8Array;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  title: string;
  status?: string | null;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  lines: ProposalLine[];
  subtotalMinor: number;
  totalMinor: number;
  engagement?: string | null;
  billedTo?: { name: string; email?: string | null; organization?: string | null } | null;
  reference?: string | null;
}

export interface ProposalPdfInput {
  title: string;
  version: number;
  status?: string | null;
  currency: string;
  validUntil: string;
  notes?: string | null;
  lines: ProposalLine[];
  subtotalMinor: number;
  totalMinor: number;
  preparedFor?: string | null;
  reference?: string | null;
}

export function invoicePdfFromRow(invoice: InvoiceWithRelations): InvoicePdfInput {
  return {
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    lines: parseProposalLines(invoice.lines),
    subtotalMinor: invoice.subtotalMinor,
    totalMinor: invoice.totalMinor,
    engagement: invoice.contract.title,
    billedTo: {
      name: invoice.contract.client.name,
      email: invoice.contract.client.email,
      organization: invoice.contract.client.organizationName,
    },
    reference: invoice.id,
  };
}

export function proposalPdfFromRow(
  proposal: ProposalWithCreator,
  preparedFor?: string | null,
): ProposalPdfInput {
  return {
    title: proposal.title,
    version: proposal.version,
    status: proposal.status,
    currency: proposal.currency,
    validUntil: proposal.validUntil,
    notes: proposal.notes,
    lines: parseProposalLines(proposal.lines),
    subtotalMinor: proposal.subtotalMinor,
    totalMinor: proposal.totalMinor,
    preparedFor,
    reference: proposal.id,
  };
}

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const RIGHT = PAGE_W - MARGIN_X;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const DESC_X = MARGIN_X;
const DESC_W = 250;
const QTY_R = 330;
const PRICE_R = 445;
const AMT_R = RIGHT;
const TOTALS_LABEL_X = 355;
const META_LABEL_R = 430;

type FontKey = "F1" | "F2";

const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 256, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

function encodeChar(ch: string): number {
  const code = ch.codePointAt(0) ?? 63;
  if (code === 0x20ac) return 0x80;
  if (code === 0x2019) return 0x92;
  if (code === 0x201c) return 0x93;
  if (code === 0x201d) return 0x94;
  if (code === 0x2013) return 0x96;
  if (code === 0x2014) return 0x97;
  if (code === 0x2026) return 0x85;
  if (code < 32 || code === 0x7f) return 32;
  if (code <= 255) return code;
  return 63;
}

function pdfLiteral(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = encodeChar(ch);
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${String.fromCharCode(code)}`;
    else out += String.fromCharCode(code);
  }
  return out;
}

function measure(text: string, font: FontKey, size: number): number {
  const table = font === "F2" ? HELVETICA_BOLD : HELVETICA;
  const fallback = font === "F2" ? 611 : 556;
  let units = 0;
  for (const ch of text) {
    const code = encodeChar(ch);
    const index = code - 32;
    units += index >= 0 && index < table.length ? table[index]! : fallback;
  }
  return (units / 1000) * size;
}

function wrapText(text: string, font: FontKey, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const candidate = `${line} ${words[i]!}`;
      if (measure(candidate, font, size) <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = words[i]!;
      }
    }
    lines.push(line);
  }
  return lines;
}

function n(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

interface TextOptions {
  y: number;
  size: number;
  font?: FontKey;
  gray?: number;
  text: string;
}

function drawText(ops: string[], x: number, options: TextOptions): void {
  const font = options.font ?? "F1";
  const gray = options.gray ?? 0;
  ops.push(
    `BT /${font} ${n(options.size)} Tf ${n(gray)} ${n(gray)} ${n(gray)} rg 1 0 0 1 ${n(x)} ${n(options.y)} Tm (${pdfLiteral(options.text)}) Tj ET`,
  );
}

function drawRight(ops: string[], rightX: number, options: TextOptions): void {
  const width = measure(options.text, options.font ?? "F1", options.size);
  drawText(ops, rightX - width, options);
}

function drawLine(ops: string[], x1: number, y: number, x2: number, gray: number): void {
  ops.push(`${n(gray)} ${n(gray)} ${n(gray)} RG 0.5 w ${n(x1)} ${n(y)} m ${n(x2)} ${n(y)} l S`);
}

interface Doc {
  pages: string[][];
  ops: string[];
  y: number;
}

function createDoc(): Doc {
  const doc: Doc = { pages: [], ops: [], y: PAGE_H - MARGIN_TOP };
  doc.pages.push(doc.ops);
  return doc;
}

function pageBreak(doc: Doc, continuation: string): void {
  doc.ops = [];
  doc.pages.push(doc.ops);
  doc.y = PAGE_H - MARGIN_TOP;
  drawText(doc.ops, MARGIN_X, {
    y: doc.y,
    size: 8.5,
    font: "F2",
    gray: 0.45,
    text: continuation,
  });
  doc.y -= 18;
}

function ensure(doc: Doc, height: number, continuation: string): void {
  if (doc.y - height < MARGIN_BOTTOM) pageBreak(doc, continuation);
}

function drawDocumentHeader(
  doc: Doc,
  options: {
    docLabel: string;
    headline: string;
    subline?: string | null;
    reference?: string | null;
  },
): void {
  drawText(doc.ops, MARGIN_X, { y: doc.y, size: 18, font: "F2", text: SITE.name });
  drawRight(doc.ops, RIGHT, { y: doc.y - 1, size: 15, font: "F2", text: options.docLabel });
  doc.y -= 19;
  drawRight(doc.ops, RIGHT, { y: doc.y, size: 10, font: "F2", text: options.headline });
  doc.y -= 12;
  if (options.subline) {
    drawRight(doc.ops, RIGHT, { y: doc.y, size: 9, gray: 0.4, text: options.subline });
    doc.y -= 12;
  }
  if (options.reference) {
    drawRight(doc.ops, RIGHT, {
      y: doc.y,
      size: 7.5,
      gray: 0.5,
      text: `Ref ${options.reference}`,
    });
    doc.y -= 11;
  }
  doc.y -= 6;
  drawLine(doc.ops, MARGIN_X, doc.y, RIGHT, 0.6);
  doc.y -= 26;
}

function drawPartyBlock(
  doc: Doc,
  top: number,
  label: string,
  name: string,
  details: (string | null | undefined)[],
): number {
  let y = top;
  drawText(doc.ops, MARGIN_X, { y, size: 8, gray: 0.5, text: label });
  y -= 14;
  drawText(doc.ops, MARGIN_X, { y, size: 10.5, font: "F2", text: name });
  y -= 14;
  for (const detail of details) {
    if (!detail) continue;
    drawText(doc.ops, MARGIN_X, { y, size: 9, gray: 0.4, text: detail });
    y -= 13;
  }
  return y;
}

function drawMetaBlock(doc: Doc, top: number, rows: [string, string][]): number {
  let y = top;
  for (const [label, value] of rows) {
    if (!value) continue;
    drawRight(doc.ops, META_LABEL_R, { y, size: 8, gray: 0.5, text: label });
    drawRight(doc.ops, RIGHT, { y, size: 9, text: value });
    y -= 14;
  }
  return y;
}

function drawTitle(doc: Doc, title: string, continuation: string, subtitle?: string | null): void {
  ensure(doc, 44, continuation);
  for (const line of wrapText(title, "F2", 12, CONTENT_W)) {
    drawText(doc.ops, MARGIN_X, { y: doc.y, size: 12, font: "F2", text: line });
    doc.y -= 15;
  }
  if (subtitle) {
    drawText(doc.ops, MARGIN_X, { y: doc.y, size: 9, gray: 0.4, text: subtitle });
    doc.y -= 14;
  }
  doc.y -= 8;
}

function drawLineItemTable(doc: Doc, lines: ProposalLine[], continuation: string): void {
  drawText(doc.ops, DESC_X, { y: doc.y, size: 8, gray: 0.5, text: "DESCRIPTION" });
  drawRight(doc.ops, QTY_R, { y: doc.y, size: 8, gray: 0.5, text: "QTY" });
  drawRight(doc.ops, PRICE_R, { y: doc.y, size: 8, gray: 0.5, text: "UNIT PRICE" });
  drawRight(doc.ops, AMT_R, { y: doc.y, size: 8, gray: 0.5, text: "AMOUNT" });
  doc.y -= 11;
  drawLine(doc.ops, DESC_X, doc.y, RIGHT, 0.55);
  doc.y -= 16;

  const rows = lines.length > 0 ? lines : [{ description: "-", quantity: 0, unitPriceMinor: 0 }];
  for (const row of rows) {
    const descLines = wrapText(row.description || "-", "F1", 9.5, DESC_W);
    const rowHeight = descLines.length * 12.5 + 9;
    ensure(doc, rowHeight + 12, continuation);
    let textY = doc.y - 10;
    for (const line of descLines) {
      drawText(doc.ops, DESC_X, { y: textY, size: 9.5, text: line });
      textY -= 12.5;
    }
    drawRight(doc.ops, QTY_R, {
      y: doc.y - 10,
      size: 9.5,
      gray: 0.4,
      text: String(row.quantity),
    });
    drawRight(doc.ops, PRICE_R, {
      y: doc.y - 10,
      size: 9.5,
      gray: 0.4,
      text: formatMinorToMajor(row.unitPriceMinor),
    });
    drawRight(doc.ops, AMT_R, {
      y: doc.y - 10,
      size: 9.5,
      text: formatMinorToMajor(Math.round(row.quantity * row.unitPriceMinor)),
    });
    doc.y -= rowHeight;
    drawLine(doc.ops, DESC_X, doc.y, RIGHT, 0.88);
  }
}

function drawTotals(
  doc: Doc,
  continuation: string,
  subtotalMinor: number,
  totalMinor: number,
  currency: string,
): void {
  doc.y -= 10;
  ensure(doc, 56, continuation);
  drawText(doc.ops, TOTALS_LABEL_X, { y: doc.y, size: 9, gray: 0.5, text: "Subtotal" });
  drawRight(doc.ops, RIGHT, { y: doc.y, size: 9.5, text: formatMinorToMajor(subtotalMinor) });
  doc.y -= 15;
  drawLine(doc.ops, TOTALS_LABEL_X, doc.y + 5, RIGHT, 0.6);
  drawText(doc.ops, TOTALS_LABEL_X, { y: doc.y, size: 11, font: "F2", text: "Total" });
  drawRight(doc.ops, RIGHT, {
    y: doc.y,
    size: 11,
    font: "F2",
    text: `${formatMinorToMajor(totalMinor)} ${currency}`,
  });
  doc.y -= 24;
}

function drawNotes(doc: Doc, continuation: string, notes: string): void {
  ensure(doc, 34, continuation);
  doc.y -= 4;
  drawText(doc.ops, MARGIN_X, { y: doc.y, size: 8, gray: 0.5, text: "NOTES" });
  doc.y -= 14;
  for (const line of wrapText(notes, "F1", 9, CONTENT_W)) {
    ensure(doc, 14, continuation);
    drawText(doc.ops, MARGIN_X, { y: doc.y, size: 9, gray: 0.4, text: line });
    doc.y -= 12.5;
  }
  doc.y -= 8;
}

function finalize(pages: string[][]): void {
  const total = pages.length;
  pages.forEach((ops, index) => {
    drawLine(ops, MARGIN_X, 44, RIGHT, 0.85);
    drawText(ops, MARGIN_X, {
      y: 30,
      size: 7.5,
      gray: 0.5,
      text: `${SITE.legalName} · ${SITE.email} · ${SITE.domain}`,
    });
    drawRight(ops, RIGHT, {
      y: 30,
      size: 7.5,
      gray: 0.5,
      text: `Page ${index + 1} of ${total}`,
    });
  });
}

function assemblePdf(pages: string[][]): Uint8Array {
  const chunks: string[] = [];
  let length = 0;
  const push = (chunk: string): void => {
    chunks.push(chunk);
    length += chunk.length;
  };

  push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");

  const objectCount = 4 + pages.length * 2;
  const offsets = new Array<number>(objectCount + 1).fill(0);
  const writeObject = (num: number, body: string): void => {
    offsets[num] = length;
    push(`${num} 0 obj\n${body}\nendobj\n`);
  };

  const kids = pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ");
  writeObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  writeObject(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  writeObject(
    3,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  writeObject(
    4,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  pages.forEach((ops, index) => {
    const stream = ops.join("\n");
    const contentNum = 5 + index * 2;
    const pageNum = 6 + index * 2;
    writeObject(contentNum, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    writeObject(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`,
    );
  });

  const xrefOffset = length;
  push(`xref\n0 ${objectCount + 1}\n`);
  push("0000000000 65535 f\r\n");
  for (let num = 1; num <= objectCount; num++) {
    push(`${String(offsets[num]).padStart(10, "0")} 00000 n\r\n`);
  }
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) bytes[at++] = chunk.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function capitalize(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function fileSafe(value: string): string {
  return (
    value
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "document"
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "document"
  );
}

function buildInvoicePages(input: InvoicePdfInput): string[][] {
  const doc = createDoc();
  const continuation = `Invoice ${input.invoiceNumber} - continued`;

  drawDocumentHeader(doc, {
    docLabel: "INVOICE",
    headline: input.invoiceNumber,
    reference: input.reference,
  });

  const blockTop = doc.y;
  let leftBottom = blockTop;
  if (input.billedTo) {
    leftBottom = drawPartyBlock(doc, blockTop, "BILLED TO", input.billedTo.name, [
      input.billedTo.organization,
      input.billedTo.email,
    ]);
  }
  const metaRows: [string, string][] = [];
  if (input.status) metaRows.push(["Status", capitalize(input.status)]);
  metaRows.push(["Issued", input.issueDate]);
  if (input.dueDate) metaRows.push(["Due", input.dueDate]);
  metaRows.push(["Currency", input.currency]);
  const metaBottom = drawMetaBlock(doc, blockTop, metaRows);
  doc.y = Math.min(leftBottom, metaBottom) - 10;

  drawTitle(doc, input.title, continuation, input.engagement);
  drawLineItemTable(doc, input.lines, continuation);
  drawTotals(doc, continuation, input.subtotalMinor, input.totalMinor, input.currency);

  finalize(doc.pages);
  return doc.pages;
}

function buildProposalPages(input: ProposalPdfInput): string[][] {
  const doc = createDoc();
  const continuation = `Proposal v${input.version} - continued`;

  drawDocumentHeader(doc, {
    docLabel: "PROPOSAL",
    headline: `Version ${input.version}`,
    reference: input.reference,
  });

  const blockTop = doc.y;
  let leftBottom = blockTop;
  if (input.preparedFor) {
    leftBottom = drawPartyBlock(doc, blockTop, "PREPARED FOR", input.preparedFor, []);
  }
  const metaRows: [string, string][] = [];
  if (input.status) metaRows.push(["Status", capitalize(input.status)]);
  metaRows.push(["Valid until", input.validUntil]);
  metaRows.push(["Currency", input.currency]);
  const metaBottom = drawMetaBlock(doc, blockTop, metaRows);
  doc.y = Math.min(leftBottom, metaBottom) - 10;

  drawTitle(doc, input.title, continuation);
  drawLineItemTable(doc, input.lines, continuation);
  drawTotals(doc, continuation, input.subtotalMinor, input.totalMinor, input.currency);
  if (input.notes?.trim()) drawNotes(doc, continuation, input.notes.trim());

  finalize(doc.pages);
  return doc.pages;
}

export function renderInvoicePdf(input: InvoicePdfInput): PdfAttachment {
  const pages = buildInvoicePages(input);
  return {
    filename: `invoice-${fileSafe(input.invoiceNumber || "document")}.pdf`,
    contentType: "application/pdf",
    bytes: assemblePdf(pages),
  };
}

export function renderProposalPdf(input: ProposalPdfInput): PdfAttachment {
  const pages = buildProposalPages(input);
  return {
    filename: `proposal-v${input.version}-${slugify(input.title)}.pdf`,
    contentType: "application/pdf",
    bytes: assemblePdf(pages),
  };
}
