import type { PdfAttachment } from "@ibtatech/leads";

export function pdfResponse(doc: PdfAttachment): Response {
  return new Response(Uint8Array.from(doc.bytes), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
      "Content-Length": String(doc.bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
