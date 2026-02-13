"use client";

import { TradingFeed } from "@/components/trading/trading-feed";
import { WalletGuard } from "@/components/wallet-guard";
import { Header } from "@/components/header";

export default function TradePage() {
  return (
    <WalletGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <TradingFeed />
      </div>
    </WalletGuard>
  );
}
