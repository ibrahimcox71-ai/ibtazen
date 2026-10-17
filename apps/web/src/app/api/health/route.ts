/**
 * Liveness probe for uptime monitors and deploys: no session, no database, no
 * cache. Deliberately minimal - it answers "the server process is serving",
 * nothing more (deep checks belong to a real health page).
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      status: "ok" as const,
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
