"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  ExternalLink,
  Share2,
  Wallet,
  Loader2,
} from "@/lib/icons";
import { useWalletAuth, formatWalletAddress } from "@saywaht/auth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useTrading } from "@/hooks/use-trading";
import { type VideoCoin } from "@/lib/zora-coins";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Base chain id for the Zora "View on Zora" link.
const ZORA_COIN_URL = (address: string) => `https://zora.co/coin/base:${address}`;

// Canonical share URL — the *page itself*, not Zora. This is the rule everything
// follows from: every coin has exactly one canonical, public, server-rendered URL.
const CANONICAL_COIN_URL = (address: string) =>
  `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.app"}/coin/${address}`;

interface CoinPageClientProps {
  coin: VideoCoin;
}

export function CoinPageClient({ coin }: CoinPageClientProps) {
  const { isAuthenticated } = useWalletAuth();
  const { openConnectModal } = useConnectModal();
  const { buyCoin, sellCoin, isLoading: tradingLoading } = useTrading();

  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [buyAmount, setBuyAmount] = useState("0.001");
  const [sellAmount, setSellAmount] = useState("100");

  const formatPrice = (price: string) => `${parseFloat(price || "0").toFixed(6)} ETH`;
  const formatVolume = (volume: string) => {
    const vol = parseFloat(volume || "0");
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toFixed(2);
  };
  const formatMarketCap = (cap: string) => formatVolume(cap || "0");

  const isPositive = coin.priceChange24h >= 0;
  const estimatedTokens =
    parseFloat(buyAmount) / parseFloat(coin.price || "0.0001");

  // The wallet wall lives HERE, on click — never on page load. A visitor who
  // is not connected sees the full page; only the Buy/Sell intent triggers the
  // connect modal, then returns here (the page is the return destination).
  const handleTradeClick = useCallback(
    (side: "buy" | "sell") => {
      if (!isAuthenticated) {
        openConnectModal?.();
        return;
      }
      if (side === "buy") setIsBuyOpen(true);
      else setIsSellOpen(true);
    },
    [isAuthenticated, openConnectModal],
  );

  const handleBuy = async () => {
    try {
      await buyCoin(coin.address as string, buyAmount);
      setIsBuyOpen(false);
    } catch {
      // useTrading surfaces its own toast on error.
    }
  };

  const handleSell = async () => {
    try {
      await sellCoin(coin.address as string, sellAmount);
      setIsSellOpen(false);
    } catch {
      // useTrading surfaces its own toast on error.
    }
  };

  const handleShareFarcaster = () => {
    const url = CANONICAL_COIN_URL(coin.address as string);
    const text = `Check out ${coin.name} ($${coin.symbol}) on saywaht`;
    window.open(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Back link */}
      <Link
        href="/trade"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse coins
      </Link>

      {/* Header: name, symbol, price, change */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{coin.name}</h1>
            <Badge variant="outline" className="text-sm font-bold">
              ${coin.symbol}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created by {coin.creator ? formatWalletAddress(coin.creator as string) : "unknown"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">{formatPrice(coin.price)}</div>
          <Badge
            className={cn(
              "rounded-full border-none font-bold",
              isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500",
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {isPositive ? "+" : ""}
            {coin.priceChange24h.toFixed(1)}%
          </Badge>
        </div>
      </div>

      {/* Video */}
      <Card className="overflow-hidden border-border/40 rounded-3xl">
        <CardContent className="p-0">
          <div className="relative aspect-video w-full bg-black">
            {coin.videoUri ? (
              <video
                src={coin.videoUri}
                className="w-full h-full"
                controls
                playsInline
                poster={coin.thumbnail || undefined}
              />
            ) : coin.thumbnail ? (
              <img
                src={coin.thumbnail}
                alt={coin.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No video available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Market Cap" value={formatMarketCap(coin.marketCap || "0")} />
        <StatCard label="24h Volume" value={formatVolume(coin.volume24h)} />
        <StatCard
          label="Holders"
          value={coin.holders ? coin.holders.toLocaleString() : "—"}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Total Supply"
          value={parseFloat(coin.totalSupply || "0").toLocaleString()}
        />
      </div>

      {/* Chart (lazy) — heavy lib, client-only per AGENTS.md */}
      <CoinChart coin={coin} />

      {/* Creator card */}
      {coin.creatorProfile && (coin.creatorProfile.name || coin.creatorProfile.avatar) && (
        <Card className="border-border/40 rounded-3xl">
          <CardContent className="p-5 flex items-center gap-4">
            {coin.creatorProfile.avatar ? (
              <img
                src={coin.creatorProfile.avatar}
                alt={coin.creatorProfile.name || "Creator"}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {(coin.creatorProfile.name || coin.creator as string).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold truncate">
                  {coin.creatorProfile.name || formatWalletAddress(coin.creator as string)}
                </p>
                {coin.creatorProfile.verified && (
                  <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {coin.creatorProfile.totalCoins || 0} coins ·{" "}
                {formatVolume(coin.creatorProfile.totalVolume || "0")} volume
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade + share actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleTradeClick("buy")}
            disabled={tradingLoading}
            className="h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
          >
            {tradingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buy"}
          </Button>
          <Button
            onClick={() => handleTradeClick("sell")}
            disabled={tradingLoading}
            variant="outline"
            className="h-14 rounded-2xl font-black text-lg border-border/50 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
          >
            Sell
          </Button>
        </div>

        {/* Wallet hint for unconnected visitors — not a wall, just a nudge */}
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Connect a wallet to trade
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Button onClick={handleShareFarcaster} variant="outline" className="rounded-xl">
            <Share2 className="h-4 w-4 mr-2" />
            Farcaster
          </Button>
          <Button onClick={handleCopyLink} variant="outline" className="rounded-xl">
            Copy link
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <a
              href={ZORA_COIN_URL(coin.address as string)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Zora
            </a>
          </Button>
        </div>
      </div>

      {/* Buy dialog */}
      <Dialog open={isBuyOpen} onOpenChange={setIsBuyOpen}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Buy ${coin.symbol}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
                Amount (ETH)
              </Label>
              <Input
                type="number"
                step="0.001"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="h-14 rounded-2xl text-xl font-bold bg-muted/30"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["0.001", "0.01", "0.1"].map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  onClick={() => setBuyAmount(p)}
                  className="rounded-xl h-10 font-bold border-border/50"
                >
                  {p} ETH
                </Button>
              ))}
            </div>
            <div className="glass rounded-2xl p-4 flex items-center justify-between border-border/40">
              <span className="text-xs font-bold text-muted-foreground">Estimated Tokens</span>
              <span className="font-mono font-black text-primary">
                ~{estimatedTokens.toFixed(0)} {coin.symbol}
              </span>
            </div>
            <Button
              onClick={handleBuy}
              disabled={tradingLoading}
              className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
            >
              {tradingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell dialog */}
      <Dialog open={isSellOpen} onOpenChange={setIsSellOpen}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Sell ${coin.symbol}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
                Amount (Tokens)
              </Label>
              <Input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="h-14 rounded-2xl text-xl font-bold bg-muted/30"
              />
            </div>
            <Button
              onClick={handleSell}
              disabled={tradingLoading}
              variant="destructive"
              className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-destructive/20"
            >
              {tradingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="border-border/40 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-lg font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Chart island — recharts is heavy; per AGENTS.md it should load client-only
 * via next/dynamic. Kept minimal for now: renders the current price prominently
 * so the section is never an empty box. A real historical chart would come from
 * a future /api/coins/[address]/chart endpoint.
 */
function CoinChart({ coin }: { coin: VideoCoin }) {
  return (
    <Card className="border-border/40 rounded-3xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Price</h2>
          <Badge
            className={cn(
              "rounded-full border-none font-bold",
              coin.priceChange24h >= 0
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500",
            )}
          >
            {coin.priceChange24h >= 0 ? "+" : ""}
            {coin.priceChange24h.toFixed(1)}%
          </Badge>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black">{parseFloat(coin.price || "0").toFixed(6)}</span>
          <span className="text-sm text-muted-foreground mb-1">ETH</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Live chart coming soon — price updates with each revalidation.
        </p>
      </CardContent>
    </Card>
  );
}

