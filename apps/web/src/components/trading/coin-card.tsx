"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  TrendingUp,
  TrendingDown,
  Users,
  Volume2,
  AlertTriangle,
  Zap,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Clock,
  Sparkles,
  CheckCircle,
} from "@/lib/icons";
import { type VideoCoin } from "@/lib/zora-coins";
import { formatEther } from "viem";
import { motion } from "motion/react";

interface CoinCardProps {
  coin: VideoCoin;
  onBuy: (coin: VideoCoin, amount: string) => void;
  onSell: (coin: VideoCoin, amount: string) => void;
  onPlay: (coin: VideoCoin) => void;
}

export function CoinCard({ coin, onBuy, onSell, onPlay }: CoinCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [buyAmount, setBuyAmount] = useState("0.001");
  const [sellAmount, setSellAmount] = useState("100");
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);

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

  const getCommentaryTypeIcon = (type?: string) => {
    switch (type) {
      case 'reaction': return '🎭';
      case 'analysis': return '🔍';
      case 'tutorial': return '📚';
      case 'meme': return '😂';
      case 'news': return '📰';
      default: return '💬';
    }
  };

  const getCommentaryTypeColor = (type?: string) => {
    switch (type) {
      case 'reaction': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'analysis': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'tutorial': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'meme': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'news': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    onPlay(coin);
  };

  const handleBuy = () => {
    onBuy(coin, buyAmount);
    setIsBuyOpen(false);
  };

  const handleSell = () => {
    onSell(coin, sellAmount);
    setIsSellOpen(false);
  };

  // Calculate estimated tokens for buy
  const estimatedTokens = parseFloat(buyAmount) / parseFloat(coin.price);
  const priceImpact = parseFloat(buyAmount) > 0.01 ? 2.5 : 1.2;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="w-full max-w-sm mx-auto bg-card border-border hover:shadow-xl transition-all duration-300 group overflow-hidden">
          <CardContent className="p-0">
            {/* Enhanced Video Preview Section */}
            <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
              {coin.thumbnail ? (
                <img
                  src={coin.thumbnail}
                  alt={coin.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
              )}

              {/* Commentary Type Badge */}
              <div className="absolute top-3 left-3">
                <Badge className={`text-xs font-medium border ${getCommentaryTypeColor(coin.commentaryType)}`}>
                  <span className="mr-1">{getCommentaryTypeIcon(coin.commentaryType)}</span>
                  {coin.commentaryType || 'commentary'}
                </Badge>
              </div>

              {/* Price Change Indicator */}
              <div className="absolute top-3 right-3">
                {formatPriceChange(coin.priceChange24h)}
              </div>

              {/* Play Button Overlay with Enhanced Animation */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handlePlay}
                    className="bg-black/50 hover:bg-black/70 text-white rounded-full p-4 backdrop-blur-sm"
                  >
                    <Play className="h-8 w-8" fill="currentColor" />
                  </Button>
                </motion.div>
              </div>

              {/* Engagement Metrics Overlay */}
              {coin.engagementMetrics && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {coin.engagementMetrics.views && coin.engagementMetrics.views > 0 && (
                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <Eye className="h-3 w-3 text-white" />
                      <span className="text-xs text-white font-medium">
                        {coin.engagementMetrics.views > 1000
                          ? `${(coin.engagementMetrics.views / 1000).toFixed(1)}K`
                          : coin.engagementMetrics.views
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced Content Section */}
            <div className="p-4 space-y-3">
              {/* Title and Original Content Reference */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                  {coin.name}
                </h3>

                {/* Original Content Reference */}
                {coin.originalContent?.title && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs">💬</span>
                    <span className="truncate">Re: {coin.originalContent.title}</span>
                  </div>
                )}

                {/* Creator Profile Section */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {coin.creatorProfile?.avatar ? (
                      <img
                        src={coin.creatorProfile.avatar}
                        alt={coin.creatorProfile.name || 'Creator'}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">
                          {coin.creator.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">
                        {coin.creatorProfile?.name || `${coin.creator.slice(0, 6)}...${coin.creator.slice(-4)}`}
                      </span>
                      {coin.creatorProfile?.verified && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  </div>

                  <Badge variant="secondary" className="text-xs ml-auto">
                    ${coin.symbol}
                  </Badge>
                </div>

                {/* Creator Specialties */}
                {coin.creatorProfile?.specialties && coin.creatorProfile.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {coin.creatorProfile.specialties.slice(0, 3).map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Enhanced Stats Grid */}
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

              {/* Engagement Metrics */}
              {coin.engagementMetrics && (
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>{coin.engagementMetrics.likes || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Likes</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{coin.engagementMetrics.comments || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Comments</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        <span>{coin.engagementMetrics.shares || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shares</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{coin.holders || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Holders</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(coin.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Created</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Enhanced Trading Actions */}
              <div className="flex gap-2 pt-2">
                {/* Buy Dialog with Commentary Context */}
                <Dialog open={isBuyOpen} onOpenChange={setIsBuyOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:shadow-lg"
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Invest
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Invest in {coin.creatorProfile?.name || coin.symbol}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Commentary Context */}
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getCommentaryTypeIcon(coin.commentaryType)}</span>
                          <span className="font-medium capitalize">{coin.commentaryType} Commentary</span>
                        </div>
                        {coin.originalContent?.title && (
                          <p className="text-sm text-muted-foreground">
                            About: {coin.originalContent.title}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="buy-amount">Investment Amount (ETH)</Label>
                        <Input
                          id="buy-amount"
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          placeholder="0.001"
                        />
                        <div className="flex gap-2">
                          {["0.001", "0.01", "0.1"].map((preset) => (
                            <Button
                              key={preset}
                              variant="outline"
                              size="sm"
                              onClick={() => setBuyAmount(preset)}
                              className="flex-1"
                            >
                              {preset} ETH
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">You'll receive</span>
                          <span className="font-medium">~{estimatedTokens.toFixed(0)} {coin.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price impact</span>
                          <span className={priceImpact > 5 ? "text-red-500" : "text-green-500"}>
                            {priceImpact.toFixed(1)}%
                          </span>
                        </div>
                        {priceImpact > 5 && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">
                              High price impact
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsBuyOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleBuy} className="flex-1">
                          <Zap className="h-4 w-4 mr-2" />
                          Invest in Commentary
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Sell Dialog */}
                <Dialog open={isSellOpen} onOpenChange={setIsSellOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 transition-all duration-200"
                      size="sm"
                    >
                      Sell
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        Sell {coin.symbol}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sell-amount">Amount (Tokens)</Label>
                        <Input
                          id="sell-amount"
                          type="number"
                          step="1"
                          min="1"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          placeholder="100"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsSellOpen(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleSell} variant="destructive" className="flex-1">
                          <TrendingDown className="h-4 w-4 mr-2" />
                          Sell {coin.symbol}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
