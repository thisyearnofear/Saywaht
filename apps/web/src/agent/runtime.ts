/**
 * Mission runtime — goal -> plan -> policy-gated tool calls -> outcome.
 *
 * This is deliberately *not* an open-ended autonomous loop. Autonomy without
 * ceilings is how agents burn user money and trust. Instead:
 *
 *  - A mission has an explicit plan the human can read (every step carries a
 *    rationale).
 *  - Each tool call passes through the policy engine: blocked tools die,
 *    cost ceilings are checked, fund-moving/publishing steps halt at
 *    awaiting_approval unless policy auto-approves them.
 *  - The activity log is append-only — audit first, always.
 *
 * Storage: in-process memory map (single Next server instance). Durable
 * storage (DB-backed) is the obvious next step; the interface is shaped so
 * swapping it is a one-file change.
 */

import { base } from "viem/chains";
import type {
  ActivityEntry,
  AgentTool,
  Mission,
  PlanStep,
  PolicyConfig,
  ToolCall,
} from "./types";
import { DEFAULT_POLICY, policyViolations } from "./types";
import { makeIdentity } from "./identity";
import { AGENT_TOOLS, ensureZoraApiKey } from "./tools";

/* --------------------------------- storage ---------------------------------- */

const missions = new Map<string, Mission>();
const activity: ActivityEntry[] = [];
let seq = 0;
const nextId = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function listMissions(): Mission[] {
  return [...missions.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 50);
}
export function getMission(id: string): Mission | undefined {
  return missions.get(id);
}
export function listActivity(limit = 100): ActivityEntry[] {
  return activity.slice(-limit).reverse();
}

function logActivity(entry: Omit<ActivityEntry, "id" | "ts">): ActivityEntry {
  const full: ActivityEntry = { ...entry, id: nextId("act"), ts: Date.now() };
  activity.push(full);
  if (activity.length > 1000) activity.splice(0, activity.length - 1000);
  return full;
}

/* --------------------------------- planning --------------------------------- */

interface GoalIntent {
  steps: Omit<PlanStep, "id">[];
}

/**
 * Deterministic intent planner. Regex-first (PG: do things that don't scale —
 * ship what works for real goals today; the LLM planner is an upgrade path,
 * not a dependency). Each recognised intent compiles to a plan over our tools.
 */
export function planForGoal(goal: string): GoalIntent {
  const g = goal.toLowerCase();
  const addr = g.match(/0x[0-9a-fA-F]{40}/)?.[0] as `0x${string}` | undefined;
  const ethAmt = g.match(/(\d+(?:\.\d+)?)\s*(?:eth|Ξ)\b/i)?.[1];

  if (/(buy|purchase|acquire)/.test(g) && addr) {
    const amount = ethAmt || "0.001";
    return {
      steps: [
        {
          tool: "quote_trade",
          rationale: `Quote ${amount} ETH -> coin ${addr.slice(0, 10)}… so the human sees exact amountOut before committing`,
          input: { coin: addr, side: "buy", amountEth: amount, sender: addr },
        },
        {
          tool: "trade_coin",
          rationale: `Execute the buy at the quoted price (requires your signature; policy caps trade size)`,
          input: { coin: addr, side: "buy", amountEth: amount, sender: addr },
          dependsOn: ["step-0"],
        },
      ],
    };
  }

  if (/(sell)/.test(g) && addr) {
    const amount = ethAmt || "0.001";
    return {
      steps: [
        {
          tool: "quote_trade",
          rationale: `Quote selling ${amount} of coin ${addr.slice(0, 10)}… back to ETH`,
          input: { coin: addr, side: "sell", amountEth: amount, sender: addr },
        },
        {
          tool: "trade_coin",
          rationale: "Execute the sell at the quoted price (requires your signature)",
          input: { coin: addr, side: "sell", amountEth: amount, sender: addr },
          dependsOn: ["step-0"],
        },
      ],
    };
  }

  if (/(create|deploy|launch|mint).*(coin)/.test(g)) {
    return {
      steps: [
        {
          tool: "generate_metadata",
          rationale: "Derive a clean name/ticker/description for the commentary coin",
          input: { name: goal.slice(0, 60), videoUri: "ipfs://REPLACE_WITH_VIDEO_URI" },
        },
        {
          tool: "prepare_coin",
          rationale: "Build factory calldata with platformReferrer + creator-coin backing (no submission)",
          input: {},
          dependsOn: ["step-0"],
        },
        {
          tool: "create_coin",
          rationale: "Deploy — halts here for your wallet signature; the agent never holds your keys",
          input: {},
          dependsOn: ["step-1"],
        },
      ],
    };
  }

  // Default: market research mission — always safe, always useful.
  return {
    steps: [
      {
        tool: "market_insights",
        rationale: "Scan the commentary-coin market to ground the goal in current prices/volume",
        input: { count: 50 },
      },
      {
        tool: "notify",
        rationale: "Report findings in plain language",
        input: { message: "Market scan complete — see mission output." },
        dependsOn: ["step-0"],
      },
    ],
  };
}

/* -------------------------------- execution --------------------------------- */

export interface RunMissionOptions {
  goal: string;
  initiator: Mission["initiator"];
  policy?: PolicyConfig;
  /** Override inputs per step (human edits the plan before approving) */
  stepInputs?: Record<string, Record<string, unknown>>;
}

export async function createMission(opts: RunMissionOptions): Promise<Mission> {
  const intent = planForGoal(opts.goal);
  const now = Date.now();
  const plan: PlanStep[] = intent.steps.map((s, i) => ({
    ...s,
    id: `step-${i}`,
    input: opts.stepInputs?.[`step-${i}`] ?? s.input,
  }));

  const mission: Mission = {
    id: nextId("mis"),
    goal: opts.goal,
    status: "planning",
    plan,
    calls: [],
    createdAt: now,
    updatedAt: now,
    spentWei: BigInt(0),
    initiator: opts.initiator,
  };
  missions.set(mission.id, mission);
  logActivity({ kind: "plan", missionId: mission.id, message: `Plan for "${opts.goal}": ${plan.map((p) => p.tool).join(" -> ")}` });
  return mission;
}

/**
 * Execute a mission until it either completes or halts awaiting human
 * approval on a step policy won't auto-approve.
 */
export async function executeMission(
  missionId: string,
  opts?: { policy?: PolicyConfig; agentAddress?: `0x${string}` },
): Promise<Mission> {
  const mission = missions.get(missionId);
  if (!mission) throw new Error(`unknown mission ${missionId}`);
  await ensureZoraApiKey();

  const policy = opts?.policy ?? DEFAULT_POLICY;
  const identity = makeIdentity(
    opts?.agentAddress ?? "0x0000000000000000000000000000000000000000",
  );
  mission.status = "running";
  mission.updatedAt = Date.now();

  for (let i = 0; i < mission.plan.length; i++) {
    const step = mission.plan[i];
    const tool: AgentTool<any, any> | undefined = AGENT_TOOLS[step.tool];
    if (!tool) {
      mission.status = "failed";
      mission.updatedAt = Date.now();
      logActivity({ kind: "error", missionId, callId: step.id, message: `unknown tool ${step.tool}` });
      return mission;
    }

    const call: ToolCall = {
      id: `${mission.id}:${i}`,
      tool: step.tool,
      input: step.input,
      status: "pending",
    };
    mission.calls.push(call);

    // -- policy gate --
    const costWei = tool.maxCostWei ?? BigInt(0);
    const violations = policyViolations(policy, tool, costWei);
    if (violations.length > 0) {
      call.status = "rejected";
      call.error = violations.join("; ");
      mission.status = "failed";
      mission.updatedAt = Date.now();
      logActivity({ kind: "error", missionId, callId: call.id, message: `policy rejected ${step.tool}: ${call.error}` });
      return mission;
    }

    const needsApproval = tool.mutates && !policy.autoApprove.includes(tool.name);
    if (needsApproval) {
      call.status = "awaiting_approval";
      mission.status = "awaiting_approval";
      mission.updatedAt = Date.now();
      logActivity({
        kind: "approval",
        missionId,
        callId: call.id,
        message: `${step.tool} awaiting human approval — ${step.rationale}`,
        data: { input: step.input },
      });
      return mission; // PG: agents propose, humans dispose.
    }

    call.status = "running";
    call.startedAt = Date.now();
    const ctx = {
      identity: { ...identity, chainId: base.id },
      policy,
      initiator: mission.initiator,
      requestApproval: async () => true,
      log: (e: Omit<ActivityEntry, "id" | "ts">) =>
        logActivity({ ...e, missionId, callId: call.id }),
    };

    try {
      const input = tool.zodInput.parse(step.input);
      const output = await tool.run(ctx, input);
      call.status = "done";
      call.output = output;
      call.finishedAt = Date.now();
      mission.spentWei += costWei;
      logActivity({
        kind: "tool",
        missionId,
        callId: call.id,
        message: `${step.tool} ok`,
        data: { outputPreview: safePreview(output) },
      });
    } catch (error) {
      call.status = "failed";
      call.error = error instanceof Error ? error.message : String(error);
      call.finishedAt = Date.now();
      mission.status = "failed";
      mission.updatedAt = Date.now();
      logActivity({ kind: "error", missionId, callId: call.id, message: `${step.tool} failed: ${call.error}` });
      return mission;
    }
    mission.updatedAt = Date.now();
  }

  mission.status = "done";
  mission.updatedAt = Date.now();
  logActivity({ kind: "note", missionId, message: `mission done (${mission.spentWei.toString()} wei budget used)` });
  return mission;
}

/** Approve a pending call and resume the mission from it. */
export async function approveAndResume(missionId: string, callId: string): Promise<Mission> {
  const mission = missions.get(missionId);
  if (!mission) throw new Error(`unknown mission ${missionId}`);
  const idx = mission.calls.findIndex((c) => c.id === callId);
  if (idx === -1) throw new Error(`unknown call ${callId}`);
  const call = mission.calls[idx];
  if (call.status !== "awaiting_approval") throw new Error(`call ${callId} is not awaiting approval`);

  call.status = "approved";
  logActivity({ kind: "approval", missionId, callId, message: `human approved ${call.tool}` });

  // Re-run only the approved step, then continue with the rest.
  const step = mission.plan[idx];
  const tool = AGENT_TOOLS[step.tool];
  await ensureZoraApiKey();
  const ctx = {
    identity: makeIdentity("0x0000000000000000000000000000000000000000"),
    policy: DEFAULT_POLICY,
    initiator: mission.initiator,
    requestApproval: async () => true,
    log: (e: Omit<ActivityEntry, "id" | "ts">) => logActivity({ ...e, missionId, callId }),
  };
  call.status = "running";
  try {
    const input = tool.zodInput.parse(step.input);
    call.output = await tool.run(ctx, input);
    call.status = "done";
  } catch (error) {
    call.status = "failed";
    call.error = error instanceof Error ? error.message : String(error);
    mission.status = "failed";
    mission.updatedAt = Date.now();
    return mission;
  }

  // Continue remaining steps under default policy.
  mission.plan = mission.plan.slice(idx + 1);
  mission.calls = mission.calls.slice(0, idx + 1);
  const continued = await executeMission(missionId);
  if (continued.status === "done" || continued.status === "awaiting_approval") return continued;
  return continued;
}

export function cancelMission(missionId: string): Mission | undefined {
  const m = missions.get(missionId);
  if (m && m.status !== "done") {
    m.status = "cancelled";
    m.updatedAt = Date.now();
    logActivity({ kind: "note", missionId, message: "mission cancelled by human" });
  }
  return m;
}

function safePreview(x: unknown): unknown {
  try {
    const s = JSON.stringify(x, (_k, v) => (typeof v === "bigint" || typeof v === "string" && /^\d+$/.test(v) ? v : v));
    return s.length > 1500 ? `${s.slice(0, 1500)}…` : x;
  } catch {
    return String(x);
  }
}
