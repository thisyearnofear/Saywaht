/**
 * Server-safe coin data access for the canonical /coin/[address] page.
 *
 * Why this exists separately from `lib/zora-coins.ts`:
 *  - `ZoraCoinsService` (the singleton in zora-coins.ts) guards every method on
 *    `typeof window === 'undefined'` and initializes a viem publicClient in the
 *    constructor — it is a *client-only* module by construction.
 *  - The coin page is a Server Component (ISR). It must fetch on the server.
 *  - `getCoin` from `@zoralabs/coins-sdk` is itself server-safe (the agent layer
 *    in `agent/tools.ts` already imports and calls it server-side), so we call
 *    it directly here and reuse the same field mapping as `transformCoinData`.
 *
 * The transform is extracted as a pure function so the client singleton and
 * this server path stay in sync without either importing the other.
 */

import { isAddress, type Address } from "viem";
import { getCoin } from "@zoralabs/coins-sdk";
import type { VideoCoin } from "./zora-coins";
import { fetchPlatformCoins } from "./coins-cache";

/**
 * Pure transform from a Zora SDK coin node into the app's `VideoCoin` shape.
 * Mirrors `ZoraCoinsService.transformCoinData` (zora-coins.ts:211) so server
 * and client render identical data. Kept here (not on the class) so it is
 * importable from server bundles without pulling the client-only singleton.
 */
export function transformCoinNode(coinNode: any): VideoCoin {
  const commentaryType = detectCommentaryType(coinNode.name, coinNode.description);

  return {
    address: coinNode.address || "0x0000000000000000000000000000000000000000",
    name: coinNode.name || "Untitled Commentary",
    symbol: coinNode.symbol || "COMM",
    creator: coinNode.creatorAddress || coinNode.creator?.address || "0x0000000000000000000000000000000000000000",
    videoUri: coinNode.contentURI || coinNode.tokenURI || "",
    videoPlaybackUrl: coinNode.contentURI || "",
    animationUrl: coinNode.animation_url || coinNode.contentURI || "",
    metadataUri: coinNode.tokenURI || coinNode.metadataURI || "",
    totalSupply: coinNode.totalSupply || "1000000",
    price: coinNode.price || "0.001",
    volume24h: coinNode.volume24h || "0",
    priceChange24h: Number(coinNode.marketCapDelta24h || coinNode.priceChange24h || 0),
    createdAt: coinNode.createdAt || new Date().toISOString(),
    thumbnail: coinNode.image || coinNode.thumbnail || "",
    commentaryType,
    originalContent: {
      title: coinNode.originalTitle,
      source: coinNode.originalSource,
      timestamp: coinNode.originalTimestamp,
    },
    marketCap: coinNode.marketCap || "0",
    holders: coinNode.holders || 0,
    creatorProfile: {
      name: coinNode.creator?.name || coinNode.creatorName,
      avatar: coinNode.creator?.avatar || coinNode.creatorAvatar,
      totalCoins: coinNode.creator?.totalCoins || 0,
      totalVolume: coinNode.creator?.totalVolume || "0",
      followers: coinNode.creator?.followers || 0,
      verified: coinNode.creator?.verified || false,
      specialties: coinNode.creator?.specialties || [],
    },
    engagementMetrics: {
      views: coinNode.views || 0,
      likes: coinNode.likes || 0,
      shares: coinNode.shares || 0,
      comments: coinNode.comments || 0,
      avgWatchTime: coinNode.avgWatchTime || 0,
    },
  };
}

function detectCommentaryType(
  name: string,
  description?: string,
): "reaction" | "analysis" | "tutorial" | "meme" | "news" {
  const text = `${name} ${description || ""}`.toLowerCase();
  if (text.includes("react") || text.includes("response") || text.includes("watching")) return "reaction";
  if (text.includes("analysis") || text.includes("breakdown") || text.includes("deep dive")) return "analysis";
  if (text.includes("how to") || text.includes("tutorial") || text.includes("guide")) return "tutorial";
  if (text.includes("meme") || text.includes("funny") || text.includes("lol")) return "meme";
  if (text.includes("news") || text.includes("breaking") || text.includes("update")) return "news";
  return "reaction";
}

/**
 * Fetch a single coin for the canonical coin page. Server-safe.
 *
 *  1. `getCoin` (Zora SDK) — on-chain price/volume/holders/creator.
 *  2. `fetchPlatformCoins` (coins-cache.ts) — platform DB metadata
 *     (thumbnail, createdAt) written by our own /api/coins on deploy.
 *
 * Returns `null` when the coin does not exist (caller renders notFound()).
 */
export async function getCoinForPage(rawAddress: string): Promise<VideoCoin | null> {
  if (!isAddress(rawAddress)) return null;
  const address = rawAddress as Address;

  // 1. Zora SDK — the source of truth for market data.
  let coin: VideoCoin | null = null;
  try {
    const response = await getCoin({ address });
    const node = response?.data?.zora20Token;
    if (node) {
      coin = transformCoinNode(node);
    }
  } catch (error) {
    console.error("[coin-page] getCoin failed for", address, error);
  }

  if (!coin) return null;

  // 2. Enrich with platform DB metadata (thumbnail/createdAt) when available.
  //    fetchPlatformCoins is server-safe (plain fetch, no window guard).
  try {
    const records = await fetchPlatformCoins();
    const record = records.find((r) => r.address.toLowerCase() === address.toLowerCase());
    if (record) {
      if (!coin.thumbnail && record.thumbnailUrl) coin.thumbnail = record.thumbnailUrl;
      // Prefer the platform DB's createdAt when the SDK didn't provide a real
      // timestamp (the transform falls back to `new Date().toISOString()`, which
      // is a placeholder, not a real creation time).
      if (record.createdAt) {
        coin.createdAt = record.createdAt;
      }
      if (record.metadataUri && !coin.metadataUri) coin.metadataUri = record.metadataUri;
    }
  } catch (error) {
    // Enrichment is best-effort; the page still renders from Zora data alone.
    console.error("[coin-page] platform enrichment failed for", address, error);
  }

  return coin;
}
