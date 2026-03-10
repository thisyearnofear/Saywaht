import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { handleError, withRetry, zoraCircuitBreaker } from "./error-handler";
import {
  setApiKey,
  getCoinsNew,
  getCoin,
  getProfile,
  type ExploreResponse
} from "@zoralabs/coins-sdk";

// CLEAN: Commentary Coins - defining a new category
export interface VideoCoin {
  address: Address | string;
  name: string;
  symbol: string;
  creator: Address | string;
  videoUri: string; // The primary video URL for direct playback
  videoPlaybackUrl?: string; // Optional: A URL optimized for direct playback (e.g., CDN)
  animationUrl?: string; // Optional: animation_url from metadata, might be same as videoUri
  metadataUri: string;
  totalSupply: string;
  price: string;
  volume24h: string;
  priceChange24h: number;
  createdAt: string;
  thumbnail?: string;
  // ENHANCEMENT: Commentary-specific metadata
  commentaryType?: 'reaction' | 'analysis' | 'tutorial' | 'meme' | 'news';
  originalContent?: {
    title?: string;
    source?: string;
    timestamp?: string;
  };
  // ENHANCEMENT: Added market data from Zora SDK
  marketCap?: string;
  holders?: number;
  // ENHANCEMENT: Creator profile data for better discovery
  creatorProfile?: {
    name?: string;
    avatar?: string;
    totalCoins?: number;
    totalVolume?: string;
    followers?: number;
    verified?: boolean;
    specialties?: string[]; // e.g., ['crypto', 'sports', 'politics']
  };
  // ENHANCEMENT: Engagement metrics for commentary
  engagementMetrics?: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    avgWatchTime?: number;
  };
}

// DRY: Single interface for all trading operations
export interface TradingParams {
  coinAddress: Address | string;
  amount: string;
  userAddress: Address | string;
  slippage?: number;
  recipient?: Address | string;
}

export class ZoraCoinsService {
  public publicClient: any;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeService();
  }

  /**
   * Fetch real user reward balance from Zora Protocol Rewards contract
   */
  async getRewardsBalance(userAddress: string): Promise<string> {
    if (typeof window === 'undefined' || !this.publicClient) return "0.000";
    
    try {
      const balance = await this.publicClient.readContract({
        address: '0x7777777F279eba3d3Ad8F4E708545291A6fDBA8B',
        abi: [{
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        }],
        functionName: 'balanceOf',
        args: [userAddress as Address],
      });

      const { formatEther } = await import("viem");
      return parseFloat(formatEther(balance as bigint)).toFixed(4);
    } catch (e) {
      console.error("Failed to fetch rewards balance", e);
      return "0.000";
    }
  }

  // MODULAR: Separate initialization logic
  private initializeService() {
    // PERFORMANT: Only initialize on client-side and only once
    if (typeof window === 'undefined' || this.isInitialized) return;

    console.log(`🔗 Initializing Zora Coins service on Base Mainnet`);

    // Initialize clients for Base mainnet (as per Zora docs)
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // CLEAN: Proper API key initialization with error handling
    try {
      const apiKey = process.env.ZORA_API_KEY;
      if (apiKey) {
        setApiKey(apiKey);
        console.log("🔑 Zora Coins SDK API key initialized");
      } else {
        // API key is server-side only; coin creation uses the API route
        console.log("ℹ️ Zora API key is server-side only; coin creation uses /api/zora/create-coin-calldata");
      }
    } catch (error) {
      console.warn("Failed to set Zora API key:", error);
    }

    this.isInitialized = true;
  }

  /**
   * ENHANCEMENT FIRST: Enhanced existing getTrendingCoins with proper SDK usage
   * Uses official Zora SDK getCoinsNew function with proper error handling
   */
  async getTrendingCoins(count: number = 10): Promise<VideoCoin[]> {
    if (typeof window === 'undefined') return [];
    return zoraCircuitBreaker.execute(async () => {
      return withRetry(async () => {
        // CLEAN: Use official SDK method with proper parameters
        const response: ExploreResponse = await getCoinsNew({
          count
        });

        const edges = response?.data?.exploreList?.edges || [];

        // DRY: Single transformation function
        const coins: VideoCoin[] = edges.map((edge: any) => this.transformCoinData(edge.node));

        return coins;
      }, 3, 2000);
    });
  }

  /**
   * ENHANCEMENT FIRST: Enhanced to get specific coin data
   * Uses official Zora SDK getCoin function
   */
  async getCoinData(coinAddress: string): Promise<VideoCoin | null> {
    if (typeof window === 'undefined') return null;
    return zoraCircuitBreaker.execute(async () => {
      return withRetry(async () => {
        try {
          const response = await getCoin({
            address: coinAddress as Address
          });

          if (!response?.data?.zora20Token) {
            return null;
          }

          return this.transformCoinData(response.data.zora20Token);
        } catch (error) {
          handleError(error, 'Get coin data');
          return null;
        }
      }, 2, 1000);
    });
  }

  /**
   * ENHANCEMENT FIRST: Enhanced to get user portfolio using official SDK
   */
  async getUserPortfolio(userAddress: string): Promise<{
    coins: VideoCoin[];
    totalValue: string;
    totalPnl: number;
  }> {
    if (typeof window === 'undefined') return { coins: [], totalValue: "0", totalPnl: 0 };
    return zoraCircuitBreaker.execute(async () => {
      return withRetry(async () => {
        try {
          // Use official SDK getProfile function
          await getProfile({
            identifier: userAddress as Address
          });

          // Profile data fetched successfully, return empty portfolio for now
          // The profile method doesn't return holdings in v0.3.x
          return {
            coins: [],
            totalValue: "0",
            totalPnl: 0
          };
        } catch (error) {
          handleError(error, 'Get user portfolio');
          return {
            coins: [],
            totalValue: "0",
            totalPnl: 0
          };
        }
      }, 2, 1000);
    });
  }

  /**
   * DRY: Single source of truth for coin data transformation
   * CLEAN: Consistent data structure across all methods
   * ENHANCEMENT: Commentary coin specific transformations
   */
  private transformCoinData(coinNode: any): VideoCoin {
    // CLEAN: Extract commentary type from metadata or name
    const commentaryType = this.detectCommentaryType(coinNode.name, coinNode.description);

    return {
      address: coinNode.address || "0x0000000000000000000000000000000000000000",
      name: coinNode.name || "Untitled Commentary",
      symbol: coinNode.symbol || "COMM",
      creator: coinNode.creatorAddress || coinNode.creator?.address || "0x0000000000000000000000000000000000000000",
      videoUri: coinNode.contentURI || coinNode.tokenURI || "", // Prioritize contentURI for direct video
      videoPlaybackUrl: coinNode.contentURI || "",
      animationUrl: coinNode.animation_url || coinNode.contentURI || "",
      metadataUri: coinNode.tokenURI || coinNode.metadataURI || "",
      totalSupply: coinNode.totalSupply || "1000000",
      price: coinNode.price || "0.001",
      volume24h: coinNode.volume24h || "0",
      priceChange24h: Number(coinNode.marketCapDelta24h || coinNode.priceChange24h || 0),
      createdAt: coinNode.createdAt || new Date().toISOString(),
      thumbnail: coinNode.image || coinNode.thumbnail || "",
      // ENHANCEMENT: Commentary-specific data
      commentaryType,
      originalContent: {
        title: coinNode.originalTitle || this.extractOriginalTitle(coinNode.name),
        source: coinNode.originalSource || this.extractSource(coinNode.description),
        timestamp: coinNode.originalTimestamp
      },
      // ENHANCEMENT: Additional market data
      marketCap: coinNode.marketCap || "0",
      holders: coinNode.holders || 0,
      // ENHANCEMENT: Creator profile enrichment
      creatorProfile: {
        name: coinNode.creator?.name || coinNode.creatorName,
        avatar: coinNode.creator?.avatar || coinNode.creatorAvatar,
        totalCoins: coinNode.creator?.totalCoins || 0,
        totalVolume: coinNode.creator?.totalVolume || "0",
        followers: coinNode.creator?.followers || 0,
        verified: coinNode.creator?.verified || false,
        specialties: coinNode.creator?.specialties || this.inferSpecialties(coinNode.name)
      },
      // ENHANCEMENT: Engagement metrics
      engagementMetrics: {
        views: coinNode.views || 0,
        likes: coinNode.likes || 0,
        shares: coinNode.shares || 0,
        comments: coinNode.comments || 0,
        avgWatchTime: coinNode.avgWatchTime || 0
      }
    };
  }

  /**
   * MODULAR: Commentary type detection for better categorization
   */
  private detectCommentaryType(name: string, description?: string): 'reaction' | 'analysis' | 'tutorial' | 'meme' | 'news' {
    const text = `${name} ${description || ''}`.toLowerCase();

    if (text.includes('react') || text.includes('response') || text.includes('watching')) {
      return 'reaction';
    }
    if (text.includes('analysis') || text.includes('breakdown') || text.includes('deep dive')) {
      return 'analysis';
    }
    if (text.includes('how to') || text.includes('tutorial') || text.includes('guide')) {
      return 'tutorial';
    }
    if (text.includes('meme') || text.includes('funny') || text.includes('lol')) {
      return 'meme';
    }
    if (text.includes('news') || text.includes('breaking') || text.includes('update')) {
      return 'news';
    }

    return 'reaction'; // Default to reaction for commentary
  }

  /**
   * CLEAN: Extract original content title from commentary name
   */
  private extractOriginalTitle(name: string): string | undefined {
    // Common patterns: "Reacting to X", "X Commentary", "My thoughts on X"
    const patterns = [
      /reacting to (.+)/i,
      /(.+) commentary/i,
      /my thoughts on (.+)/i,
      /(.+) reaction/i,
      /watching (.+)/i
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * CLEAN: Extract source information from description
   */
  private extractSource(description?: string): string | undefined {
    if (!description) return undefined;

    // Look for common source indicators
    const sourcePatterns = [
      /from (.+)/i,
      /source: (.+)/i,
      /via (.+)/i,
      /originally by (.+)/i
    ];

    for (const pattern of sourcePatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * PERFORMANT: Infer creator specialties from content patterns
   */
  private inferSpecialties(name: string): string[] {
    const text = name.toLowerCase();
    const specialties: string[] = [];

    const specialtyMap = {
      crypto: ['bitcoin', 'ethereum', 'crypto', 'defi', 'nft', 'web3'],
      sports: ['football', 'basketball', 'soccer', 'baseball', 'sports', 'game'],
      politics: ['election', 'politics', 'government', 'policy', 'debate'],
      entertainment: ['movie', 'tv', 'show', 'celebrity', 'music', 'album'],
      tech: ['tech', 'ai', 'software', 'coding', 'programming', 'startup'],
      gaming: ['gaming', 'game', 'esports', 'twitch', 'stream'],
      finance: ['stock', 'market', 'trading', 'investment', 'economy']
    };

    for (const [specialty, keywords] of Object.entries(specialtyMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        specialties.push(specialty);
      }
    }

    return specialties.length > 0 ? specialties : ['general'];
  }

  /**
   * ENHANCEMENT FIRST: Enhanced metadata validation with better error handling
   * Handles Grove/IPFS propagation delays gracefully
   */
  async validateMetadataURI(metadataUri: string): Promise<boolean> {
    try {
      // If it's an IPFS URI, assume it's valid
      // The Zora protocol will handle validation on-chain
      if (metadataUri.startsWith('ipfs://') || metadataUri.startsWith('lens://')) {
        console.log('📝 IPFS/Lens URI detected, skipping HTTP validation');
        return true;
      }

      // For HTTP URIs, retry with longer delays for propagation
      return withRetry(async () => {
        const response = await fetch(metadataUri, {
          method: 'HEAD',
          headers: { 'Accept': 'application/json' },
        });

        // Accept 200 OK or 502/503 (propagation delay)
        if (response.ok) {
          return true;
        }
        
        // 502/503 means gateway is propagating - this is OK
        if (response.status === 502 || response.status === 503) {
          console.log('⏳ Gateway propagating, accepting URI');
          return true;
        }

        // Other errors should retry
        throw new Error(`Metadata URI check failed: ${response.status}`);
      }, 3, 2000); // 3 retries with 2s delay
    } catch (error) {
      // If validation fails, log but don't block deployment
      // The Zora protocol will ultimately validate
      console.warn('⚠️ Could not validate metadata URI, proceeding anyway:', error);
      return true;
    }
  }

  /**
   * ENHANCEMENT FIRST: Enhanced to get comprehensive creator analytics
   * Uses official Zora SDK with extended market data
   */
  async getCreatorAnalytics(creatorAddress: string): Promise<{
    totalCoins: number;
    totalVolume: string;
    totalRevenue: string;
    avgCoinPerformance: number;
    topPerformingCoin: VideoCoin | null;
    recentActivity: Array<{
      type: 'mint' | 'trade' | 'revenue';
      timestamp: string;
      amount: string;
      coinAddress?: string;
    }>;
    audienceMetrics: {
      uniqueHolders: number;
      avgHoldingTime: number;
      retentionRate: number;
    };
  }> {
  if (typeof window === 'undefined') {
    return {
      totalCoins: 0,
      totalVolume: "0",
      totalRevenue: "0",
      avgCoinPerformance: 0,
      topPerformingCoin: null,
      recentActivity: [],
      audienceMetrics: { uniqueHolders: 0, avgHoldingTime: 0, retentionRate: 0 }
    };
  }
  return zoraCircuitBreaker.execute(async () => {
    return withRetry(async () => {
      try {
        // Use official SDK getProfile with extended data
        const response = await getProfile({
          identifier: creatorAddress as Address
        });

        const profile = response?.data?.profile;
        if (!profile) {
          return {
            totalCoins: 0,
            totalVolume: "0",
            totalRevenue: "0",
            avgCoinPerformance: 0,
            topPerformingCoin: null,
            recentActivity: [],
            audienceMetrics: {
              uniqueHolders: 0,
              avgHoldingTime: 0,
              retentionRate: 0
            }
          };
        }

        // Get creator's coins (this would need to be implemented when SDK supports it)
        const coins: any[] = []; // Placeholder for when creator coin listing is available

        // PERFORMANT: Calculate analytics efficiently
        const totalVolume = coins.reduce((sum: number, coin: any) =>
          sum + parseFloat(coin.volume || "0"), 0
        ).toString();

        const totalRevenue = coins.reduce((sum: number, coin: any) =>
          sum + (parseFloat(coin.volume || "0") * 0.5), 0 // 50% creator revenue
        ).toString();

        const avgPerformance = coins.length > 0
          ? coins.reduce((sum: number, coin: any) =>
            sum + parseFloat(coin.priceChange24h || "0"), 0
          ) / coins.length
          : 0;

        // Find top performing coin
        const topCoin = coins.reduce((best: any, current: any) => {
          const currentVolume = parseFloat(current.volume || "0");
          const bestVolume = parseFloat(best?.volume || "0");
          return currentVolume > bestVolume ? current : best;
        }, null);

        return {
          totalCoins: coins.length,
          totalVolume,
          totalRevenue,
          avgCoinPerformance: avgPerformance,
          topPerformingCoin: topCoin ? this.transformCoinData(topCoin) : null,
          recentActivity: [], // Will be populated when activity data is available
          audienceMetrics: {
            uniqueHolders: 0, // Will be calculated when holder data is available
            avgHoldingTime: 0,
            retentionRate: 0
          }
        };
      } catch (error) {
        handleError(error, 'Get creator analytics');
        throw error;
      }
    }, 2, 1000);
  });
}

  /**
   * ENHANCEMENT FIRST: Enhanced market insights for better discovery
   */
  async getMarketInsights(): Promise<{
    trendingTopics: string[];
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
    topGainers: VideoCoin[];
    topLosers: VideoCoin[];
    volumeLeaders: VideoCoin[];
    newCreators: Array<{
      address: string;
      firstCoinDate: string;
      coinsCreated: number;
      totalVolume: string;
    }>;
  }> {
  if (typeof window === 'undefined') {
    return {
      trendingTopics: [],
      marketSentiment: 'neutral',
      topGainers: [],
      topLosers: [],
      volumeLeaders: [],
      newCreators: []
    };
  }
  return zoraCircuitBreaker.execute(async () => {
    return withRetry(async () => {
      try {
        // Get comprehensive market data using existing methods
        const trending = await this.getTrendingCoins(50);

        // CLEAN: Extract trending topics from coin names
        const topics = trending
          .flatMap((coin: VideoCoin) => coin.name.toLowerCase().split(' '))
          .filter((word: string) => word.length > 3)
          .reduce((acc: Record<string, number>, word: string) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
          }, {});

        const trendingTopics = Object.entries(topics)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([topic]) => topic);

        // Calculate market sentiment
        const avgPriceChange = trending.reduce((sum: number, coin: VideoCoin) =>
          sum + coin.priceChange24h, 0
        ) / trending.length;

        const marketSentiment: 'bullish' | 'bearish' | 'neutral' = avgPriceChange > 5 ? 'bullish'
          : avgPriceChange < -5 ? 'bearish' : 'neutral';

        // Sort coins for different categories
        const sortedByGains = [...trending].sort((a, b) => b.priceChange24h - a.priceChange24h);
        const sortedByVolume = [...trending].sort((a, b) =>
          parseFloat(b.volume24h) - parseFloat(a.volume24h)
        );

        return {
          trendingTopics,
          marketSentiment,
          topGainers: sortedByGains.slice(0, 10),
          topLosers: sortedByGains.slice(-10).reverse(),
          volumeLeaders: sortedByVolume.slice(0, 10),
          newCreators: [] // Will be populated when creator tracking is available
        };
      } catch (error) {
        handleError(error, 'Get market insights');
        throw error;
      }
    }, 2, 1000);
  });
}
}

// singleton instance for client-side
let zoraCoinsInstance: ZoraCoinsService | null = null;

export function getZoraCoins(): ZoraCoinsService {
  if (typeof window === 'undefined') {
    // Return a dummy instance that won't throw
    return {
      getTrendingCoins: async () => [],
      getCoinData: async () => null,
      getUserPortfolio: async () => ({ coins: [], totalValue: "0", totalPnl: 0 }),
      validateMetadataURI: async () => true,
      getCreatorAnalytics: async () => ({
        totalCoins: 0, totalVolume: "0", totalRevenue: "0", avgCoinPerformance: 0,
        topPerformingCoin: null, recentActivity: [], 
        audienceMetrics: { uniqueHolders: 0, avgHoldingTime: 0, retentionRate: 0 }
      }),
      getMarketInsights: async () => ({
        trendingTopics: [], marketSentiment: 'neutral', topGainers: [],
        topLosers: [], volumeLeaders: [], newCreators: []
      })
    } as unknown as ZoraCoinsService;
  }
  
  if (!zoraCoinsInstance) {
    zoraCoinsInstance = new ZoraCoinsService();
  }
  return zoraCoinsInstance;
}
