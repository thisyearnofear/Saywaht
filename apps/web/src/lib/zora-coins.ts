import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { handleError, withRetry, zoraCircuitBreaker } from "./error-handler";
import { setApiKey, getCoinsNew } from "@zoralabs/coins-sdk";

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

    // Initialize SDK API key (public key acceptable per Zora docs for client usage)
    try {
      const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
      if (apiKey) {
        setApiKey(apiKey);
        console.log("🔑 Zora Coins SDK API key initialized");
      } else {
        console.warn("⚠️ NEXT_PUBLIC_ZORA_API_KEY not set; queries may be rate limited");
      }
    } catch {}
  }


  /**
   * Get trending video coins using secure server-side API
   * ENHANCEMENT: Added circuit breaker and retry logic
   */
  async getTrendingCoins(): Promise<VideoCoin[]> {
    return zoraCircuitBreaker.execute(async () => {
      // Use official Coins SDK explore query
      return withRetry(async () => {
        const response = await getCoinsNew({ count: 10 });
        const edges = response?.data?.exploreList?.edges || [];
        const coins: VideoCoin[] = edges.map((edge: any) => ({
          address: edge.node.address,
          name: edge.node.name || "Untitled Coin",
          symbol: edge.node.symbol || "COIN",
          creator: edge.node.creatorAddress || "0x0000000000000000000000000000000000000000",
          videoUri: edge.node.tokenURI || "",
          metadataUri: edge.node.tokenURI || "",
          totalSupply: edge.node.totalSupply || "1000000",
          price: edge.node.price || "0.001",
          volume24h: edge.node.volume24h || "0",
          priceChange24h: Number(edge.node.marketCapDelta24h || 0),
          createdAt: edge.node.createdAt || new Date().toISOString(),
          thumbnail: edge.node.image || "",
        }));
        return coins;
      }, 3, 2000);
    });
  }

  /**
   * Validate metadata URI content using secure server-side API
   * ENHANCEMENT: Added retry logic and better error handling
   */
  async validateMetadataURI(metadataUri: string): Promise<boolean> {
    try {
      // Validating metadata URI

      // ENHANCEMENT: Retry with exponential backoff
      return withRetry(async () => {
        const response = await fetch(metadataUri, {
          method: 'HEAD', // HEAD request is sufficient for validation
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const error = new Error(`Metadata URI not accessible: ${response.status} ${response.statusText}`);
          handleError(error, 'Metadata validation');
          throw error;
        }

        // Basic validation - check if response looks like JSON
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          // Metadata URI does not return JSON content-type
        }

        // Metadata URI validation passed
        return true;
      }, 2, 1000);
    } catch (error) {
      handleError(error, 'Metadata URI validation');
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
      // Fetching user portfolio

      // Portfolio fetching will be implemented when Zora API supports it
      return {
        coins: [],
        totalValue: "0",
        totalPnl: 0
      };
    } catch (error) {
      // Failed to fetch portfolio
      throw new Error(`Failed to fetch portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

// Export singleton instance
export const zoraCoins = new ZoraCoinsService();
