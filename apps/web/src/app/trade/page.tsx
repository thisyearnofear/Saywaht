import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const TradeClient = nextDynamic(() => import("./trade-client"), {
  ssr: false,
});

export default function TradePage() {
  return <TradeClient />;
}
