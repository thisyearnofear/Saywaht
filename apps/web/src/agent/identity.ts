/**
 * Agent identity — the onchain, key-based self.
 *
 * Thiel: "possession of the key is the identity." No accounts, no email
 * verification loops, no Virtuals-style custody handoff. The agent acts with
 * the *user's own wallet* (or a dedicated agent key the user controls), and
 * every action it takes is attributable on Base.
 *
 * The agent card is the machine-readable storefront: what this agent is, what
 * it can do, and how to talk to it (A2A / MCP discovery).
 */

import type { Address } from "viem";
import { base } from "viem/chains";
import type { AgentIdentity } from "./types";
import { AGENT_CAPABILITIES } from "./types";

export const AGENT_NAME = "saywaht-agent";
export const AGENT_VERSION = "0.1.0";

/** The agent card document served at /.well-known/agent-card.json.
 *  Shape follows the A2A "AgentCard" convention so external agents can
 *  discover capabilities without a human in the loop. */
export interface AgentCard {
  name: string;
  description: string;
  url: string;
  provider: { organization: string; url: string };
  version: string;
  protocolVersion: string;
  preferredTransport: "JSONRPC";
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    extensions: string[];
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Array<{ id: string; name: string; description: string; tags: string[] }>;
  /** Where the tool schemas live (MCP endpoint) */
  mcpEndpoint: string;
  /** Chain + contract the agent settles on */
  network: { chainId: number; chainName: string; settlement: "ETH" };
  /** Payments: premium endpoints demand HTTP 402 in ETH on Base */
  payments: { scheme: "x402"; network: "base" }[];
}

export function buildAgentCard(origin: string): AgentCard {
  return {
    name: AGENT_NAME,
    description:
      "Agent-native interface to Saywaht: turn video into onchain commentary coins on Base. Transcribe, generate metadata, deploy creator-coin-backed content coins, quote and execute trades with platform referrals — all behind policy-gated, human-approvable tools.",
    url: `${origin}/api/agent/run`,
    provider: { organization: "Saywaht", url: origin },
    version: AGENT_VERSION,
    protocolVersion: "0.3.0",
    preferredTransport: "JSONRPC",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extensions: ["mcp-tools", "x402-payments"],
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    skills: AGENT_CAPABILITIES.map((cap) => ({
      id: cap,
      name: cap.replaceAll("_", " "),
      description: `Saywaht agent capability: ${cap}`,
      tags: ["saywaht", "zora", "base", "video", "creator-coins"],
    })),
    mcpEndpoint: `${origin}/api/mcp`,
    network: { chainId: base.id, chainName: "Base", settlement: "ETH" },
    payments: [{ scheme: "x402", network: "base" }],
  };
}

/** Build an identity for a given key/address. The address is not trusted
 *  input here — it is echoed back only after the runtime has verified a
 *  signature (SIWE-style) or an approved session. */
export function makeIdentity(address: Address, opts?: Partial<AgentIdentity>): AgentIdentity {
  return {
    name: AGENT_NAME,
    version: AGENT_VERSION,
    address,
    chainId: base.id,
    agentCardUrl: "/.well-known/agent-card.json",
    capabilities: [...AGENT_CAPABILITIES],
    trust: { validation: "human-approved" },
    ...opts,
  };
}
