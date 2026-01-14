"use client";

export const dynamic = "force-dynamic";

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
