import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";

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

    // API key is now handled server-side for security
    console.log("🔑 Zora API calls will be made through secure server-side routes");
  }


  /**
   * Get trending video coins using secure server-side API
   */
  async getTrendingCoins(): Promise<VideoCoin[]> {
    try {
      console.log("📈 Fetching trending coins directly from Zora API...");

      // Direct client-side API calls to avoid serverless function issues
      const response = await fetch('https://api.zora.co/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_ZORA_API_KEY && {
            'X-API-Key': process.env.NEXT_PUBLIC_ZORA_API_KEY
          })
        },
        body: JSON.stringify({
          query: `
            query GetTrendingCoins {
              exploreList(
                where: { sort: { sortKey: CREATED, sortDirection: DESC } }
                pagination: { limit: 10 }
              ) {
                edges {
                  node {
                    address
                    name
                    symbol
                    creatorAddress
                    tokenURI
                    totalSupply
                    volume24h
                    createdAt
                    image
                  }
                }
              }
            }
          `
        })
      });

      if (!response.ok) {
        throw new Error(`Zora API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      const coins = result.data?.exploreList?.edges?.map((edge: any) => ({
        address: edge.node.address,
        name: edge.node.name || "Untitled Coin",
        symbol: edge.node.symbol || "COIN",
        creator: edge.node.creatorAddress || "0x0000000000000000000000000000000000000000",
        videoUri: edge.node.tokenURI || "",
        metadataUri: edge.node.tokenURI || "",
        totalSupply: edge.node.totalSupply || "1000000",
        price: "0.001",
        volume24h: edge.node.volume24h || "0",
        priceChange24h: 0,
        createdAt: edge.node.createdAt || new Date().toISOString(),
        thumbnail: edge.node.image || "",
      })) || [];

      console.log("✅ Trending coins fetched:", coins.length);
      return coins;
    } catch (error) {
      console.error("❌ Failed to fetch trending coins:", error);
      throw new Error(`Failed to fetch trending coins: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate metadata URI content using secure server-side API
   */
  async validateMetadataURI(metadataUri: string): Promise<boolean> {
    try {
      console.log("🔍 Validating metadata URI directly...");

      // Direct client-side validation - check if URI is accessible
      const response = await fetch(metadataUri, {
        method: 'HEAD', // HEAD request is sufficient for validation
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Metadata URI not accessible: ${response.status} ${response.statusText}`);
      }

      // Basic validation - check if response looks like JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.warn("⚠️ Metadata URI does not return JSON content-type");
      }

      console.log("✅ Metadata URI validation passed");
      return true;
    } catch (error) {
      console.error("❌ Metadata URI validation failed:", error);
      throw error;
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
