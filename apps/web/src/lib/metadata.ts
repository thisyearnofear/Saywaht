import { MediaItem } from "@/stores/media-store";
import { TimelineTrack } from "@/stores/timeline-store";
import { validateMetadataJSON } from "@zoralabs/coins-sdk";
import { processThumbnailForMetadata } from "./thumbnail-upload";

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
  exportedVideoUrl?: string; // Optional exported video URL from canvas export
}

/**
 * Generate metadata for a coin based on project content
 */
export async function generateCoinMetadata(params: GenerateMetadataParams): Promise<CoinMetadata> {
  const {
    coinName,
    coinSymbol,
    creatorAddress,
    mediaItems,
    tracks,
    projectId,
    exportedVideoUrl
  } = params;

  // Find the primary video/media content (first FilCDN item or first video)
  const primaryMedia = mediaItems.find(item => item.isFilCDN && item.type === 'video') ||
                      mediaItems.find(item => item.type === 'video') ||
                      mediaItems.find(item => item.isFilCDN) ||
                      mediaItems[0];

  // Count FilCDN vs Grove vs local content
  const filcdnItems = mediaItems.filter(item => item.isFilCDN);
  const groveItems = mediaItems.filter(item => item.isGrove);
  const localItems = mediaItems.filter(item => !item.isFilCDN && !item.isGrove);

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
      value: filcdnItems.length > 0
        ? "FilCDN + IPFS"
        : groveItems.length > 0
          ? "IPFS"
          : "Local"
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

  // Find the best image source
  let imageSource = "";
  
  if (primaryMedia) {
    if (primaryMedia.thumbnailUrl) {
      imageSource = primaryMedia.thumbnailUrl;
    } else if (primaryMedia.type === 'image') {
      imageSource = primaryMedia.url;
    }
  }
  
  // Process the thumbnail to ensure we have a valid HTTPS URL
  const imageUrl = await processThumbnailForMetadata(imageSource);

  // Build the metadata object
  const metadata: CoinMetadata = {
    name: coinName,
    description: `A memetic video commentary created with OpenCut. ${filcdnItems.length > 0 ? 'Powered by FilCDN for lightning-fast delivery.' : ''} Deploy, trade, and collect unique video coins.`,
    image: imageUrl, // Always set the image
    external_url: `https://saywhat.app/project/${projectId}`,
    attributes
  };

  // Add animation URL for videos - prioritize exported video, then FilCDN/Grove content
  if (exportedVideoUrl) {
    // Use the exported video from canvas export (highest priority)
    metadata.animation_url = exportedVideoUrl;
  } else if (primaryMedia && primaryMedia.type === 'video' && (primaryMedia.isFilCDN || primaryMedia.isGrove)) {
    // Fallback to original media content
    metadata.animation_url = primaryMedia.url;
  }

  return metadata;
}

/**
 * Upload metadata to IPFS using Grove storage
 */
export async function uploadMetadataToIPFS(metadata: CoinMetadata): Promise<string> {
  try {
    const { groveStorage } = await import('./grove-storage');

    console.log('📄 Uploading metadata to IPFS via Grove:', metadata);

    const result = await groveStorage.uploadMetadata(metadata);

    // Wait for IPFS propagation to ensure content is available
    try {
      console.log('⏳ Waiting for IPFS propagation...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for propagation
      console.log('✅ IPFS propagation wait complete');
    } catch (error) {
      console.warn('⚠️ Propagation wait failed, but continuing:', error);
    }

    // Use Grove gateway URL for better reliability with Zora's validation service
    // Grove gateway URLs are immediately available and more reliable than IPFS URLs
    const gatewayUrl = result.gatewayUrl;
    const ipfsUri = result.uri.replace('lens://', 'ipfs://');

    console.log('✅ Metadata uploaded to IPFS:', ipfsUri);
    console.log('🌐 Gateway URL:', gatewayUrl);
    console.log('🔗 Using gateway URL for metadata URI to ensure Zora validation works');

    return gatewayUrl; // Return gateway URL instead of IPFS URI for better compatibility
  } catch (error) {
    console.error('❌ Failed to upload metadata to IPFS:', error);

    // Fallback: return a placeholder URI for development
    console.warn('🔄 Using placeholder URI for development');
    return "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy";
  }
}

/**
 * Generate metadata specifically highlighting FilCDN integration
 */
export function getFilCDNHighlights(mediaItems: MediaItem[]): string[] {
  // Handle undefined or empty mediaItems
  if (!mediaItems || mediaItems.length === 0) {
    return [];
  }
  
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

/**
 * Generate simplified metadata for a video coin without requiring full project data
 */
export interface SimpleCoinMetadataParams {
  name: string;
  symbol: string;
  description?: string;
  videoUri: string;
  creatorAddress: string;
  projectId?: string;
  thumbnailUrl?: string;
}

export function generateCoinMetadataFromVideo(params: SimpleCoinMetadataParams): CoinMetadata {
  const {
    name,
    symbol,
    videoUri,
    creatorAddress,
    projectId,
    thumbnailUrl: providedThumbnailUrl,
    description = `A video coin created with SayWhat`,
  } = params;

  // We need to properly handle IPFS URIs
  let ipfsHash = '';
  if (videoUri.startsWith('ipfs://')) {
    ipfsHash = videoUri.substring(7);
  } else if (videoUri.startsWith('lens://')) {
    ipfsHash = videoUri.substring(7);
  }
  
  // Create a public gateway URL for the video
  const publicGatewayUrl = ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : videoUri;
  
  // Use provided thumbnail if available, otherwise use a default
  // Ensure we always have a valid HTTPS URL for Zora validation
  let thumbnailUrl = providedThumbnailUrl;
  
  if (!thumbnailUrl) {
    // Use SayWhat's default image as fallback
    thumbnailUrl = "https://saywhat.app/opengraph-image.jpg";
  }
  
  // Ensure the URL is absolute
  if (thumbnailUrl.startsWith('/')) {
    thumbnailUrl = `https://saywhat.app${thumbnailUrl}`;
  }
  
  // Build the metadata object following Zora's exact format
  const metadata: any = {
    name,
    description,
    // Use a dynamic thumbnail URL generated from the video
    image: thumbnailUrl,
    // For video content
    animation_url: videoUri,
    // Zora's extended format for better indexing
    content: {
      mime: "video/webm",
      uri: videoUri
    },
    // Use properties instead of attributes (Zora's format)
    properties: {
      category: "video",
      creator: creatorAddress,
      symbol: symbol,
      platform: "SayWhat"
    }
  };

  // Add external URL if project ID is available
  if (projectId) {
    metadata.external_url = `https://saywhat.app/project/${projectId}`;
  }

  console.log("📄 Generated metadata for Zora validation:", metadata);
  
  // Validate metadata before returning
  try {
    validateMetadataJSON(metadata);
    console.log("✅ Metadata validation passed");
  } catch (error) {
    console.error("❌ Metadata validation failed:", error);
    throw new Error(`Invalid metadata format: ${error}`);
  }
  
  return metadata;
}
