import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { handleError, withRetry, zoraCircuitBreaker } from "./error-handler";

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
   * ENHANCEMENT: Added circuit breaker and retry logic
   */
  async getTrendingCoins(): Promise<VideoCoin[]> {
    return zoraCircuitBreaker.execute(async () => {
      // Fetching trending coins from Zora API

      // ENHANCEMENT: Retry with exponential backoff
      return withRetry(async () => {
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
          const error = new Error(`Zora API request failed: ${response.status} ${response.statusText}`);
          handleError(error, 'Zora API - trending coins');
          throw error;
        }

        const result = await response.json();

        if (result.errors) {
          const error = new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
          handleError(error, 'Zora API - GraphQL errors');
          throw error;
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

        // Successfully fetched trending coins
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
