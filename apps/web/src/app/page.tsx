import { HeroClient } from "@/components/landing/hero-client";
import { Features } from "@/components/landing/features";
import { DiscoveryFeedServer } from "@/components/landing/discovery-feed-server";
import { Header } from "@/components/header";

// Fetch trending coins on the server for SSR/SSG
async function getTrendingCoins() {
  try {
    const { fetchPlatformCoins } = await import("@/lib/coins-cache");
    const { getZoraCoins } = await import("@/lib/zora-coins");
    
    const platformCoins = await fetchPlatformCoins();
    const zoraService = getZoraCoins();
    
    // Enrich with live Zora data
    const enriched = await Promise.all(
      platformCoins.slice(0, 6).map(async (pc) => {
        try {
          const liveData = await zoraService.getCoinData(pc.address);
          if (liveData) return liveData;
        } catch { }
        return {
          address: pc.address,
          name: pc.name,
          symbol: pc.symbol,
          creator: pc.creatorAddress,
          videoUri: "",
          metadataUri: pc.metadataUri || "",
          totalSupply: "0",
          price: "0",
          volume24h: "0",
          priceChange24h: 0,
          createdAt: pc.createdAt,
          thumbnail: pc.thumbnailUrl || "",
        };
      })
    );
    
    return enriched;
  } catch (error) {
    console.error("Failed to fetch trending coins:", error);
    return [];
  }
}

export default async function Home() {
  // Server-side data fetching
  const trendingCoins = await getTrendingCoins();

  return (
    <div>
      <Header />
      <HeroClient />
      <Features />
      <DiscoveryFeedServer initialCoins={trendingCoins} />
    </div>
  );
}
