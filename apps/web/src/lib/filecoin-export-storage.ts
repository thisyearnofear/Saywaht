import "server-only";

import { UploadResult } from "./filcdn";

export interface FilecoinStorageConfig {
  privateKey?: string;
  walletAddress?: string;
  rpcUrl?: string;
}

export interface VideoStorageResult extends UploadResult {
  storageType: 'filecoin' | 'grove';
  timestamp: number;
  metadataCid?: string;
}

export interface CaptionStorageResult {
  cid: string;
  uri: string;
  transcript: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  timestamp: number;
  language: string;
}

export interface ExportPackage {
  video: VideoStorageResult;
  captions?: CaptionStorageResult;
  projectMetadata: {
    title: string;
    description?: string;
    createdAt: number;
    duration: number;
    tags?: string[];
  };
}

/**
 * Unified storage service that intelligently routes content to Filecoin (254MB limit) 
 * or Grove (8MB limit) based on size and type
 */
export class FilecoinExportStorage {
  private config: FilecoinStorageConfig;
  private filecoinService: any = null;
  private groveService: any = null;

  constructor(config: FilecoinStorageConfig = {}) {
    this.config = {
      rpcUrl: 'https://api.calibration.node.glif.io/rpc/v1',
      ...config
    };
  }

  /**
   * Initialize the appropriate storage service based on file size
   * - Files > 8MB: Use Filecoin (up to 254MB)
   * - Files <= 8MB: Use Grove (faster, no wallet needed)
   */
  async initializeForSize(fileSizeBytes: number): Promise<'filecoin' | 'grove'> {
    const ONE_HUNDRED_TWENTY_FIVE_MB = 125 * 1024 * 1024;
    
    if (fileSizeBytes > ONE_HUNDRED_TWENTY_FIVE_MB) {
      // Large files need Filecoin
      await this.initializeFilecoin();
      return 'filecoin';
    } else {
      // Small files can use Grove
      await this.initializeGrove();
      return 'grove';
    }
  }

  private async initializeFilecoin(): Promise<void> {
    if (this.filecoinService) return;
    
    if (typeof window !== 'undefined') {
      // Client-side: use secure API
      const { SecureFilCDNService } = await import('./filcdn');
      this.filecoinService = new SecureFilCDNService();
    } else {
      // Server-side: use direct SDK
      const { FilCDNService } = await import('./filcdn');
      if (!this.config.privateKey) {
        throw new Error('FILECOIN_PRIVATE_KEY required for server-side Filecoin operations');
      }
      this.filecoinService = new FilCDNService({
        privateKey: this.config.privateKey,
        walletAddress: this.config.walletAddress
      });
      await this.filecoinService.initialize();
    }
  }

  private async initializeGrove(): Promise<void> {
    if (this.groveService) return;
    const { groveStorage } = await import('./grove-storage');
    this.groveService = groveStorage;
  }

  /**
   * Store exported video to the appropriate storage based on size
   * Automatically selects Filecoin for large videos (>8MB) or Grove for smaller ones
   */
  async storeVideo(
    videoBlob: Blob, 
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<VideoStorageResult> {
    const file = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });
    const storageType = await this.initializeForSize(file.size);

    onProgress?.(10);

    try {
      let result: VideoStorageResult;

      if (storageType === 'filecoin') {
        // Use Filecoin for large files
        console.log(`📦 Storing large video (${(file.size / 1024 / 1024).toFixed(1)}MB) to Filecoin...`);
        
        let uploadResult: UploadResult;
        if (typeof window !== 'undefined') {
          uploadResult = await this.filecoinService.uploadFile(file);
        } else {
          uploadResult = await this.filecoinService.uploadFile(file);
        }
        
        result = {
          ...uploadResult,
          storageType: 'filecoin',
          timestamp: Date.now()
        };
        
        console.log(`✅ Video stored on Filecoin: ${result.cid}`);
      } else {
        // Use Grove for small files
        console.log(`📦 Storing video (${(file.size / 1024 / 1024).toFixed(1)}MB) to Grove...`);
        
        const groveResult = await this.groveService.uploadFile(file);
        
        result = {
          cid: groveResult.uri.replace('lens://', ''),
          filcdnUrl: groveResult.gatewayUrl,
          size: file.size,
          filename: file.name,
          storageType: 'grove',
          timestamp: Date.now()
        };
        
        console.log(`✅ Video stored on Grove: ${result.cid}`);
      }

      onProgress?.(100);
      return result;
    } catch (error) {
      console.error('❌ Video storage failed:', error);
      throw error;
    }
  }

  /**
   * Store caption transcript and segments
   * Always uses Grove since captions are small text files (<8MB)
   */
  async storeCaptions(
    transcript: string,
    segments: Array<{ text: string; start: number; end: number }>,
    language: string = 'en'
  ): Promise<CaptionStorageResult> {
    await this.initializeGrove();

    const captionData = {
      transcript,
      segments,
      language,
      format: 'whisper-json',
      generatedAt: new Date().toISOString(),
      platform: 'saywaht'
    };

    console.log('📝 Storing captions to decentralized storage...');

    try {
      const result = await this.groveService.uploadMetadata(captionData);

      return {
        cid: result.uri.replace('lens://', '').replace('ipfs://', ''),
        uri: result.uri,
        transcript,
        segments,
        timestamp: Date.now(),
        language
      };
    } catch (error) {
      console.error('❌ Caption storage failed:', error);
      throw error;
    }
  }

  /**
   * Store project metadata (title, description, tags)
   * Always uses Grove for fast, free storage
   */
  async storeProjectMetadata(metadata: {
    title: string;
    description?: string;
    tags?: string[];
    duration: number;
    videoCid?: string;
    captionCid?: string;
  }): Promise<{ cid: string; uri: string; gatewayUrl: string }> {
    await this.initializeGrove();

    const projectData = {
      ...metadata,
      createdAt: new Date().toISOString(),
      platform: 'saywaht',
      version: '1.0'
    };

    console.log('📄 Storing project metadata...');

    const result = await this.groveService.uploadMetadata(projectData);

    return {
      cid: result.uri.replace('lens://', '').replace('ipfs://', ''),
      uri: result.uri,
      gatewayUrl: result.gatewayUrl
    };
  }

  /**
   * Store a complete export package: video + captions + metadata
   * This creates a comprehensive on-chain record of the content
   */
  async storeExportPackage(
    videoBlob: Blob,
    filename: string,
    options: {
      title: string;
      description?: string;
      transcript?: string;
      segments?: Array<{ text: string; start: number; end: number }>;
      language?: string;
      tags?: string[];
      duration: number;
    },
    onProgress?: (phase: 'video' | 'captions' | 'metadata', progress: number) => void
  ): Promise<ExportPackage> {
    onProgress?.('video', 0);

    // 1. Store video
    const videoResult = await this.storeVideo(videoBlob, filename, (p) => {
      onProgress?.('video', p);
    });

    onProgress?.('captions', 0);

    // 2. Store captions if provided
    let captionResult: CaptionStorageResult | undefined;
    if (options.transcript && options.segments) {
      captionResult = await this.storeCaptions(
        options.transcript,
        options.segments,
        options.language
      );
      onProgress?.('captions', 100);
    }

    onProgress?.('metadata', 0);

    // 3. Store project metadata that links everything together
    const metadataResult = await this.storeProjectMetadata({
      title: options.title,
      description: options.description,
      tags: options.tags,
      duration: options.duration,
      videoCid: videoResult.cid,
      captionCid: captionResult?.cid
    });

    // Attach metadata CID to video result
    videoResult.metadataCid = metadataResult.cid;
    onProgress?.('metadata', 100);

    return {
      video: videoResult,
      captions: captionResult,
      projectMetadata: {
        title: options.title,
        description: options.description,
        createdAt: Date.now(),
        duration: options.duration,
        tags: options.tags
      }
    };
  }

  /**
   * Get storage recommendations based on file size
   */
  static getStorageRecommendation(fileSizeBytes: number): {
    provider: 'filecoin' | 'grove';
    reason: string;
    maxSize: number;
    estimatedCost: string;
  } {
    const ONE_HUNDRED_TWENTY_FIVE_MB = 125 * 1024 * 1024;
    const TWO_HUNDRED_FIFTY_FOUR_MB = 254 * 1024 * 1024;

    if (fileSizeBytes > TWO_HUNDRED_FIFTY_FOUR_MB) {
      return {
        provider: 'filecoin',
        reason: 'File exceeds maximum supported size (254MB). Consider compression or splitting.',
        maxSize: TWO_HUNDRED_FIFTY_FOUR_MB,
        estimatedCost: 'N/A - File too large'
      };
    }

    if (fileSizeBytes > ONE_HUNDRED_TWENTY_FIVE_MB) {
      return {
        provider: 'filecoin',
        reason: 'File exceeds Grove limit (125MB). Filecoin supports up to 254MB.',
        maxSize: TWO_HUNDRED_FIFTY_FOUR_MB,
        estimatedCost: 'Uses FilCDN allowance'
      };
    }

    return {
      provider: 'grove',
      reason: 'Small file - Grove provides fast, free storage via IPFS.',
      maxSize: ONE_HUNDRED_TWENTY_FIVE_MB,
      estimatedCost: 'Free'
    };
  }

  /**
   * Check if a file can be stored given current constraints
   */
  static canStore(fileSizeBytes: number): {
    canStore: boolean;
    provider?: 'filecoin' | 'grove';
    reason?: string;
  } {
    const TWO_HUNDRED_FIFTY_FOUR_MB = 254 * 1024 * 1024;
    const ONE_HUNDRED_TWENTY_FIVE_MB = 125 * 1024 * 1024;

    if (fileSizeBytes > TWO_HUNDRED_FIFTY_FOUR_MB) {
      return {
        canStore: false,
        reason: 'File exceeds maximum supported size of 254MB'
      };
    }

    return {
      canStore: true,
      provider: fileSizeBytes > ONE_HUNDRED_TWENTY_FIVE_MB ? 'filecoin' : 'grove'
    };
  }
}

// Export singleton instance
export const filecoinExportStorage = new FilecoinExportStorage();

/**
 * Convenience function to store a complete video export with all metadata
 * This is the primary API for saving exported videos to decentralized storage
 */
export async function storeVideoExport(
  videoBlob: Blob,
  filename: string,
  options: {
    title: string;
    description?: string;
    transcript?: string;
    segments?: Array<{ text: string; start: number; end: number }>;
    language?: string;
    tags?: string[];
    duration: number;
  },
  onProgress?: (phase: 'video' | 'captions' | 'metadata', progress: number) => void
): Promise<ExportPackage> {
  return filecoinExportStorage.storeExportPackage(videoBlob, filename, options, onProgress);
}

/**
 * Check storage availability and get recommendations before exporting
 */
export function checkStorageCapability(fileSizeBytes: number): {
  canStore: boolean;
  recommendation: ReturnType<typeof FilecoinExportStorage.getStorageRecommendation>;
} {
  const canStore = FilecoinExportStorage.canStore(fileSizeBytes);
  const recommendation = FilecoinExportStorage.getStorageRecommendation(fileSizeBytes);

  return {
    canStore: canStore.canStore,
    recommendation
  };
}
