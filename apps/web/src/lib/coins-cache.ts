/**
 * Lightweight in-memory cache for the /api/coins endpoint.
 *
 * Both DiscoveryFeed and TradingFeed mount at the same time on the landing page,
 * which previously fired two simultaneous fetches to persidian.com/api/coins and
 * triggered 429 "Too Many Requests" errors.
 *
 * This module de-duplicates concurrent requests (single in-flight promise shared
 * by all callers) and caches the response for CACHE_TTL_MS so that rapid
 * remounts (e.g. tab switches) don't re-hit the backend.
 */

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_EXPORT_URL || "https://persidian.com";

const CACHE_TTL_MS = 30_000; // 30-second TTL — fresh enough for a live feed

interface CoinRecord {
    id: string;
    address: string;
    name: string;
    symbol: string;
    creatorAddress: string;
    txHash?: string;
    metadataUri?: string;
    thumbnailUrl?: string;
    createdAt: string;
}

interface CacheEntry {
    coins: CoinRecord[];
    fetchedAt: number;
}

let _cache: CacheEntry | null = null;
let _inflight: Promise<CoinRecord[]> | null = null;

/**
 * Fetches the platform coins list with deduplication + TTL caching.
 *
 * - If a valid cache entry exists it is returned synchronously-ish.
 * - If a fetch is already in-flight all callers await the same promise.
 * - On 429 / network error it returns stale cache if available, otherwise
 *   throws so callers can show their own error / empty state.
 */
export async function fetchPlatformCoins(): Promise<CoinRecord[]> {
    // Cache hit
    if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
        return _cache.coins;
    }

    // Deduplicate concurrent calls
    if (_inflight) return _inflight;

    _inflight = (async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/coins`);

            if (res.status === 429) {
                // Rate limited — return stale cache if we have it, else empty list
                console.warn("[coins-cache] 429 from /api/coins — using stale cache");
                return _cache?.coins ?? [];
            }

            if (!res.ok) {
                throw new Error(`/api/coins returned ${res.status}`);
            }

            const data = await res.json();
            const coins: CoinRecord[] = data.coins || [];

            _cache = { coins, fetchedAt: Date.now() };
            return coins;
        } catch (err) {
            // On any network error, return stale cache rather than crashing the UI
            if (_cache) {
                console.warn("[coins-cache] fetch failed, using stale cache:", err);
                return _cache.coins;
            }
            throw err;
        } finally {
            _inflight = null;
        }
    })();

    return _inflight;
}

/** Force-invalidate the cache (e.g. after minting a new coin). */
export function invalidateCoinsCache(): void {
    _cache = null;
    _inflight = null;
}
