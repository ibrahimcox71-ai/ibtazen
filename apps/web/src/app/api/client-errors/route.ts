import { ingestClientError } from "@/lib/telemetry/ingest";

/**
 * Ingest endpoint for the browser error reporter (`lib/telemetry/report.ts`).
 *
 * Contract: `POST` a normalised report body -> 204 on receipt, 400 on a
 * malformed payload, 413 when oversized, 429 when the per-IP budget is spent.
 * The payload carries no cookies, headers or query strings by construction
 * (see `core.ts`), so nothing sensitive reaches the logs.
 */

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request): Promise<Response> {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { status } = ingestClientError({ body, ip: clientIp(request) });
  return new Response(null, { status });
}
