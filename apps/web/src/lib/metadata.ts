import { MediaItem } from "@/stores/media-store";
import { TimelineTrack } from "@/stores/timeline-store";
import { validateMetadataJSON } from "@zoralabs/coins-sdk";
import { processThumbnailForMetadata } from "./thumbnail-upload";

const METADATA_PROPAGATION_TIMEOUT_MS = 15000;

export interface CoinMetadata {
  name: string;
  description: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  content?: {
    mime: string;
    uri: string;
  };
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
  thumbnailUrl?: string; // Optional custom thumbnail URL (for metadata)
  archiveManifestUrl?: string;
  captionsUrl?: string;
}

async function waitForMetadataPropagation(uri: string, gatewayUrl: string): Promise<void> {
  try {
    console.log("⏳ Verifying metadata propagation...");

    const response = await fetch("/api/ipfs/metadata-ready", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uri,
        gatewayUrl,
        timeoutMs: METADATA_PROPAGATION_TIMEOUT_MS,
      }),
    });

    const result = await response.json().catch(() => ({ ready: false }));

    if (response.ok && result?.ready) {
      console.log("✅ Metadata propagation verified:", result.url);
      return;
    }

    console.warn(
      "⚠️ Metadata propagation could not be verified before continuing:",
      result?.error || `HTTP ${response.status}`
    );
  } catch (error) {
    console.warn("⚠️ Metadata propagation verification failed, continuing:", error);
  }
}

/**
 * Generate standardized metadata for Zora Content Coins.
 * This is the single source of truth for all coin metadata on Saywaht.
 */
export async function generateCoinMetadata(params: GenerateMetadataParams): Promise<CoinMetadata> {
  const {
    coinName,
    coinSymbol,
    creatorAddress,
    mediaItems,
    tracks,
    projectId,
    exportedVideoUrl,
    thumbnailUrl,
    archiveManifestUrl,
    captionsUrl
  } = params;

  // Calculate total project duration from tracks
  const totalDuration = tracks.length > 0 
    ? Math.max(...tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 0)
    : 0;

  // Identify primary media and storage providers
  const hasFilCDN = mediaItems.some(item => item.isFilCDN);
  const hasCaptions = !!captionsUrl;

  // Standard Zora Attributes for discovery
  const attributes = [
    { trait_type: "Creator", value: creatorAddress },
    { trait_type: "Symbol", value: coinSymbol },
    { trait_type: "Format", value: "Commentary Video" },
    { trait_type: "Platform", value: "SayWaht" },
    { trait_type: "Engine", value: "FFmpeg/Web" },
    { trait_type: "Storage", value: hasFilCDN ? "Filecoin + IPFS" : "IPFS" }
  ];

  if (totalDuration > 0) {
    attributes.push({ trait_type: "Duration", value: `${Math.round(totalDuration)}s` });
  }

  // Final Image URL processing
  let imageSource = thumbnailUrl || "https://saywaht.app/opengraph-image.jpg";
  const imageUrl = await processThumbnailForMetadata(imageSource);

  // Final Video URL priority: Exported > Primary Media
  const videoUrl = exportedVideoUrl || 
                  mediaItems.find(m => m.type === 'video' && (m.isFilCDN || m.isGrove))?.url;

  // Build compliant metadata object
  const metadata: any = {
    name: coinName,
    description: `A unique commentary coin created on SayWaht. Join the attention economy where every insight has value.`,
    image: imageUrl,
    external_url: `https://saywaht.app/project/${projectId}`,
    attributes,
    properties: {
      category: "video",
      creator: creatorAddress,
      symbol: coinSymbol,
      platform: "saywaht",
      content_type: "video-commentary",
      manifest_url: archiveManifestUrl,
      captions_url: captionsUrl
    }
  };

  // Add video content if available
  if (videoUrl) {
    metadata.animation_url = videoUrl;
    metadata.content = {
      mime: videoUrl.toLowerCase().endsWith('.mp4') ? "video/mp4" : "video/webm",
      uri: videoUrl
    };
  }

  // Validate before returning to catch issues early
  try {
    validateMetadataJSON(metadata);
  } catch (e) {
    console.error("Zora Metadata Validation Error:", e);
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

    // Use standard IPFS URI for Zora metadata to ensure maximum compatibility with SDK and contracts
    const ipfsUri = result.uri.replace('lens://', 'ipfs://');
    await waitForMetadataPropagation(ipfsUri, result.gatewayUrl);

    console.log('✅ Metadata uploaded to IPFS:', ipfsUri);
    console.log('🌐 Gateway URL:', result.gatewayUrl);
    console.log('🔗 Using IPFS URI for metadata to ensure Zora protocol compatibility');

    return ipfsUri; // Return IPFS URI instead of gateway URL for standard Zora compatibility
  } catch (error) {
    console.error('❌ Failed to upload metadata to IPFS:', error);

    // Fallback: return a placeholder URI for development
    console.warn('🔄 Using placeholder URI for development');
    return "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy";
  }
}
