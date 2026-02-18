"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CoinCard } from "./coin-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Search,
  Play,
  X,
} from "@/lib/icons";
import { getZoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { useWalletAuth } from "@saywaht/auth";
import { useTrading } from "@/hooks/use-trading";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TradingFeed() {
  const router = useRouter();
  const { isAuthenticated, user } = useWalletAuth();
  const { buyCoin, sellCoin, isLoading: tradingLoading } = useTrading();
  const [coins, setCoins] = useState<VideoCoin[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<VideoCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Video playback state
  const [selectedCoin, setSelectedCoin] = useState<VideoCoin | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Sorting and filtering
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change' | 'created'>('created');

  const fetchTrendingCoins = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Fetch Saywaht coins from database (not all Zora coins)
      const response = await fetch('/api/coins');
      const data = await response.json();
      
      // Transform database coins to VideoCoin format
      const dbCoins = data.coins || [];
      
      // Enrich with on-chain data from Zora if available
      const enrichedCoins = await Promise.all(
        dbCoins.map(async (dbCoin: any) => {
          try {
            // Try to get current price/volume data from Zora
            const coinData = await getZoraCoins().getCoinData(dbCoin.address);
            
            // If we have coinData from Zora, ensure videoUri is correct
            // Sometimes Zora SDK returns metadata URI in videoUri field
            if (coinData && (coinData.videoUri.includes('.json') || coinData.videoUri.includes('gateway.pinata.cloud/ipfs/'))) {
               // Try to fetch metadata to find actual video
               try {
                 const metaRes = await fetch(coinData.videoUri);
                 if (metaRes.ok) {
                   const meta = await metaRes.json();
                   if (meta.animation_url) coinData.videoUri = meta.animation_url;
                   else if (meta.content?.uri) coinData.videoUri = meta.content.uri;
                 }
               } catch (e) {}
            }

            return coinData || {
              address: dbCoin.address,
              name: dbCoin.name,
              symbol: dbCoin.symbol,
              creator: dbCoin.creatorAddress,
              price: "0",
              volume24h: "0",
              priceChange24h: 0,
              thumbnail: dbCoin.thumbnailUrl || "",
              videoUri: "", 
              metadataUri: dbCoin.metadataUri || "",
              totalSupply: "0",
              createdAt: dbCoin.createdAt,
              marketCap: "0",
            };
          } catch (error) {
            // Fallback to database data if Zora fetch fails
            return {
              address: dbCoin.address,
              name: dbCoin.name,
              symbol: dbCoin.symbol,
              creator: dbCoin.creatorAddress,
              price: "0",
              volume24h: "0",
              priceChange24h: 0,
              thumbnail: dbCoin.thumbnailUrl || "",
              videoUri: "",
              metadataUri: dbCoin.metadataUri || "",
              totalSupply: "0",
              createdAt: dbCoin.createdAt,
              marketCap: "0",
            };
          }
        })
      );

      // Second pass: resolve video URIs for coins that don't have them
      const fullyEnrichedCoins = await Promise.all(
        enrichedCoins.map(async (coin) => {
          if (!coin.videoUri && coin.metadataUri) {
            try {
              const metaRes = await fetch(coin.metadataUri);
              if (metaRes.ok) {
                const meta = await metaRes.json();
                return {
                  ...coin,
                  videoUri: meta.animation_url || meta.content?.uri || "",
                  thumbnail: coin.thumbnail || meta.image || ""
                };
              }
            } catch (e) {
              console.warn(`Failed to fetch metadata for ${coin.name}:`, e);
            }
          }
          return coin;
        })
      );

      setCoins(fullyEnrichedCoins);
      setFilteredCoins(fullyEnrichedCoins);

      if (showRefreshIndicator) {
        toast.success("Feed refreshed!");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load coins";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrendingCoins();
  }, []);

  // Apply search and sorting
  useEffect(() => {
    let filtered = [...coins];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(coin =>
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.creator.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return parseFloat(b.volume24h) - parseFloat(a.volume24h);
        case 'price':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'change':
          return b.priceChange24h - a.priceChange24h;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredCoins(filtered);
  }, [searchQuery, coins, sortBy]);

  const handleBuy = async (coin: VideoCoin, amount: string) => {
    if (!isAuthenticated || !user?.address) {
      toast.error("Please connect your wallet to trade");
      return;
    }

    try {
      await buyCoin(coin.address, amount);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Buy error:", error);
    }
  };

  const handleSell = async (coin: VideoCoin, amount: string) => {
    if (!isAuthenticated || !user?.address) {
      toast.error("Please connect your wallet to trade");
      return;
    }

    try {
      await sellCoin(coin.address as string, amount);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Sell error:", error);
    }
  };

  const handlePlay = (coin: VideoCoin) => {
    if (!coin.videoUri) {
      toast.error("No video available for this coin");
      return;
    }
    setSelectedCoin(coin);
    setIsVideoOpen(true);
  };

  const handleRefresh = () => {
    fetchTrendingCoins(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">💬</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">Connect Wallet to Trade Commentary</h2>
        <p className="text-muted-foreground mb-4">
          Connect your wallet to discover and trade video commentary coins
        </p>
        <Button onClick={() => router.push("/")}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading commentary coins...</p>
        <p className="text-xs text-muted-foreground mt-2">
          Discovering reactions, analysis & creator insights
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>{error}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTrendingCoins()}
              >
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/editor")}
              >
                Create First Coin
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Enhanced Header with Search */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">💬</span>
              <h1 className="text-xl font-bold">Commentary Coins</h1>
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                Beta
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Trade creator commentary & reactions • {filteredCoins.length} coins
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commentary coins by creator, topic, or type..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge
            variant={sortBy === 'created' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSortBy('created')}
          >
            Latest First
          </Badge>
          <Badge
            variant={sortBy === 'volume' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSortBy('volume')}
          >
            Most Active
          </Badge>
          <Badge
            variant={sortBy === 'price' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSortBy('price')}
          >
            Highest Price
          </Badge>
          <Badge
            variant={sortBy === 'change' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSortBy('change')}
          >
            Top Gainers
          </Badge>
        </div>
      </div>

      {/* Coins Feed */}
      {filteredCoins.length === 0 ? (
        <div className="p-4">
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No coins found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No commentary coins found</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a commentary coin!
                </p>
                <Button onClick={() => router.push("/editor")}>
                  Create Your First Commentary Coin
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoins.map((coin: VideoCoin) => (
            <CoinCard
              key={coin.address}
              coin={coin}
              onBuy={handleBuy}
              onSell={handleSell}
              onPlay={handlePlay}
            />
          ))}
        </div>
      )}

      {/* Video Playback Dialog */}
      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedCoin?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video w-full bg-black">
            {selectedCoin?.videoUri && (
              <video
                src={selectedCoin.videoUri}
                className="w-full h-full"
                autoPlay
                controls
                playsInline
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-50"
              onClick={() => setIsVideoOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
              <h2 className="text-white text-xl font-bold">{selectedCoin?.name}</h2>
              <p className="text-white/60 text-sm">@{selectedCoin?.symbol}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Create Button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        onClick={() => router.push("/editor")}
      >
        <span className="text-xl">✂️</span>
      </Button>
    </div>
  );
}
