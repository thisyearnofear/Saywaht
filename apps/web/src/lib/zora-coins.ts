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
      console.log("📈 Fetching trending coins via server-side API...");

      const response = await fetch('/api/zora/coins/trending');

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trending coins');
      }

      console.log("✅ Trending coins fetched:", data.data?.length || 0);
      return data.data || [];
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
      console.log("🔍 Validating metadata URI via server-side API...");

      const response = await fetch('/api/zora/validate-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadataUri }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Metadata validation failed');
      }

      const data = await response.json();
      console.log("✅ Metadata validation passed");
      return data.success;
    } catch (error) {
      console.error("❌ Metadata validation failed:", error);
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
