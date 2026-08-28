import { NextRequest } from "next/server";
import { z } from "zod";
import { AGENT_TOOLS } from "@/agent/tools";
import { AGENT_CAPABILITIES, DEFAULT_POLICY } from "@/agent/types";
import { executeMission, createMission } from "@/agent/runtime";
import { buildPaymentRequirement, verifyPayment, x402Enabled, x402Response, X402_PAYMENT_HEADER } from "@/agent/x402";

/**
 * /api/mcp — Model Context Protocol server (Streamable HTTP, JSON-RPC 2.0).
 *
 * Speaks the MCP wire protocol directly (initialize / tools/list /
 * tools/call) so any MCP client — Claude Desktop via proxy, OpenAI Agents
 * SDK, LangChain, or an A2A peer — can discover and drive Saywaht's
 * capabilities without bespoke glue. This is the thesis made concrete:
 * the app's surface is the agent's surface.
 *
 * Mutating tools route through the mission runtime so the policy engine and
 * the human-approval gate apply identically no matter who is calling.
 */
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = { name: "saywaht", version: "0.1.0" };

const rpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

function result(id: unknown, res: unknown) {
  return Response.json({
    jsonrpc: "2.0",
    id: id ?? null,
    result: JSON.parse(JSON.stringify(res, (_k, v) => (typeof v === "bigint" ? v.toString() : v))),
  });
}
function rpcError(id: unknown, code: number, message: string, status = 200) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "parse error");
  }
  const msg = rpcSchema.safeParse(body);
  if (!msg.success) return rpcError(null, -32600, "invalid request");
  const { id, method, params = {} } = msg.data;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Saywaht: turn video into onchain commentary coins on Base. Read tools run instantly; mutating tools (create_coin, trade_coin, update_coin) return sign-ready calldata and halt for human approval per policy.",
      });

    case "notifications/initialized":
    case "notifications/cancelled":
      return new Response(null, { status: 202 });

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, {
        tools: Object.values(AGENT_TOOLS).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: {
            readOnlyHint: !t.mutates,
            destructiveHint: false,
            idempotentHint: !t.mutates,
            openWorldHint: t.mutates,
          },
        })),
      });

    case "tools/call": {
      const name = z.enum(AGENT_CAPABILITIES).safeParse(params.name);
      if (!name.success) return rpcError(id, -32602, "unknown tool");
      const tool = AGENT_TOOLS[name.data];

      // x402: premium metering for external callers (opt-in via env).
      if (x402Enabled()) {
        const requirement = buildPaymentRequirement(req.nextUrl.origin, "/api/mcp");
        const v = await verifyPayment(req.headers.get(X402_PAYMENT_HEADER), requirement);
        if (!v.ok) return x402Response(requirement);
      }

      const args = (params.arguments ?? {}) as Record<string, unknown>;

      try {
        if (tool.mutates) {
          // Route through the mission runtime -> policy gate + approval halt.
          const mission = await createMission({
            goal: `mcp:${name.data}`,
            initiator: "mcp-client",
            stepInputs: { "step-0": args },
          });
          mission.plan = [
            { id: "step-0", tool: name.data, rationale: "MCP tools/call", input: args },
          ];
          const run = await executeMission(mission.id);
          const call = run.calls[0];
          return result(id, {
            isError: call?.status === "failed",
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  call?.status === "awaiting_approval"
                    ? {
                        status: "awaiting_human_approval",
                        missionId: run.id,
                        callId: call.id,
                        note: "Approve via POST /api/agent/run {method:'mission.approve'} — agents propose, humans dispose.",
                      }
                    : { status: call?.status, output: call?.output, error: call?.error },
                  (_k, v) => (typeof v === "bigint" ? v.toString() : v),
                ),
              },
            ],
          });
        }

        const input = tool.zodInput.parse(args);
        const output = await tool.run(
          {
            identity: {
              name: "mcp-client",
              version: "0",
              address: "0x0000000000000000000000000000000000000000",
              chainId: 8453,
              agentCardUrl: "/.well-known/agent-card.json",
              capabilities: [],
              trust: { validation: "human-approved" },
            },
            policy: DEFAULT_POLICY,
            initiator: "mcp-client",
            requestApproval: async () => true,
            log: () => {},
          },
          input,
        );
        return result(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(output, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
            },
          ],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "tool error";
        return result(id, { isError: true, content: [{ type: "text", text: message }] });
      }
    }

    default:
      return rpcError(id, -32601, `unknown method: ${method}`);
  }
}

/** GET advertises the MCP endpoint's shape for humans poking at it. */
export async function GET(req: NextRequest) {
  return Response.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocol: "modelcontextprotocol",
    protocolVersion: PROTOCOL_VERSION,
    transport: "JSON-RPC 2.0 over HTTP POST (stateless)",
    tools: Object.keys(AGENT_TOOLS),
    agentCard: `${req.nextUrl.origin}/.well-known/agent-card.json`,
  });
}
