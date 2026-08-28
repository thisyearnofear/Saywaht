import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createMission,
  executeMission,
  approveAndResume,
  cancelMission,
  getMission,
  listMissions,
  listActivity,
} from "@/agent/runtime";
import { AGENT_TOOLS } from "@/agent/tools";
import { AGENT_CAPABILITIES, DEFAULT_POLICY } from "@/agent/types";
import { buildPaymentRequirement, verifyPayment, x402Enabled, x402Response, X402_PAYMENT_HEADER } from "@/agent/x402";
import { buildAgentCard } from "@/agent/identity";

/**
 * /api/agent/run — the agent's JSON-RPC task endpoint.
 *
 * Methods (JSON-RPC 2.0):
 *   agent.describe   -> agent card + tool schemas + policy defaults
 *   mission.create   { goal, stepInputs? }           -> mission (status planning)
 *   mission.run      { missionId? | goal }           -> executes until done or awaiting_approval
 *   mission.get      { missionId }
 *   mission.list
 *   mission.approve  { missionId, callId }          -> resume past a gate
 *   mission.cancel   { missionId }
 *   activity.list
 *   tool.call        { tool, input }                 -> premium: x402-gated direct call
 *
 * x402: `tool.call` is the premium endpoint — external agents pay per use in
 * ETH on Base (enable with NEXT_PUBLIC_X402_ENABLED=1).
 */
export const dynamic = "force-dynamic";

const rpcSchema = z.object({
  jsonrpc: z.literal("2.0").optional(),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

const serializable = (v: unknown) =>
  JSON.parse(
    JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val)),
  );

function ok(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result: serializable(result) });
}
function err(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32601 ? 404 : 400 });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(null, -32700, "parse error");
  }
  const parsed = rpcSchema.safeParse(body);
  if (!parsed.success) return err(null, -32600, "invalid request");
  const { id, method, params = {} } = parsed.data;

  // ---- x402 gate on the premium direct-tool endpoint ----
  if (method === "tool.call" && x402Enabled()) {
    const requirement = buildPaymentRequirement(req.nextUrl.origin, "/api/agent/run");
    const verification = await verifyPayment(req.headers.get(X402_PAYMENT_HEADER), requirement);
    if (!verification.ok) return x402Response(requirement);
  }

  try {
    switch (method) {
      case "agent.describe": {
        const origin = req.nextUrl.origin;
        return ok(id, {
          card: buildAgentCard(origin),
          tools: Object.values(AGENT_TOOLS).map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            mutates: t.mutates,
          })),
          capabilities: AGENT_CAPABILITIES,
          policyDefaults: {
            maxSpendWeiPerMission: DEFAULT_POLICY.maxSpendWeiPerMission.toString(),
            maxTradeWei: DEFAULT_POLICY.maxTradeWei.toString(),
            autoApprove: DEFAULT_POLICY.autoApprove,
          },
        });
      }

      case "mission.create": {
        const goal = z.string().min(3).max(500).parse(params.goal);
        const mission = await createMission({
          goal,
          initiator: "mcp-client",
          stepInputs: params.stepInputs as Record<string, Record<string, unknown>> | undefined,
        });
        return ok(id, mission);
      }

      case "mission.run": {
        let missionId = z.string().optional().parse(params.missionId);
        if (!missionId) {
          const goal = z.string().min(3).max(500).parse(params.goal);
          const created = await createMission({ goal, initiator: "mcp-client" });
          missionId = created.id;
        }
        const mission = await executeMission(missionId);
        return ok(id, mission);
      }

      case "mission.get": {
        const mission = getMission(z.string().parse(params.missionId));
        if (!mission) return err(id, -32602, "unknown mission");
        return ok(id, mission);
      }

      case "mission.list":
        return ok(id, listMissions());

      case "mission.approve": {
        const missionId = z.string().parse(params.missionId);
        const callId = z.string().parse(params.callId);
        const mission = await approveAndResume(missionId, callId);
        return ok(id, mission);
      }

      case "mission.cancel":
        return ok(id, cancelMission(z.string().parse(params.missionId)) ?? null);

      case "activity.list":
        return ok(id, listActivity());

      case "tool.call": {
        const toolName = z.enum(AGENT_CAPABILITIES).parse(params.tool);
        const tool = AGENT_TOOLS[toolName];
        const input = tool.zodInput.parse(params.input);
        if (tool.mutates) {
          // Direct external calls may never execute mutating tools without the
          // mission/approval path — propose, never dispose (PG).
          const mission = await createMission({ goal: `tool.call:${toolName}`, initiator: "mcp-client" });
          mission.plan = [{ id: "step-0", tool: toolName, rationale: "direct external tool.call", input: params.input as Record<string, unknown> }];
          const gated = await executeMission(mission.id);
          return ok(id, gated);
        }
        const output = await tool.run(
          {
            identity: { name: "external", version: "0", address: "0x0000000000000000000000000000000000000000", chainId: 8453, agentCardUrl: "/.well-known/agent-card.json", capabilities: [], trust: { validation: "human-approved" } },
            policy: DEFAULT_POLICY,
            initiator: "mcp-client",
            requestApproval: async () => true,
            log: () => {},
          },
          input,
        );
        return ok(id, { output });
      }

      default:
        return err(id, -32601, `unknown method: ${method}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(id, -32602, `invalid params: ${error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`);
    }
    const message = error instanceof Error ? error.message : "internal error";
    return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message } }, { status: 500 });
  }
}

/** GET returns a quick human/agent-readable summary of the endpoint. */
export async function GET(req: NextRequest) {
  return ok(null, {
    endpoint: "/api/agent/run",
    transport: "JSON-RPC 2.0 over HTTP POST",
    methods: [
      "agent.describe",
      "mission.create",
      "mission.run",
      "mission.get",
      "mission.list",
      "mission.approve",
      "mission.cancel",
      "activity.list",
      "tool.call",
    ],
    agentCard: `${req.nextUrl.origin}/.well-known/agent-card.json`,
    mcp: `${req.nextUrl.origin}/api/mcp`,
  });
}
