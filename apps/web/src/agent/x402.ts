/**
 * x402 — machine-native payments for agent endpoints.
 *
 * The agentic economy has no "sign up for a plan". An agent that wants a
 * premium capability pays per call, in ETH on Base, with a 402 response
 * carrying a machine-readable payment requirement. No accounts, no API keys
 * to rot, no invoices a bot can't read.
 *
 * Flow:
 *  1. Agent POSTs to a gated endpoint.
 *  2. Without `X-PAYMENT`, server answers 402 + PaymentRequirement (JSON).
 *  3. Agent signs+sends the payment tx on Base, retries with `X-PAYMENT`.
 *  4. Server verifies the tx (value, payTo, recency) and serves the result.
 */

import { createPublicClient, http, parseEther, type Address, type Hex } from "viem";
import { base } from "viem/chains";
import type { PaymentRequirement } from "./types";

export const X402_PAYMENT_HEADER = "X-PAYMENT";

/** Platform treasury for agent payments — same address as coin platform
 *  referrer, so every revenue stream funnels to one durable entity. */
export const PAY_TO_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS as Address) ||
  "0x55A5705453Ee82c742274154136Fce8149597058";

/** Default price for premium agent endpoints, in ETH. */
export const PREMIUM_PRICE_ETH = "0.0001";

/** Whether the 402 paywall is armed. Off by default in dev so the surface is
 *  explorable; flip NEXT_PUBLIC_X402_ENABLED=1 to enforce. */
export function x402Enabled(): boolean {
  return process.env.NEXT_PUBLIC_X402_ENABLED === "1";
}

export function buildPaymentRequirement(
  origin: string,
  resource: string,
  priceEth: string = PREMIUM_PRICE_ETH,
): PaymentRequirement {
  return {
    scheme: "exact",
    network: "base",
    maxAmountRequired: parseEther(priceEth).toString(),
    payTo: PAY_TO_ADDRESS,
    asset: "ETH",
    resource: `${origin}${resource}`,
    description: `Pay ${priceEth} ETH on Base to use ${resource}`,
    validForSeconds: 300,
  };
}

export function x402Response(requirement: PaymentRequirement): Response {
  return Response.json(
    {
      error: "payment_required",
      accepts: [requirement],
    },
    {
      status: 402,
      headers: { [X402_PAYMENT_HEADER]: JSON.stringify(requirement) },
    },
  );
}

export interface X402Verification {
  ok: boolean;
  reason?: string;
  from?: Address;
  txHash?: Hex;
}

// viem's public-client generics are overly strict for a module-level cached
// singleton across call sites; keep it untyped at the boundary.
let serverClient: any = null;
function getServerClient() {
  if (!serverClient) {
    serverClient = createPublicClient({ chain: base, transport: http() });
  }
  return serverClient;
}

/**
 * Verify an `X-PAYMENT` header value: JSON { txHash, from }.
 * Checks the onchain transfer actually paid `requirement.payTo` at least
 * `maxAmountRequired`, and that the tx confirmed within the requirement window.
 */
export async function verifyPayment(
  headerValue: string | null,
  requirement: PaymentRequirement,
): Promise<X402Verification> {
  if (!headerValue) return { ok: false, reason: "missing X-PAYMENT header" };

  let parsed: { txHash?: string; from?: string };
  try {
    parsed = JSON.parse(headerValue);
  } catch {
    return { ok: false, reason: "X-PAYMENT header is not JSON" };
  }
  const { txHash, from } = parsed;
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash))
    return { ok: false, reason: "missing or malformed txHash" };
  if (!from || !/^0x[0-9a-fA-F]{40}$/.test(from))
    return { ok: false, reason: "missing or malformed from" };

  try {
    const client = getServerClient() as any;
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash as Hex }),
      client.getTransactionReceipt({ hash: txHash as Hex }),
    ]);

    if (receipt.status !== "success")
      return { ok: false, reason: "payment tx reverted" };
    if (tx.to?.toLowerCase() !== requirement.payTo.toLowerCase())
      return { ok: false, reason: "payment not sent to required payTo" };
    if (tx.value < BigInt(requirement.maxAmountRequired))
      return { ok: false, reason: "payment below required amount" };
    if (from.toLowerCase() !== tx.from.toLowerCase())
      return { ok: false, reason: "payer does not match declared from" };

    // Recency: compare tx timestamp against the requirement window.
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    const ageSec = Math.floor(Number(block.timestamp) / 1 - 0);
    const now = Math.floor(Date.now() / 1000);
    if (now - ageSec > requirement.validForSeconds * 6)
      return { ok: false, reason: "payment too old to accept" };

    return { ok: true, from: tx.from, txHash: txHash as Hex };
  } catch (error) {
    return {
      ok: false,
      reason: `payment verification failed: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}
