import { getPortalProposal, renderProposalPdf } from "@ibtatech/leads";
import { getCurrentPortalUser } from "@/lib/portal/session";
import { pdfResponse } from "@/lib/pdf-response";

const cuidLike = /^[c][a-z0-9]{20,}$/i;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!cuidLike.test(id)) return new Response("Not found", { status: 404 });

  const user = await getCurrentPortalUser();
  if (!user) return new Response("Sign in to download this proposal.", { status: 401 });

  const result = await getPortalProposal(user, id);
  if (!result.ok) return new Response("Not found", { status: 404 });
  const proposal = result.proposal;

  return pdfResponse(
    renderProposalPdf({
      title: proposal.title,
      version: proposal.version,
      status: proposal.status,
      currency: proposal.currency,
      validUntil: proposal.validUntil,
      notes: proposal.notes,
      lines: proposal.lines,
      subtotalMinor: proposal.subtotalMinor,
      totalMinor: proposal.totalMinor,
      preparedFor: user.name,
      reference: proposal.id,
    }),
  );
}
