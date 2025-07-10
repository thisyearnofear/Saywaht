import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import {
  getCoinsNew,
  getCoinsLastTraded,
  getCoinsMostValuable,
  setApiKey,
} from "@zoralabs/coins-sdk";

// Zora Coins SDK types
export interface VideoCoin {
  address: Address | string;
  name: string;
  symbol: string;
  creator: Address | string;
  videoUri: string;
  metadataUri: string;
  totalSupply: string;
  price: string;
  volume24h: string;
  priceChange24h: number;
  createdAt: string;
  thumbnail?: string;
}

export interface TradingParams {
  coinAddress: Address | string;
  amount: string;
  userAddress: Address | string;
  slippage?: number;
  recipient?: Address | string;
}

export class ZoraCoinsService {
  private publicClient: any;

  constructor() {
    // Always use Base Mainnet for Zora Coins
    console.log(`🔗 Initializing Zora Coins service on Base Mainnet`);

    // Initialize clients
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Set up Zora API key if available
    if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
      console.log("🔑 Setting Zora API Key");
      setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
    } else {
      console.warn("⚠️ NEXT_PUBLIC_ZORA_API_KEY not set - you may hit rate limits");
    }
  }


  /**
   * Get trending video coins using real Zora API
   */
  async getTrendingCoins(): Promise<VideoCoin[]> {
    try {
      console.log("📈 Fetching trending coins from Zora...");

      // Fetch latest coins from Zora
      const [newCoins, tradedCoins, valuableCoins] = await Promise.allSettled([
        getCoinsNew({ count: 10 }),
        getCoinsLastTraded({ count: 10 }),
        getCoinsMostValuable({ count: 10 })
      ]);

      const allCoins: VideoCoin[] = [];

      // Process new coins
      if (newCoins.status === 'fulfilled' && newCoins.value?.data?.exploreList?.edges && Array.isArray(newCoins.value.data.exploreList.edges)) {
        for (const edge of newCoins.value.data.exploreList.edges) {
          const coin = edge?.node;
          if (coin) {
            // Type assertion and safe access for Zora API response
            const coinData = coin as any; // Type assertion since API shape may vary
            
            allCoins.push({
              address: coinData.address || `0x${Math.random().toString(16).slice(2, 42)}`,
              name: coinData.name || "Untitled Coin",
              symbol: coinData.symbol || "COIN",
              creator: coinData.creatorAddress || "0x0000000000000000000000000000000000000000",
              videoUri: coinData.tokenURI || "",
              metadataUri: coinData.tokenURI || "",
              totalSupply: coinData.totalSupply || "1000000",
              price: "0.001", // Default price - would need market data
              volume24h: coinData.volume24h || "0", // Would need trading data
              priceChange24h: 0,
              createdAt: coinData.createdAt || new Date().toISOString(),
              thumbnail: coinData.image || "",
            });
          }
        }
      }

      // Process traded coins
      if (tradedCoins.status === 'fulfilled' && tradedCoins.value?.data?.exploreList?.edges && Array.isArray(tradedCoins.value.data.exploreList.edges)) {
        for (const edge of tradedCoins.value.data.exploreList.edges) {
          const coin = edge?.node;
          if (coin && !allCoins.find(c => c.address === coin.address)) {
            const coinData = coin as any;
            allCoins.push({
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
            });
          }
        }
      }

      // Process valuable coins
      if (valuableCoins.status === 'fulfilled' && valuableCoins.value?.data?.exploreList?.edges && Array.isArray(valuableCoins.value.data.exploreList.edges)) {
        for (const edge of valuableCoins.value.data.exploreList.edges) {
          const coin = edge?.node;
          if (coin && !allCoins.find(c => c.address === coin.address)) {
            const coinData = coin as any;
            allCoins.push({
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
            });
          }
        }
      }

      console.log("✅ Real trending coins fetched:", Array.isArray(allCoins) ? allCoins.length : 0);
      // Make sure allCoins is an array before using slice
      return Array.isArray(allCoins) ? allCoins.slice(0, 10) : [];
    } catch (error) {
      console.error("❌ Failed to fetch trending coins:", error);
      throw new Error(`Failed to fetch trending coins from Zora API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's coin portfolio
   */
  async getUserPortfolio(userAddress: string): Promise<{
    coins: VideoCoin[];
    totalValue: string;
    totalPnl: number;
  }> {
    try {
      console.log("👤 Fetching user portfolio for:", userAddress);

      // TODO: Implement actual portfolio fetching from Zora API
      throw new Error("Portfolio fetching not yet implemented - requires Zora portfolio API integration");
    } catch (error) {
      console.error("❌ Failed to fetch portfolio:", error);
      throw new Error(`Failed to fetch portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

// Export singleton instance
export const zoraCoins = new ZoraCoinsService();
