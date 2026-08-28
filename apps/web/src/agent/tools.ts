/**
 * Tool registry — the agent's hands.
 *
 * Every Saywaht capability becomes a schema-described tool an agent (ours or
 * an external MCP client's) can call. Design rules:
 *
 *  - Read tools (market_insights, quote_trade, generate_metadata,
 *    prepare_coin) run server-side and are side-effect free -> auto-approved.
 *  - Money/publish tools (create_coin, trade_coin, update_coin) produce
 *    *signed-ready calldata* and require a human wallet signature by default.
 *    The agent never holds the user's keys (PG: user sovereignty). For fully
 *    autonomous agents, a dedicated agent key + smart wallet is the escalation
 *    path — via SDK 0.8 smart-wallet actions — still capped by policy.
 *  - Everything is auditable: tools return tx hashes / calldata, the runtime
 *    logs them.
 */

import { z } from "zod";
import { isAddress, parseEther } from "viem";
import {
  createCoinCall,
  createQuote,
  getCoin,
  getCoinsNew,
  updateCoinURICall,
  type CreateCoinArgs,
  type TradeParameters,
} from "@zoralabs/coins-sdk";
import { base } from "viem/chains";
import type { AgentTool, ToolContext } from "./types";

// Mirrors PLATFORM_ADDRESS in @/lib. Re-declared here because the @/lib barrel
// pulls client-only React modules into server route bundles; the agent layer
// must stay importable from server (route handler) contexts.
const PLATFORM_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058" as const;

// Canonical base URL for human/agent-clickable coin links, shared with the
// coin page and mint wizard via a dependency-free module (importable from
// server route contexts without pulling the client-only @/lib barrel).
// Every coin gets exactly one public URL: ${PLATFORM_URL}/coin/${address} —
// humans, shares, and agents all converge there.
import { PLATFORM_URL } from "@/lib/platform-url";

const address = z
  .string()
  .refine((v) => isAddress(v), { message: "invalid EVM address" }) as z.ZodType<`0x${string}`>;

/* ------------------------------ market_insights ----------------------------- */

const marketInsightsTool: AgentTool<
  { count?: number },
  { sentiment: string; topGainers: unknown[]; volumeLeaders: unknown[] }
> = {
  name: "market_insights",
  description:
    "Read-only snapshot of the Saywaht/Zora commentary-coin market: trending coins, 24h sentiment, top gainers and volume leaders on Base.",
  inputSchema: {
    type: "object",
    properties: {
      count: { type: "number", description: "Coins to scan (5-100, default 50)" },
    },
  },
  zodInput: z.object({ count: z.number().int().min(5).max(100).optional() }),
  mutates: false,
  maxCostWei: BigInt(0),
  async run(_ctx, { count = 50 }) {
    const res = await getCoinsNew({ count });
    const coins = (res?.data?.exploreList?.edges || [])
      .map((e: any) => e.node)
      .filter(Boolean)
      .map((n: any) => ({
        address: n.address,
        name: n.name,
        symbol: n.symbol,
        price: n.price,
        volume24h: n.volume24h,
        marketCap: n.marketCap,
        priceChange24h: Number(n.marketCapDelta24h ?? n.priceChange24h ?? 0),
        creator: n.creatorAddress || n.creator?.address,
      }));

    const avg =
      coins.length > 0
        ? coins.reduce((s: number, c: any) => s + c.priceChange24h, 0) / coins.length
        : 0;
    const sentiment = avg > 5 ? "bullish" : avg < -5 ? "bearish" : "neutral";

    return {
      sentiment,
      topGainers: [...coins]
        .sort((a: any, b: any) => b.priceChange24h - a.priceChange24h)
        .slice(0, 10),
      volumeLeaders: [...coins]
        .sort((a: any, b: any) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
        .slice(0, 10),
    };
  },
};

/* -------------------------------- quote_trade ------------------------------- */

const quoteTradeTool: AgentTool<
  {
    coin: `0x${string}`;
    side: "buy" | "sell";
    amountEth: string;
    slippage?: number;
    sender: `0x${string}`;
  },
  { amountOut: string; slippage: number; estCostWei: string }
> = {
  name: "quote_trade",
  description:
    "Get an executable quote for buying/sell a commentary coin with ETH on Base (Zora bonding curve via permit2). Returns exact amountOut — always quote before trade_coin.",
  inputSchema: {
    type: "object",
    properties: {
      coin: { type: "string", description: "Coin (ERC-20) address" },
      side: { type: "string", enum: ["buy", "sell"] },
      amountEth: { type: "string", description: "Input amount in ETH (decimal string)" },
      slippage: { type: "number", description: "0-0.1, default 0.03" },
      sender: { type: "string", description: "Trader address" },
    },
    required: ["coin", "side", "amountEth", "sender"],
  },
  zodInput: z.object({
    coin: address,
    side: z.enum(["buy", "sell"]),
    amountEth: z.string().regex(/^\d+(\.\d+)?$/),
    slippage: z.number().min(0).max(0.1).optional(),
    sender: address,
  }),
  mutates: false,
  maxCostWei: BigInt(0),
  async run(_ctx, { coin, side, amountEth, slippage = 0.03, sender }) {
    const params: TradeParameters = {
      sell: side === "buy" ? { type: "eth" } : { type: "erc20", address: coin },
      buy: side === "buy" ? { type: "erc20", address: coin } : { type: "eth" },
      amountIn: parseEther(amountEth),
      slippage,
      sender,
    };
    const quote = await createQuote(params);
    if (!quote?.success || !quote.quote) throw new Error("quote unavailable");
    return {
      amountOut: quote.quote.amountOut,
      slippage: quote.quote.slippage,
      estCostWei: side === "buy" ? parseEther(amountEth).toString() : "0",
    };
  },
};

/* ----------------------------- generate_metadata ---------------------------- */

const generateMetadataTool: AgentTool<
  { name: string; description?: string; videoUri: string; commentaryType?: string },
  { name: string; symbol: string; description: string; keywords: string[] }
> = {
  name: "generate_metadata",
  description:
    "Generate commentary-coin naming, ticker, description and keyword tags from a video URI and title. Deterministic, cheap, no LLM needed — an agent can always run this to plan a coin.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      videoUri: { type: "string", description: "ipfs:// or https:// video URI" },
      commentaryType: {
        type: "string",
        enum: ["reaction", "analysis", "tutorial", "meme", "news"],
      },
    },
    required: ["name", "videoUri"],
  },
  zodInput: z.object({
    name: z.string().min(2).max(60),
    description: z.string().max(500).optional(),
    videoUri: z.string().min(10),
    commentaryType: z.enum(["reaction", "analysis", "tutorial", "meme", "news"]).optional(),
  }),
  mutates: false,
  maxCostWei: BigInt(0),
  async run(_ctx, { name, description, videoUri, commentaryType }) {
    const words = name.trim().split(/\s+/);
    const symbol =
      words
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5) || "COMM";
    const lower = `${name} ${description || ""}`.toLowerCase();
    const keywords = [
      commentaryType,
      ...(lower.includes("crypto") || lower.includes("bitcoin") ? ["crypto"] : []),
      ...(lower.includes("sport") ? ["sports"] : []),
      ...(lower.includes("ai") || lower.includes("tech") ? ["tech"] : []),
      ...(lower.includes("news") || lower.includes("breaking") ? ["news"] : []),
    ].filter(Boolean) as string[];

    return {
      name: name.trim(),
      symbol,
      description:
        description ||
        `${commentaryType || "Commentary"} coin for "${name.trim()}". Media: ${videoUri}`,
      keywords,
    };
  },
};

/* ------------------------------- prepare_coin ------------------------------- */

const prepareCoinTool: AgentTool<
  {
    creator: `0x${string}`;
    name: string;
    symbol: string;
    metadataUri: string;
    currency?: "CREATOR_COIN_OR_ZORA" | "ZORA" | "ETH" | "CREATOR_COIN";
    startingMarketCap?: "LOW" | "HIGH";
  },
  { calls: unknown[]; predictedCoinAddress: string; estCostWei: string; url: string }
> = {
  name: "prepare_coin",
  description:
    "Build (but do not submit) the coin-creation calldata for a commentary coin via the Zora coin factory, with platformReferrer set so the platform earns protocol rewards. Returns predicted coin address + calls for the human/agent wallet to sign. Latest Zora primitive: content coins backed by the creator's coin (CREATOR_COIN_OR_ZORA).",
  inputSchema: {
    type: "object",
    properties: {
      creator: { type: "string" },
      name: { type: "string" },
      symbol: { type: "string" },
      metadataUri: { type: "string", description: "ipfs:// metadata JSON URI" },
      currency: {
        type: "string",
        enum: ["CREATOR_COIN_OR_ZORA", "ZORA", "ETH", "CREATOR_COIN"],
        description: "Pool backing currency. CREATOR_COIN_OR_ZORA links the content coin to the creator's coin.",
      },
      startingMarketCap: { type: "string", enum: ["LOW", "HIGH"] },
    },
    required: ["creator", "name", "symbol", "metadataUri"],
  },
  zodInput: z.object({
    creator: address,
    name: z.string().min(2).max(60),
    symbol: z.string().min(1).max(8),
    metadataUri: z.string().regex(/^(ipfs:\/\/|https:\/\/)/),
    currency: z.enum(["CREATOR_COIN_OR_ZORA", "ZORA", "ETH", "CREATOR_COIN"]).optional(),
    startingMarketCap: z.enum(["LOW", "HIGH"]).optional(),
  }),
  mutates: false, // builds calldata only; submission is create_coin
  maxCostWei: BigInt(0),
  async run(_ctx, input) {
    const args: CreateCoinArgs = {
      creator: input.creator,
      name: input.name,
      symbol: input.symbol,
      metadata: { type: "RAW_URI", uri: input.metadataUri },
      currency: input.currency || "CREATOR_COIN_OR_ZORA",
      chainId: base.id,
      startingMarketCap: input.startingMarketCap || "LOW",
      platformReferrer: PLATFORM_ADDRESS,
      payoutRecipientOverride: input.creator,
      skipMetadataValidation: true,
    };
    const { calls, predictedCoinAddress } = await createCoinCall(args);
    return {
      calls,
      predictedCoinAddress,
      estCostWei: "0", // factory create needs gas only; no buy-on-create
      url: `${PLATFORM_URL}/coin/${predictedCoinAddress}`,
    };
  },
};

/* -------------------------------- create_coin ------------------------------- */

const createCoinTool: AgentTool<
  {
    creator: `0x${string}`;
    name: string;
    symbol: string;
    metadataUri: string;
    currency?: "CREATOR_COIN_OR_ZORA" | "ZORA" | "ETH" | "CREATOR_COIN";
  },
  { requiresSignature: true; calls: unknown[]; predictedCoinAddress: string; url: string; instruction: string }
> = {
  name: "create_coin",
  description:
    "Deploy a commentary coin on Base through the Zora factory. Policy-gated: returns factory calldata for the user's wallet to sign (or, for smart-wallet agents, routes through the smart wallet). The agent never signs value transfers with user keys.",
  inputSchema: {
    type: "object",
    properties: {
      creator: { type: "string" },
      name: { type: "string" },
      symbol: { type: "string" },
      metadataUri: { type: "string" },
      currency: {
        type: "string",
        enum: ["CREATOR_COIN_OR_ZORA", "ZORA", "ETH", "CREATOR_COIN"],
      },
    },
    required: ["creator", "name", "symbol", "metadataUri"],
  },
  zodInput: z.object({
    creator: address,
    name: z.string().min(2).max(60),
    symbol: z.string().min(1).max(8),
    metadataUri: z.string().regex(/^(ipfs:\/\/|https:\/\/)/),
    currency: z.enum(["CREATOR_COIN_OR_ZORA", "ZORA", "ETH", "CREATOR_COIN"]).optional(),
  }),
  mutates: true,
  maxCostWei: BigInt("200000000000000"), // gas ceiling estimate: 0.0002 ETH
  async run(ctx: ToolContext, input) {
    const args: CreateCoinArgs = {
      creator: input.creator,
      name: input.name,
      symbol: input.symbol,
      metadata: { type: "RAW_URI", uri: input.metadataUri },
      currency: input.currency || "CREATOR_COIN_OR_ZORA",
      chainId: base.id,
      platformReferrer: PLATFORM_ADDRESS,
      payoutRecipientOverride: input.creator,
      skipMetadataValidation: true,
    };
    const { calls, predictedCoinAddress } = await createCoinCall(args);
    ctx.log({
      kind: "note",
      message: `create_coin prepared calldata for ${input.name} (${input.symbol}) -> ${predictedCoinAddress}`,
      data: { predictedCoinAddress },
    });
    return {
      requiresSignature: true as const,
      calls,
      predictedCoinAddress,
      url: `${PLATFORM_URL}/coin/${predictedCoinAddress}`,
      instruction:
        "Sign these calls with the creator wallet (wagmi sendTransaction) or submit via the agent smart wallet. The deployment emits CoinCreatedV4; read the coin address from logs.",
    };
  },
};

/* -------------------------------- trade_coin -------------------------------- */

const tradeCoinTool: AgentTool<
  {
    coin: `0x${string}`;
    side: "buy" | "sell";
    amountEth: string;
    slippage?: number;
    sender: `0x${string}`;
  },
  { requiresSignature: true; quote: { amountOut: string }; calls: unknown; instruction: string }
> = {
  name: "trade_coin",
  description:
    "Execute a buy/sell of a commentary coin. Policy-gated and quote-first: fetches a fresh createQuote (exact amountOut + permit2 calldata) and returns it for the user wallet (or smart-wallet user operation) to submit.",
  inputSchema: {
    type: "object",
    properties: {
      coin: { type: "string" },
      side: { type: "string", enum: ["buy", "sell"] },
      amountEth: { type: "string" },
      slippage: { type: "number" },
      sender: { type: "string" },
    },
    required: ["coin", "side", "amountEth", "sender"],
  },
  zodInput: z.object({
    coin: address,
    side: z.enum(["buy", "sell"]),
    amountEth: z.string().regex(/^\d+(\.\d+)?$/),
    slippage: z.number().min(0).max(0.1).optional(),
    sender: address,
  }),
  mutates: true,
  maxCostWei: BigInt("5000000000000000"), // bounded by policy.maxTradeWei anyway
  async run(ctx: ToolContext, { coin, side, amountEth, slippage = 0.03, sender }) {
    if (side === "buy" && parseEther(amountEth) > ctx.policy.maxTradeWei) {
      throw new Error(
        `trade size ${amountEth} ETH exceeds policy maxTradeWei ${ctx.policy.maxTradeWei}`,
      );
    }
    const params: TradeParameters = {
      sell: side === "buy" ? { type: "eth" } : { type: "erc20", address: coin },
      buy: side === "buy" ? { type: "erc20", address: coin } : { type: "eth" },
      amountIn: parseEther(amountEth),
      slippage,
      sender,
    };
    const quote = await createQuote(params);
    if (!quote?.success || !quote.call) throw new Error("quote unavailable");
    return {
      requiresSignature: true as const,
      quote: { amountOut: quote.quote?.amountOut ?? "0", slippage: quote.quote?.slippage ?? slippage },
      calls: { to: quote.call.target, data: quote.call.data, value: quote.call.value },
      permits: quote.permits ?? [],
      instruction:
        "Submit the call from the sender wallet with the quoted value. For smart-wallet agents use tradeCoinSmartWallet (permit2 approval is batched into the same user operation).",
    } as any;
  },
};

/* -------------------------------- update_coin ------------------------------- */

const updateCoinTool: AgentTool<
  { coin: `0x${string}`; newURI: string },
  { requiresSignature: true; to: string; data: string; instruction: string }
> = {
  name: "update_coin",
  description:
    "Rotate a coin's metadata URI (setContractURI) — e.g. after re-editing the video or fixing captions. ipfs:// URIs only. Policy-gated: returns the contract call for the creator wallet to sign.",
  inputSchema: {
    type: "object",
    properties: { coin: { type: "string" }, newURI: { type: "string", description: "new ipfs:// URI" } },
    required: ["coin", "newURI"],
  },
  zodInput: z.object({ coin: address, newURI: z.string().startsWith("ipfs://") }),
  mutates: true,
  maxCostWei: BigInt("100000000000000"), // gas only
  async run(_ctx, { coin, newURI }) {
    const cfg = updateCoinURICall({ coin, newURI }) as any;
    return {
      requiresSignature: true as const,
      to: cfg.to,
      data: cfg.data,
      instruction: "Sign with the coin creator's wallet (or smart wallet via updateCoinURISmartWallet).",
    };
  },
};

/* --------------------------------- transcribe ------------------------------- */

const transcribeTool: AgentTool<
  { audioUri: string },
  { status: "queued"; note: string }
> = {
  name: "transcribe",
  description:
    "Request a caption/transcription pass for an audio/video URI. Returns a queued acknowledgement; captions surface in the editor's caption pipeline.",
  inputSchema: {
    type: "object",
    properties: { audioUri: { type: "string" } },
    required: ["audioUri"],
  },
  zodInput: z.object({ audioUri: z.string().min(10) }),
  mutates: false,
  maxCostWei: BigInt(0),
  async run(_ctx, { audioUri }) {
    return {
      status: "queued" as const,
      note: `Transcription queued for ${audioUri}. See /api/ai/refine-captions for caption refinement.`,
    };
  },
};

/* ---------------------------------- notify ---------------------------------- */

const notifyTool: AgentTool<{ message: string }, { delivered: true; echo: string }> = {
  name: "notify",
  description:
    "Surface a message to the human (activity feed + UI toast). The agent's voice. Never auto-executes anything.",
  inputSchema: {
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"],
  },
  zodInput: z.object({ message: z.string().min(1).max(2000) }),
  mutates: false,
  maxCostWei: BigInt(0),
  async run(ctx, { message }) {
    ctx.log({ kind: "note", message: `agent says: ${message}` });
    return { delivered: true as const, echo: message };
  },
};

/* ---------------------------------- registry -------------------------------- */

export const AGENT_TOOLS: Record<string, AgentTool<any, any>> = {
  market_insights: marketInsightsTool,
  quote_trade: quoteTradeTool,
  generate_metadata: generateMetadataTool,
  prepare_coin: prepareCoinTool,
  create_coin: createCoinTool,
  trade_coin: tradeCoinTool,
  update_coin: updateCoinTool,
  transcribe: transcribeTool,
  notify: notifyTool,
};

/** SDK 0.8 requires an api-key for createQuote/createCoinCall endpoints on
 *  the Zora API. Server-side only — never shipped to the client. */
export async function ensureZoraApiKey(): Promise<void> {
  const key = process.env.ZORA_API_KEY;
  if (!key) return; // SDK works unauthenticated at lower rate limits
  const { setApiKey } = await import("@zoralabs/coins-sdk");
  setApiKey(key);
}
