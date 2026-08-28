"use client";

import { TradingFeed } from "@/components/trading/trading-feed";
import { Header } from "@/components/header";

/**
 * Trade page — browse-only, no wallet gate.
 *
 * Previously this was wrapped in <WalletGuard>, a full-screen wall that
 * bounced unconnected visitors. But /trade is a browse view (feed of coins),
 * not a trading surface — trading happens on /coin/[address] where the wallet
 * wall fires only on Buy/Sell click (per the product decision). Removing the
 * gate means a visitor who follows a feed card link can actually see coins
 * without connecting first.
 */
export default function TradePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TradingFeed />
    </div>
  );
}
