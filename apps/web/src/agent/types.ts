/**
 * Agentic primitives — shared type contract.
 *
 * Single source of truth for the agent layer:
 *  - identity: onchain, key-based (no accounts, no passwords)
 *  - tools: the unit of agency — every app capability exposed to agents
 *  - policy: bounded autonomy — what agents may do without asking
 *  - missions: goal -> plan -> tool calls -> outcome, fully auditable
 *
 * Philosophy:
 *  - PG: the user is sovereign. Agents propose, humans dispose. Anything that
 *    moves money or publishes requires explicit approval unless policy says so.
 *  - Thiel: agents are not a bolt-on feature; they are the new primary
 *    interface. The editor becomes a tool the agent drives, not vice versa.
 */

import type { Address, Hex } from "viem";
import { z } from "zod";

/* ---------------------------------- identity --------------------------------- */

export interface AgentIdentity {
  /** Human-readable name, e.g. "saywaht-agent" */
  name: string;
  version: string;
  /** EVM address of the agent's key (Base). Possession of the key IS the proof. */
  address: Address;
  chainId: number;
  /** A2A-style agent card served at /.well-known/agent-card.json */
  agentCardUrl: string;
  capabilities: string[];
  trust: {
    reputationRegistryHint?: Address;
    validation: "human-approved" | "policy-auto" | "tee-attested";
  };
}

/* ----------------------------------- tools ----------------------------------- */

export const AGENT_CAPABILITIES = [
  "market_insights",
  "quote_trade",
  "generate_metadata",
  "prepare_coin",
  "create_coin",
  "trade_coin",
  "update_coin",
  "transcribe",
  "notify",
] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

export type ToolCallStatus =
  | "pending"
  | "awaiting_approval"
  | "approved"
  | "running"
  | "done"
  | "failed"
  | "rejected";

export interface ToolCall<I = unknown, O = unknown> {
  id: string;
  tool: AgentCapability;
  input: I;
  status: ToolCallStatus;
  output?: O;
  error?: string;
  /** tx hashes produced by this call, for auditability */
  txHashes?: Hex[];
  startedAt?: number;
  finishedAt?: number;
}

export interface ToolContext {
  identity: AgentIdentity;
  policy: PolicyConfig;
  initiator: Mission["initiator"];
  /** Request approval for a call. Server-side: auto-approves only if policy permits. */
  requestApproval(call: ToolCall): Promise<boolean>;
  /** Append-only activity feed */
  log(entry: Omit<ActivityEntry, "id" | "ts">): void;
}

/** A tool is a function with schemas; side effects go through injected clients. */
export interface AgentTool<I = unknown, O = unknown> {
  name: AgentCapability;
  description: string;
  /** JSON Schema (draft-07 subset) for MCP tool advertisement */
  inputSchema: Record<string, unknown>;
  /** Zod schema for runtime validation */
  zodInput: z.ZodType<I>;
  /** Moves funds or publishes irreversibly -> requires approval by default */
  mutates: boolean;
  /** Estimated cost ceiling in wei (0n for free); checked by the policy engine */
  maxCostWei?: bigint;
  run(ctx: ToolContext, input: I): Promise<O>;
}

/* ----------------------------------- policy ---------------------------------- */

export interface PolicyConfig {
  /** Per-mission ETH spend ceiling (wei). Default 0.01 ETH. */
  maxSpendWeiPerMission: bigint;
  /** Per-trade ceiling (wei). Default 0.005 ETH. */
  maxTradeWei: bigint;
  /** Tools allowed to run without human approval. Fund-moving tools must NOT
   *  be here by default (PG: default-alive, but user-sovereign). */
  autoApprove: AgentCapability[];
  blocked: AgentCapability[];
  addressDenylist: Address[];
}

export const DEFAULT_POLICY: PolicyConfig = {
  maxSpendWeiPerMission: BigInt("10000000000000000"), // 0.01 ETH
  maxTradeWei: BigInt("5000000000000000"), // 0.005 ETH
  autoApprove: [
    "market_insights",
    "quote_trade",
    "generate_metadata",
    "prepare_coin",
    "transcribe",
    "notify",
  ],
  blocked: [],
  addressDenylist: [],
};

export function policyViolations(
  policy: PolicyConfig,
  tool: Pick<AgentTool, "name" | "mutates">,
  costWei: bigint,
): string[] {
  const violations: string[] = [];
  if (policy.blocked.includes(tool.name))
    violations.push(`tool ${tool.name} is blocked by policy`);
  if (costWei > policy.maxSpendWeiPerMission)
    violations.push(
      `estimated cost ${costWei} wei exceeds per-mission ceiling ${policy.maxSpendWeiPerMission} wei`,
    );
  return violations;
}

/* ---------------------------------- missions --------------------------------- */

export interface PlanStep {
  id: string;
  tool: AgentCapability;
  /** Natural-language rationale — agents must be able to explain themselves */
  rationale: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
}

export type MissionStatus =
  | "planning"
  | "awaiting_approval"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export interface Mission {
  id: string;
  /** The user's goal in their own words (PG: start from what users want) */
  goal: string;
  status: MissionStatus;
  plan: PlanStep[];
  calls: ToolCall[];
  createdAt: number;
  updatedAt: number;
  /** Total wei estimated/spent across all calls in this mission */
  spentWei: bigint;
  initiator: "human" | "mcp-client" | "a2a-peer" | "autonomous";
}

export interface ActivityEntry {
  id: string;
  ts: number;
  kind: "plan" | "tool" | "approval" | "tx" | "error" | "note";
  message: string;
  missionId?: string;
  callId?: string;
  data?: Record<string, unknown>;
}

/* ------------------------------- x402 (payments) ------------------------------ */

/** Minimal HTTP-402 payment protocol for agent-facing premium endpoints.
 *  Agents pay per use in ETH on Base — no subscriptions, no accounts.
 *  Thiel: monetize the scarce thing (verified agent labor), not seat licenses. */
export interface PaymentRequirement {
  scheme: "exact";
  network: "base";
  /** wei, decimal string (JSON-safe) */
  maxAmountRequired: string;
  payTo: Address;
  asset: "ETH" | Address;
  resource: string;
  description: string;
  validForSeconds: number;
}

export interface PaymentProof {
  /** tx hash of the payment on Base */
  txHash: Hex;
  from: Address;
}
