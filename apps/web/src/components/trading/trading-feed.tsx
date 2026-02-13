"use client";

import React, { useEffect, useState } from "react";
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
} from "@/lib/icons";
import { getZoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { useWalletAuth } from "@saywaht/auth";
import { useTrading } from "@/hooks/use-trading";
import { toast } from "sonner";

export function TradingFeed() {
  const { isAuthenticated, user } = useWalletAuth();
  const { buyCoin, sellCoin, isLoading: tradingLoading } = useTrading();
  const [coins, setCoins] = useState<VideoCoin[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<VideoCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ENHANCEMENT FIRST: Advanced filtering and discovery
  const [activeFilter, setActiveFilter] = useState<'trending' | 'gainers' | 'losers' | 'volume'>('trending');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [marketInsights, setMarketInsights] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change' | 'created'>('volume');

  const fetchTrendingCoins = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // ENHANCEMENT FIRST: Fetch market insights alongside coins
      const [trendingCoins, insights] = await Promise.all([
        getZoraCoins().getTrendingCoins(),
        getZoraCoins().getMarketInsights().catch(() => null) // Graceful fallback
      ]);

      setCoins(trendingCoins);
      setFilteredCoins(trendingCoins);
      setMarketInsights(insights);

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

  // ENHANCEMENT FIRST: Advanced filtering and sorting logic
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

    // Apply category filter using market insights
    if (marketInsights && activeFilter !== 'trending') {
      switch (activeFilter) {
        case 'gainers':
          filtered = marketInsights.topGainers || [];
          break;
        case 'losers':
          filtered = marketInsights.topLosers || [];
          break;
        case 'volume':
          filtered = marketInsights.volumeLeaders || [];
          break;
      }
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
  }, [searchQuery, coins, activeFilter, sortBy, marketInsights]);

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
    toast.info(`Playing: ${coin.name}`);
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
        <Button onClick={() => (window.location.href = "/")}>
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
                onClick={() => (window.location.href = "/editor")}
              >
                Create First Coin
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-center py-8">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Coins Available Yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a video coin on saywaht!
          </p>
          <Button onClick={() => (window.location.href = "/editor")}>
            Create Your First Commentary Coin
          </Button>
        </div>
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
      </div>

      {/* Coins Feed */}
      <div className="p-4 space-y-4">
        {filteredCoins.length === 0 ? (
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
                <Button onClick={() => (window.location.href = "/editor")}>
                  Create Your First Commentary Coin
                </Button>
              </>
            )}
          </div>
        ) : (
          filteredCoins.map((coin: VideoCoin) => (
            <CoinCard
              key={coin.address}
              coin={coin}
              onBuy={handleBuy}
              onSell={handleSell}
              onPlay={handlePlay}
            />
          ))
        )}
      </div>

      {/* Floating Create Button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        onClick={() => (window.location.href = "/editor")}
      >
        <span className="text-xl">✂️</span>
      </Button>
    </div>
  );
}