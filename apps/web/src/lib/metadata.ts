import { MediaItem } from "@/stores/media-store";
import { TimelineTrack } from "@/stores/timeline-store";

export interface CoinMetadata {
  name: string;
  description: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface GenerateMetadataParams {
  coinName: string;
  coinSymbol: string;
  creatorAddress: string;
  mediaItems: MediaItem[];
  tracks: TimelineTrack[];
  projectId: string;
}

/**
 * Generate metadata for a coin based on project content
 */
export function generateCoinMetadata(params: GenerateMetadataParams): CoinMetadata {
  const {
    coinName,
    coinSymbol,
    creatorAddress,
    mediaItems,
    tracks,
    projectId
  } = params;

  // Find the primary video/media content (first FilCDN item or first video)
  const primaryMedia = mediaItems.find(item => item.isFilCDN && item.type === 'video') ||
                      mediaItems.find(item => item.type === 'video') ||
                      mediaItems.find(item => item.isFilCDN) ||
                      mediaItems[0];

  // Count FilCDN vs local content
  const filcdnItems = mediaItems.filter(item => item.isFilCDN);
  const localItems = mediaItems.filter(item => !item.isFilCDN);

  // Calculate total project duration
  const totalDuration = Math.max(
    ...tracks.flatMap(track => 
      track.clips.map(clip => clip.startTime + clip.duration)
    ),
    0
  );

  // Build attributes based on project content
  const attributes = [
    {
      trait_type: "Creator",
      value: `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`
    },
    {
      trait_type: "Symbol",
      value: coinSymbol
    },
    {
      trait_type: "Platform",
      value: "OpenCut"
    },
    {
      trait_type: "Storage Type",
      value: filcdnItems.length > 0 ? "FilCDN + Local" : "Local"
    },
    {
      trait_type: "Content Type",
      value: "Video Commentary"
    }
  ];

  // Add FilCDN specific attributes if present
  if (filcdnItems.length > 0) {
    attributes.push({
      trait_type: "FilCDN Items",
      value: filcdnItems.length.toString()
    });
    
    attributes.push({
      trait_type: "Decentralized Storage",
      value: "Filecoin PDP"
    });
  }

  // Add duration if available
  if (totalDuration > 0) {
    attributes.push({
      trait_type: "Duration",
      value: `${Math.round(totalDuration)}s`
    });
  }

  // Add media count
  attributes.push({
    trait_type: "Media Assets",
    value: mediaItems.length.toString()
  });

  // Build the metadata object
  const metadata: CoinMetadata = {
    name: coinName,
    description: `A memetic video commentary created with OpenCut. ${filcdnItems.length > 0 ? 'Powered by FilCDN for lightning-fast delivery.' : ''} Mint, trade, and collect unique commentary coins.`,
    external_url: `https://saywhat.app/project/${projectId}`,
    attributes
  };

  // Add primary media URLs if available
  if (primaryMedia) {
    if (primaryMedia.type === 'video') {
      metadata.animation_url = primaryMedia.isFilCDN ? primaryMedia.url : undefined;
    }
    
    // Use thumbnail as image if available
    if (primaryMedia.thumbnailUrl) {
      metadata.image = primaryMedia.thumbnailUrl;
    }
  }

  return metadata;
}

/**
 * Upload metadata to IPFS (placeholder for now)
 * In production, this would use a service like Pinata, NFT.Storage, or web3.storage
 */
export async function uploadMetadataToIPFS(metadata: CoinMetadata): Promise<string> {
  // For demo purposes, return a placeholder IPFS URI
  // In production, you would:
  // 1. Upload to IPFS service
  // 2. Return the actual ipfs:// URI
  
  console.log('📄 Generated metadata:', metadata);
  
  // Simulate IPFS upload
  const metadataJson = JSON.stringify(metadata, null, 2);
  console.log('📤 Would upload to IPFS:', metadataJson);
  
  // Return placeholder URI (you would replace this with real IPFS upload)
  return "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy";
}

/**
 * Generate metadata specifically highlighting FilCDN integration
 */
export function getFilCDNHighlights(mediaItems: MediaItem[]): string[] {
  const filcdnItems = mediaItems.filter(item => item.isFilCDN);
  const highlights: string[] = [];
  
  if (filcdnItems.length > 0) {
    highlights.push(`🚀 ${filcdnItems.length} files stored on FilCDN`);
    highlights.push('⚡ Lightning-fast retrieval via CDN');
    highlights.push('🔗 Filecoin PDP storage deals');
    
    const totalSize = filcdnItems.reduce((sum, item) => sum + (item.size || 0), 0);
    if (totalSize > 0) {
      highlights.push(`💾 ${(totalSize / 1024 / 1024).toFixed(1)}MB decentralized storage`);
    }
  }
  
  return highlights;
}
