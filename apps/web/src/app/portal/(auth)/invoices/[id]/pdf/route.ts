import { getPortalInvoice, renderInvoicePdf } from "@ibtatech/leads";
import { getCurrentPortalUser } from "@/lib/portal/session";
import { pdfResponse } from "@/lib/pdf-response";

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!cuidLike.test(id)) return new Response("Not found", { status: 404 });

  const user = await getCurrentPortalUser();
  if (!user) return new Response("Sign in to download this invoice.", { status: 401 });

  const result = await getPortalInvoice(user, id);
  if (!result.ok) return new Response("Not found", { status: 404 });
  const invoice = result.invoice;

  return pdfResponse(
    renderInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      lines: invoice.lines,
      subtotalMinor: invoice.subtotalMinor,
      totalMinor: invoice.totalMinor,
      engagement: invoice.contractTitle,
      billedTo: { name: user.name, email: user.email },
      reference: invoice.id,
    }),
  );
}
