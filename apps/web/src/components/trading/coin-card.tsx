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
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

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
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toFixed(2);
  };

  const formatPriceChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <Badge className={cn("rounded-full border-none font-black text-[10px] tracking-widest px-2 py-0.5", 
        isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
        {isPositive ? "+" : ""}{change.toFixed(1)}%
      </Badge>
    );
  };

  const getCommentaryTypeIcon = (type?: string) => {
    switch (type) {
      case 'reaction': return '🎭';
      case 'analysis': return '🔍';
      case 'meme': return '😂';
      default: return '💬';
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

  const estimatedTokens = parseFloat(buyAmount) / parseFloat(coin.price || "0.0001");

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="w-full bg-card/50 backdrop-blur-sm border-border/40 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group overflow-hidden h-full flex flex-col rounded-3xl">
          <CardContent className="p-0">
            {/* Visual Section */}
            <div className="relative aspect-video bg-muted overflow-hidden">
              {coin.thumbnail ? (
                <img
                  src={coin.thumbnail}
                  alt={coin.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
              )}

              {/* Status Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-black/40 backdrop-blur-md text-[10px] font-black uppercase tracking-widest border-none text-white">
                  {getCommentaryTypeIcon(coin.commentaryType)} {coin.commentaryType || 'LIVE'}
                </Badge>
              </div>

              <div className="absolute top-3 right-3">
                {formatPriceChange(coin.priceChange24h || 0)}
              </div>

              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px]">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePlay}
                  className="rounded-full w-14 h-14 p-0 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500"
                >
                  <Play className="h-6 w-6 fill-current" />
                </Button>
              </div>
              
              {/* Floating metrics */}
              <div className="absolute bottom-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                 <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1">
                    <Eye className="h-3 w-3 text-white" />
                    <span className="text-[10px] font-black text-white">{coin.engagementMetrics?.views || 0}</span>
                 </div>
                 <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1">
                    <Heart className="h-3 w-3 text-white" />
                    <span className="text-[10px] font-black text-white">{coin.engagementMetrics?.likes || 0}</span>
                 </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-lg tracking-tight truncate group-hover:text-primary transition-colors">
                  {coin.name}
                </h3>
                
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black">
                    {coin.creator.slice(2, 4).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {coin.creatorProfile?.name || `${coin.creator.slice(0, 6)}...`}
                  </span>
                  <Badge variant="secondary" className="ml-auto rounded-full bg-muted/50 border-none font-black text-[9px] tracking-widest text-muted-foreground">
                    ${coin.symbol}
                  </Badge>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-2xl border border-border/20">
                <div className="space-y-0.5">
                  <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Price</div>
                  <div className="font-mono text-xs font-bold text-foreground">{formatPrice(coin.price || "0")}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Volume</div>
                  <div className="font-mono text-xs font-bold text-foreground">{formatVolume(coin.volume24h || "0")} ETH</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Dialog open={isBuyOpen} onOpenChange={setIsBuyOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1 rounded-xl h-10 font-bold text-xs shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95">
                      <Zap className="h-3.5 w-3.5 mr-1.5 fill-current" />
                      Invest
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black tracking-tight">Invest in {coin.symbol}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Amount (ETH)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          className="h-14 rounded-2xl text-xl font-bold bg-muted/30"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {["0.001", "0.01", "0.1"].map(p => (
                          <Button key={p} variant="outline" size="sm" onClick={() => setBuyAmount(p)} className="rounded-xl h-10 font-bold border-border/50">
                            {p} ETH
                          </Button>
                        ))}
                      </div>

                      <div className="glass rounded-2xl p-4 flex items-center justify-between border-border/40">
                         <span className="text-xs font-bold text-muted-foreground">Estimated Tokens</span>
                         <span className="font-mono font-black text-primary">~{estimatedTokens.toFixed(0)} {coin.symbol}</span>
                      </div>

                      <Button onClick={handleBuy} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 btn-hover">
                        Confirm Purchase
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isSellOpen} onOpenChange={setIsSellOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 rounded-xl h-10 font-bold text-xs border-border/50 transition-all hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30">
                      Sell
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[2.5rem] p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black tracking-tight">Sell {coin.symbol}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Amount (Tokens)</Label>
                        <Input
                          type="number"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          className="h-14 rounded-2xl text-xl font-bold bg-muted/30"
                        />
                      </div>
                      <Button onClick={handleSell} variant="destructive" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-destructive/20 transition-all hover:scale-105 active:scale-95">
                        Confirm Sale
                      </Button>
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
