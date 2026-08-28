"use client";

import { useEffect, useState } from "react";
import { getZoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { fetchPlatformCoins } from "@/lib/coins-cache";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SimpleVideoPlayer } from "../ui/simple-video-player";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { Coins, TrendingUp } from "@/lib/icons";

interface DiscoveryFeedServerProps {
  initialCoins: VideoCoin[];
}

export function DiscoveryFeedServer({ initialCoins }: DiscoveryFeedServerProps) {
  const [coins, setCoins] = useState<VideoCoin[]>(initialCoins);
  const [isLoading, setIsLoading] = useState(!initialCoins.length);

  useEffect(() => {
    // If we have initial coins, don't refetch on client unless needed
    if (initialCoins.length > 0) {
      setIsLoading(false);
      return;
    }

    const fetchCoins = async () => {
      try {
        const platformCoins = await fetchPlatformCoins();

        if (platformCoins.length > 0) {
          const zoraService = getZoraCoins();
          const enriched = await Promise.all(
            platformCoins.map(async (pc) => {
              try {
                const liveData = await zoraService.getCoinData(pc.address);
                if (liveData) return liveData;
              } catch { }
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
      } catch (error) {
        console.error("Failed to fetch coins:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoins();
  }, [initialCoins]);

  if (isLoading) {
    return (
      <section className="py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto mb-4" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (coins.length === 0) {
    return null;
  }

  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Trending Now</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Discover Content</h2>
            <p className="text-muted-foreground mt-2">
              Explore trending video coins from the community
            </p>
          </div>
          <Link href="/trade">
            <Badge variant="outline" className="px-4 py-2">
              View All <Coins className="ml-2 w-4 h-4" />
            </Badge>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coins.slice(0, 6).map((coin) => (
            <Link key={coin.address} href={`/coin/${coin.address}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-video relative bg-muted">
                  {coin.thumbnail ? (
                    <img
                      src={coin.thumbnail}
                      alt={coin.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Coins className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{coin.name}</CardTitle>
                    {coin.priceChange24h !== 0 && (
                      <Badge
                        variant={coin.priceChange24h > 0 ? "default" : "destructive"}
                      >
                        {coin.priceChange24h > 0 ? "+" : ""}
                        {coin.priceChange24h.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {coin.symbol} • {coin.creator?.slice(0, 6)}...{coin.creator?.slice(-4)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
