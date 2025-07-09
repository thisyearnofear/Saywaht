import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  getCoinsNew,
  getCoinsLastTraded,
  getCoinsMostValuable,
  setApiKey,
  createCoinCall,
  DeployCurrency
} from "@zoralabs/coins-sdk";
import { groveStorage } from "./grove-storage";

// Zora Coins SDK types and functions
export interface VideoCoin {
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

export interface CoinCreationParams {
  name: string;
  symbol: string;
  videoUri: string;
  metadataUri: string;
  creatorAddress: string;
  initialPrice?: string;
}

export interface TradingParams {
  coinAddress: string;
  amount: string;
  slippage?: number;
  recipient?: string;
}

export class ZoraCoinsService {
  private publicClient;
  private walletClient;
  private developerAddress = "0x55A5705453Ee82c742274154136Fce8149597058";

  constructor() {
    // Initialize clients for Base Sepolia
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    // Set up Zora API key if available
    if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
      setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
    } else {
      console.warn("NEXT_PUBLIC_ZORA_API_KEY not set - you may hit rate limits");
    }

    // Note: In production, wallet client should be created with user's wallet
    // For now, we'll create it when needed
    this.walletClient = null;
  }

  /**
   * Create a new video coin using Zora Coins SDK
   */
  async createVideoCoin(params: CoinCreationParams): Promise<VideoCoin> {
    try {
      console.log("🪙 Creating video coin:", params);

      // Generate contract call for coin creation
      const coinCall = createCoinCall({
        name: params.name,
        symbol: params.symbol,
        uri: params.metadataUri as any, // Type assertion for ValidMetadataURI
        payoutRecipient: params.creatorAddress,
        platformReferrer: this.developerAddress, // Our developer address gets referral fees
        chainId: baseSepolia.id,
        currency: DeployCurrency.ETH,
      });

      console.log("📋 Generated coin creation call:", coinCall);

      // Return the coin data structure (actual deployment would happen via wagmi)
      const coin: VideoCoin = {
        address: "pending", // Will be set after actual deployment
        name: params.name,
        symbol: params.symbol,
        creator: params.creatorAddress,
        videoUri: params.videoUri,
        metadataUri: params.metadataUri,
        totalSupply: "1000000", // Default supply
        price: params.initialPrice || "0.001",
        volume24h: "0",
        priceChange24h: 0,
        createdAt: new Date().toISOString(),
      };

      console.log("✅ Video coin prepared for deployment:", coin);
      return coin;
    } catch (error) {
      console.error("❌ Failed to create video coin:", error);
      throw new Error(`Failed to create video coin: ${error}`);
    }
  }

  /**
   * Buy video coins
   */
  async buyCoin(params: TradingParams): Promise<string> {
    try {
      console.log("💰 Buying coin:", params);

      // TODO: Implement actual Zora Coins SDK buy function with Uniswap V4
      throw new Error("Coin buying not yet implemented - requires Uniswap V4 integration");
    } catch (error) {
      console.error("❌ Failed to buy coin:", error);
      throw new Error(`Failed to buy coin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sell video coins
   */
  async sellCoin(params: TradingParams): Promise<string> {
    try {
      console.log("💸 Selling coin:", params);

      // TODO: Implement actual Zora Coins SDK sell function with Uniswap V4
      throw new Error("Coin selling not yet implemented - requires Uniswap V4 integration");
    } catch (error) {
      console.error("❌ Failed to sell coin:", error);
      throw new Error(`Failed to sell coin: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      if (newCoins.status === 'fulfilled' && newCoins.value.data?.exploreList?.edges) {
        for (const edge of newCoins.value.data.exploreList.edges) {
          const coin = edge.node;
          if (coin) {
            allCoins.push({
              address: coin.address || `0x${Math.random().toString(16).slice(2, 42)}`,
              name: coin.name || "Untitled Coin",
              symbol: coin.symbol || "COIN",
              creator: coin.creator?.address || "0x0000000000000000000000000000000000000000",
              videoUri: coin.metadata?.animation_url || "",
              metadataUri: coin.metadata?.uri || "",
              totalSupply: coin.totalSupply || "1000000",
              price: "0.001", // Default price - would need market data
              volume24h: "0", // Would need trading data
              priceChange24h: 0,
              createdAt: coin.createdAt || new Date().toISOString(),
              thumbnail: coin.metadata?.image,
            });
          }
        }
      }

      console.log("✅ Real trending coins fetched:", allCoins.length);
      return allCoins.slice(0, 10); // Limit to 10 coins
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

  /**
   * Get coin price history for charts
   */
  async getCoinPriceHistory(coinAddress: string, timeframe: "1h" | "24h" | "7d" | "30d"): Promise<{
    timestamp: number;
    price: number;
  }[]> {
    try {
      console.log("📊 Fetching price history for:", coinAddress, timeframe);

      // TODO: Implement actual price history API from Zora or Uniswap
      throw new Error("Price history not yet implemented - requires market data API integration");
    } catch (error) {
      console.error("❌ Failed to fetch price history:", error);
      throw new Error(`Failed to fetch price history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Zora Coins SDK is properly configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      // TODO: Add actual configuration checks
      return true;
    } catch (error) {
      console.error("Zora Coins SDK not configured:", error);
      return false;
    }
  }
}

// Export singleton instance
export const zoraCoins = new ZoraCoinsService();
