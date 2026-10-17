import {
  canAccessCrm,
  getInvoiceForActor,
  invoicePdfFromRow,
  renderInvoicePdf,
} from "@ibtatech/leads";
import { getCurrentUser } from "@/lib/admin/session";
import { pdfResponse } from "@/lib/pdf-response";

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!cuidLike.test(id)) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to download this invoice.", { status: 401 });
  if (!canAccessCrm(user.role)) return new Response("Not authorized", { status: 403 });

  const result = await getInvoiceForActor(user, id);
  if (!result.ok) return new Response("Not found", { status: 404 });

  return pdfResponse(renderInvoicePdf(invoicePdfFromRow(result.invoice)));
}
