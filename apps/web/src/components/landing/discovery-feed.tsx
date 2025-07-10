"use client";

import { useEffect, useState } from "@/lib/hooks-provider";
import { zoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SimpleVideoPlayer } from "../ui/simple-video-player";
import { Badge } from "../ui/badge";
import { Coins, TrendingUp } from "@/lib/icons-provider";

export function DiscoveryFeed() {
  const [coins, setCoins] = useState<VideoCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const data = await zoraCoins.getTrendingCoins();
        setCoins(data);
      } catch (error) {
        console.error("Failed to fetch coins:", error);
        // Set some fallback data if API fails
        setCoins([
          {
            address: "0x1234567890123456789012345678901234567890",
            name: "Sample Commentary",
            symbol: "SAMPLE",
            creator: "0x0000000000000000000000000000000000000000",
            videoUri: "/templates/voiceovers/animal/cheetah.mp4",
            metadataUri: "",
            totalSupply: "1000000",
            price: "0.001",
            volume24h: "0",
            priceChange24h: 0,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoins();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Coins className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Latest Commentary Coins</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Coins className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Latest Commentary Coins</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coins.map((coin: VideoCoin) => (
          <Card
            key={coin.address}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="truncate">{coin.name}</CardTitle>
                <Badge variant="secondary">{coin.symbol}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {coin.videoUri && <SimpleVideoPlayer src={coin.videoUri} />}

              <div className="flex flex-col gap-2 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Creator:</span>
                  <span className="font-mono text-xs">
                    {String(coin.creator).slice(0, 6)}...
                    {String(coin.creator).slice(-4)}
                  </span>
                </div>

                {coin.price && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-semibold">{coin.price} ETH</span>
                  </div>
                )}

                {coin.volume24h && (
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
        ))}
      </div>

      {coins.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Coins className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No coins found</h3>
          <p className="text-muted-foreground">
            Be the first to create a video coin!
          </p>
        </div>
      )}
    </div>
  );
}
