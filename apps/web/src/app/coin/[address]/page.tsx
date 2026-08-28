import { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { Header } from "@/components/header";
import { CoinPageClient } from "./coin-page-client";
import { getCoinForPage } from "@/lib/coin-page";

// ISR: revalidate every 60s — mirrors the templates pattern (app/templates/[id]/page.tsx).
export const revalidate = 60;

type Params = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { address } = await params;
  if (!isAddress(address)) return { title: "Coin not found" };

  try {
    const coin = await getCoinForPage(address);
    if (!coin) return { title: "Coin not found" };

    const title = `${coin.name} (${coin.symbol}) — saywaht`;
    const description = `Trade ${coin.name} ($${coin.symbol}) — a commentary coin on Base. Price, volume, chart, and buy/sell.`;
    const ogImage = coin.thumbnail || undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return { title: "Coin not found" };
  }
}

export default async function CoinPage({ params }: Params) {
  const { address } = await params;

  // Invalid address → 404. No wallet gate on the page itself (per product
  // decision: the page is fully viewable; the wallet wall appears only on
  // Buy/Sell click, handled in the client island).
  if (!isAddress(address)) {
    notFound();
  }

  const coin = await getCoinForPage(address);
  if (!coin) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 container max-w-5xl mx-auto py-4 md:py-8 px-4">
        <CoinPageClient coin={coin} />
      </div>
    </div>
  );
}
