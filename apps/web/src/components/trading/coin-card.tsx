"use client";

import { useState } from "@/lib/hooks-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  TrendingUp,
  TrendingDown,
  Users,
  Volume2,
} from "@/lib/icons-provider";
import { type VideoCoin } from "@/lib/zora-coins";
import { formatEther } from "viem";

interface CoinCardProps {
  coin: VideoCoin;
  onBuy: (coin: VideoCoin) => void;
  onSell: (coin: VideoCoin) => void;
  onPlay: (coin: VideoCoin) => void;
}

export function CoinCard({ coin, onBuy, onSell, onPlay }: CoinCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatPrice = (price: string) => {
    return `${parseFloat(price).toFixed(4)} ETH`;
  };

  const formatVolume = (volume: string) => {
    const vol = parseFloat(volume);
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toFixed(0);
  };

  const formatPriceChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <div
        className={`flex items-center gap-1 ${isPositive ? "text-green-500" : "text-red-500"}`}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {isPositive ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      </div>
    );
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    onPlay(coin);
  };

  return (
    <Card className="w-full max-w-sm mx-auto bg-card border-border">
      <CardContent className="p-0">
        {/* Video Preview Section */}
        <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
          {/* Video thumbnail/preview would go here */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePlay}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-4"
            >
              <Play className="h-8 w-8" fill="currentColor" />
            </Button>
          </div>

          {/* Price change indicator */}
          <div className="absolute top-3 right-3">
            {formatPriceChange(coin.priceChange24h)}
          </div>
        </div>

        {/* Coin Info Section */}
        <div className="p-4 space-y-3">
          {/* Title and Symbol */}
          <div className="space-y-1">
            <h3 className="font-semibold text-lg leading-tight">{coin.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                ${coin.symbol}
              </Badge>
              <span className="text-xs text-muted-foreground">
                by {coin.creator.slice(0, 6)}...{coin.creator.slice(-4)}
              </span>
            </div>
          </div>

          {/* Price and Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Price</div>
              <div className="font-semibold">{formatPrice(coin.price)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">24h Volume</div>
              <div className="font-semibold">
                {formatVolume(coin.volume24h)} ETH
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{formatVolume(coin.totalSupply)} supply</span>
            </div>
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              <span>{new Date(coin.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Trading Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onBuy(coin)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              Buy
            </Button>
            <Button
              onClick={() => onSell(coin)}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              size="sm"
            >
              Sell
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
