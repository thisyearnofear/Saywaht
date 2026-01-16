"use client";

import nextDynamic from "next/dynamic";

const TradeClient = nextDynamic(() => import("./trade-client"), {
  ssr: false,
});

export default function TradePage() {
  return <TradeClient />;
}
