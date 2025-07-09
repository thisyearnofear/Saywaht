"use client";

import { useEffect, useState } from "react";
import { CoinCard } from "./coin-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { zoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { useWalletAuth } from "@opencut/auth";
import { useTrading } from "@/hooks/use-trading";
import { toast } from "sonner";

export function TradingFeed() {
  const { isAuthenticated, user } = useWalletAuth();
  const { buyCoin, sellCoin, isLoading: tradingLoading } = useTrading();
  const [coins, setCoins] = useState<VideoCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingCoins = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const trendingCoins = await zoraCoins.getTrendingCoins();
      setCoins(trendingCoins);

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

  const handleBuy = async (coin: VideoCoin) => {
    if (!isAuthenticated || !user?.address) {
      toast.error("Please connect your wallet to trade");
      return;
    }

    try {
      toast.loading("Preparing buy order...");

      await buyCoin(coin.address, "0.001"); // Default 0.001 ETH

    } catch (error) {
      toast.dismiss();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Trading not yet available: ${errorMessage}`);
      console.error("Buy error:", error);
    }
  };

  const handleSell = async (coin: VideoCoin) => {
    if (!isAuthenticated || !user?.address) {
      toast.error("Please connect your wallet to trade");
      return;
    }

    try {
      toast.loading("Preparing sell order...");

      // TODO: Implement actual sell logic with amount selection
      const txHash = await zoraCoins.sellCoin({
        coinAddress: coin.address,
        amount: "0.01", // Default amount for now
      });

      toast.success(`Sell order successful! TX: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      toast.dismiss();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Trading not yet available: ${errorMessage}`);
      console.error("Sell error:", error);
    }
  };

  const handlePlay = (coin: VideoCoin) => {
    // TODO: Implement video playback
    toast.info(`Playing: ${coin.name}`);
  };

  const handleRefresh = () => {
    fetchTrendingCoins(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Connect Wallet to Trade</h2>
        <p className="text-muted-foreground mb-4">
          Connect your wallet to discover and trade video creator coins
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
        <p className="text-muted-foreground">Loading trending video coins...</p>
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
            Be the first to create a video coin on SayWhat!
          </p>
          <Button onClick={() => (window.location.href = "/editor")}>
            Create Your First Video Coin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {" "}
      {/* Bottom padding for floating button */}
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Trending Video Coins</h1>
            <p className="text-sm text-muted-foreground">
              Discover and trade creator coins
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
      </div>
      {/* Coins Feed */}
      <div className="p-4 space-y-4">
        {coins.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No coins found</h3>
            <p className="text-muted-foreground">
              Be the first to create a video coin!
            </p>
          </div>
        ) : (
          coins.map((coin) => (
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
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        onClick={() => (window.location.href = "/editor")}
      >
        <span className="text-xl">✂️</span>
      </Button>
    </div>
  );
}
