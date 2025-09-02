import { ApiKeyManager } from "./middleware";

// Type definition for ValidMetadataURI
type ValidMetadataURI = string;

// Dynamic imports to avoid SSR issues with Zora SDK
let zoraSdk: any = null;

async function getZoraSdk() {
  if (!zoraSdk && typeof window === 'undefined') {
    try {
      const sdk = await import("@zoralabs/coins-sdk");
      zoraSdk = sdk;
    } catch (error) {
      console.error("Failed to load Zora SDK:", error);
      throw error;
    }
  }
  return zoraSdk;
}

export interface ZoraCoin {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  videoUri: string;
  metadataUri: string;
  totalSupply: string;
  price: string;
  volume24h: string;
  priceChange24h: number;
  createdAt: string;
  thumbnail?: string;
}

export class ZoraApiService {
  constructor() {
    // Ensure API key is set
    ApiKeyManager.setZoraKey();
  }

  async getTrendingCoins(): Promise<ZoraCoin[]> {
    console.log("📈 Fetching trending coins from Zora...");

    // Get the Zora SDK dynamically
    const sdk = await getZoraSdk();
    if (!sdk) {
      throw new Error("Failed to load Zora SDK");
    }

    const { getCoinsNew, getCoinsLastTraded, getCoinsMostValuable } = sdk;

    // Fetch latest coins from Zora in parallel
    const [newCoins, tradedCoins, valuableCoins] = await Promise.allSettled([
      getCoinsNew({ count: 10 }),
      getCoinsLastTraded({ count: 10 }),
      getCoinsMostValuable({ count: 10 })
    ]);

    console.log("🔍 API call results:");
    console.log("- New coins result:", newCoins.status, newCoins.status === 'fulfilled' ? newCoins.value?.data?.exploreList?.edges?.length || 0 : newCoins.reason);
    console.log("- Traded coins result:", tradedCoins.status, tradedCoins.status === 'fulfilled' ? tradedCoins.value?.data?.exploreList?.edges?.length || 0 : tradedCoins.reason);
    console.log("- Valuable coins result:", valuableCoins.status, valuableCoins.status === 'fulfilled' ? valuableCoins.value?.data?.exploreList?.edges?.length || 0 : valuableCoins.reason);

    const allCoins: ZoraCoin[] = [];

    // Process results with unified logic
    this.processCoinsResult(newCoins, allCoins);
    this.processCoinsResult(tradedCoins, allCoins);
    this.processCoinsResult(valuableCoins, allCoins);

    console.log("✅ Trending coins fetched:", allCoins.length);
    console.log("📋 Coin addresses:", allCoins.map(c => c.address));
    return allCoins.slice(0, 10); // Return top 10
  }

  async validateMetadata(metadataUri: string): Promise<void> {
    console.log("🔍 Validating metadata URI content...");

    // Get the Zora SDK dynamically
    const sdk = await getZoraSdk();
    if (!sdk) {
      throw new Error("Failed to load Zora SDK");
    }

    const { validateMetadataURIContent } = sdk;
    await validateMetadataURIContent(metadataUri as ValidMetadataURI);
    console.log("✅ Metadata validation passed");
  }

  private processCoinsResult(
    result: PromiseSettledResult<any>,
    allCoins: ZoraCoin[]
  ): void {
    if (
      result.status === 'fulfilled' &&
      result.value?.data?.exploreList?.edges &&
      Array.isArray(result.value.data.exploreList.edges)
    ) {
      for (const edge of result.value.data.exploreList.edges) {
        const coin = edge?.node;
        if (coin && !allCoins.find(c => c.address === coin.address)) {
          allCoins.push(this.transformCoinData(coin));
        }
      }
    }
  }

  private transformCoinData(coinData: any): ZoraCoin {
    return {
      address: coinData.address || `0x${Math.random().toString(16).slice(2, 42)}`,
      name: coinData.name || "Untitled Coin",
      symbol: coinData.symbol || "COIN",
      creator: coinData.creatorAddress || "0x0000000000000000000000000000000000000000",
      videoUri: coinData.tokenURI || "",
      metadataUri: coinData.tokenURI || "",
      totalSupply: coinData.totalSupply || "1000000",
      price: "0.001",
      volume24h: coinData.volume24h || "0",
      priceChange24h: 0,
      createdAt: coinData.createdAt || new Date().toISOString(),
      thumbnail: coinData.image || "",
    };
  }
}

// Singleton instance
export const zoraApiService = new ZoraApiService();
