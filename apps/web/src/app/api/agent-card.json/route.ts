import { buildAgentCard } from "@/agent/identity";

/**
 * /.well-known/agent-card.json — the agent's machine-readable storefront.
 * External agents (A2A clients, MCP clients, marketplaces) fetch this first
 * to discover what Saywaht's agent can do, where its tool endpoint lives,
 * and how it settles payments. Zero-auth on purpose: discovery is free;
 * execution is gated (policy + x402).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json(buildAgentCard(origin), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
