"use client";

import { TradingFeed } from "@/components/trading/trading-feed";
import { WalletGuard } from "@/components/wallet-guard";

export default function TradePage() {
  return (
    <WalletGuard>
      <div className="min-h-screen bg-background">
        <TradingFeed />
      </div>
    </WalletGuard>
  );
}
