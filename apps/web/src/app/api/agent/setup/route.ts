import { NextRequest } from "next/server";
import { buildAgentCard, AGENT_NAME, AGENT_VERSION } from "@/agent/identity";
import { listMissions, listActivity } from "@/agent/runtime";

/**
 * /api/agent/setup — agent readiness probe for the UI.
 *
 * Replaces the previous external-custody stub (which shelled out to a
 * third-party CLI). The agentic layer here is self-hosted: identity is the
 * user's own wallet key, the runtime is in-process, and this endpoint just
 * reports what is live so the dashboard can render real state.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  return NextResponse_ok({
    active: true,
    agent: {
      name: AGENT_NAME,
      version: AGENT_VERSION,
      card: buildAgentCard(origin),
      endpoints: {
        run: "/api/agent/run",
        mcp: "/api/mcp",
        agentCard: "/.well-known/agent-card.json",
      },
      x402: process.env.NEXT_PUBLIC_X402_ENABLED === "1",
    },
    missions: listMissions().slice(0, 5),
    activity: listActivity(20),
  });
}

function NextResponse_ok(body: unknown) {
  return Response.json(
    JSON.parse(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v))),
    { headers: { "Cache-Control": "no-store" } },
  );
}
