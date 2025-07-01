import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { 
  getCoinsNew, 
  getCoinsLastTraded, 
  getCoinsMostValuable,
  setApiKey 
} from "@zoralabs/coins-sdk";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Set up Zora API key if available
if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
  setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
} else {
  console.warn("NEXT_PUBLIC_ZORA_API_KEY not set - you may hit rate limits. Get your API key at https://zora.co/settings/developer");
}

export interface Commentary {
  id: string;
  name: string;
  symbol: string;
  videoUrl?: string;
  creatorAddress: string;
  marketCap?: string;
  volume24h?: string;
  createdAt?: string;
  description?: string;
  address?: string;
}

// Fetch the latest coins (commentaries) from Zora
export async function getLatestCommentaries(limit: number = 10): Promise<Commentary[]> {
  try {
    const response = await getCoinsNew({
      count: limit,
    });

    if (!response.data?.exploreList?.edges) {
      console.warn("No coins found in Zora response");
      return [];
    }

    return response.data.exploreList.edges.map((edge: any) => ({
      id: edge.node.id || edge.node.address,
      name: edge.node.name || "Untitled Commentary",
      symbol: edge.node.symbol || "UNTITLED",
      creatorAddress: edge.node.creatorAddress || "0x",
      marketCap: edge.node.marketCap,
      volume24h: edge.node.volume24h,
      createdAt: edge.node.createdAt,
      description: edge.node.description,
      address: edge.node.address,
      // TODO: Extract video URL from metadata - should be FilCDN URL for fast retrieval
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // Placeholder until we parse IPFS metadata
    }));
  } catch (error) {
    console.error("Error fetching coins from Zora:", error);
    
    // Return fallback data if API fails
    return [
      {
        id: "fallback-1",
        name: "Sample Commentary",
        symbol: "SAMPLE",
        creatorAddress: "0x000...",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      },
    ];
  }
}

// Fetch trending coins with high volume
export async function getTrendingCommentaries(limit: number = 10): Promise<Commentary[]> {
  try {
    const response = await getCoinsLastTraded({
      count: limit,
    });

    if (!response.data?.exploreList?.edges) {
      return [];
    }

    return response.data.exploreList.edges.map((edge: any) => ({
      id: edge.node.id || edge.node.address,
      name: edge.node.name || "Untitled Commentary",
      symbol: edge.node.symbol || "UNTITLED",
      creatorAddress: edge.node.creatorAddress || "0x",
      marketCap: edge.node.marketCap,
      volume24h: edge.node.volume24h,
      createdAt: edge.node.createdAt,
      description: edge.node.description,
      address: edge.node.address,
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // Placeholder
    }));
  } catch (error) {
    console.error("Error fetching trending coins:", error);
    return [];
  }
}

// Fetch most valuable coins
export async function getTopCommentaries(limit: number = 10): Promise<Commentary[]> {
  try {
    const response = await getCoinsMostValuable({
      count: limit,
    });

    if (!response.data?.exploreList?.edges) {
      return [];
    }

    return response.data.exploreList.edges.map((edge: any) => ({
      id: edge.node.id || edge.node.address,
      name: edge.node.name || "Untitled Commentary",
      symbol: edge.node.symbol || "UNTITLED",
      creatorAddress: edge.node.creatorAddress || "0x",
      marketCap: edge.node.marketCap,
      volume24h: edge.node.volume24h,
      createdAt: edge.node.createdAt,
      description: edge.node.description,
      address: edge.node.address,
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // Placeholder
    }));
  } catch (error) {
    console.error("Error fetching top coins:", error);
    return [];
  }
}