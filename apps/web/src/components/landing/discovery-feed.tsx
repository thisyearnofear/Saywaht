"use client";

import { useEffect, useState } from "react";
import { getZoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SimpleVideoPlayer } from "../ui/simple-video-player";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { Coins, TrendingUp } from "@/lib/icons";

interface PlatformCoin {
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

export function DiscoveryFeed() {
  const [coins, setCoins] = useState<VideoCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        // Fetch platform coins first
        const platformRes = await fetch("/api/coins");
        const platformData = await platformRes.json();
        const platformCoins: PlatformCoin[] = platformData.coins || [];

        if (platformCoins.length > 0) {
          // Enrich with live Zora data where possible
          const zoraService = getZoraCoins();
          const enriched = await Promise.all(
            platformCoins.map(async (pc) => {
              try {
                const liveData = await zoraService.getCoinData(pc.address);
                if (liveData) return liveData;
              } catch {}
              // Fallback to platform data only
              return {
                address: pc.address,
                name: pc.name,
                symbol: pc.symbol,
                creator: pc.creatorAddress,
                videoUri: "",
                metadataUri: pc.metadataUri || "",
                totalSupply: "0",
                price: "0",
                volume24h: "0",
                priceChange24h: 0,
                createdAt: pc.createdAt,
                thumbnail: pc.thumbnailUrl || "",
              } as VideoCoin;
            })
          );
          setCoins(enriched);
        }
        // If no platform coins, show empty state (no fallback to all Zora coins)
      } catch (error) {
        console.error("❌ DiscoveryFeed: Failed to fetch coins:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (typeof window !== "undefined") {
      fetchCoins();
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Coins className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Latest Commentary Coins</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Coins className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Latest Commentary Coins</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {coins.map((coin: VideoCoin) => (
          <a
            key={coin.address}
            href={`https://zora.co/coin/base:${coin.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block touch-manipulation"
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate">{coin.name}</CardTitle>
                  <Badge variant="secondary">{coin.symbol}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {coin.thumbnail && !coin.videoUri && (
                  <div className="aspect-video rounded overflow-hidden mb-3">
                    <img
                      src={coin.thumbnail}
                      alt={coin.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {coin.videoUri && <SimpleVideoPlayer src={coin.videoUri} />}

                <div className="flex flex-col gap-2 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Creator:</span>
                    <span className="font-mono text-xs">
                      {String(coin.creator).slice(0, 6)}...
                      {String(coin.creator).slice(-4)}
                    </span>
                  </div>

                  {coin.price && coin.price !== "0" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold">{coin.price} ETH</span>
                    </div>
                  )}

                  {coin.volume24h && coin.volume24h !== "0" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        24h Volume:
                      </span>
                      <span className="font-semibold">{coin.volume24h}</span>
                    </div>
                  )}

                  {coin.createdAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-xs">
                        {new Date(coin.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {coins.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Coins className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No coins yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a commentary coin!
          </p>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            🎬 Get Started
          </Link>
        </div>
      )}
    </div>
  );
}
