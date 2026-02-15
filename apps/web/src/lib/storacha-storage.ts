/**
 * Storacha SDK Integration
 * Decentralized storage for captions, transcripts, and metadata
 * Lightweight add-on for permanent content archiving
 */

export interface StorachaConfig {
  privateKey?: string;
  delegation?: string;
  gatewayUrl?: string;
}

export interface StorachaUploadResult {
  cid: string;
  url: string;
  gatewayUrl: string;
  size: number;
}

export interface StorachaCaptionPackage {
  transcript: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  language: string;
  generatedAt: string;
  wordCount: number;
}

export interface StorachaVideoMetadata {
  title: string;
  description?: string;
  duration: number;
  resolution?: string;
  format: string;
  createdAt: string;
  tags?: string[];
  captionCid?: string;
  videoCid?: string;
}

/**
 * Storacha Storage Service
 * Provides permanent, decentralized storage for creator content
 * Perfect for storing captions, transcripts, and video metadata
 */
export class StorachaStorageService {
  private client: any = null;
  private config: StorachaConfig;
  private isInitialized = false;

  constructor(config: StorachaConfig = {}) {
    this.config = {
      gatewayUrl: 'https://w3s.link',
      ...config
    };
  }

  /**
   * Initialize the Storacha client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;

    try {
      // Dynamically import to avoid SSR issues
      const { create } = await import('@web3-storage/w3up-client');
      this.client = await create();
      
      // Login with private key if provided
      if (this.config.privateKey) {
        const account = await this.client.login(this.config.privateKey as `did:mailto:${string}`);
        console.log('✅ Storacha: Logged in as', account.did());
      }
      
      // Set current space if delegation provided
      if (this.config.delegation) {
        // SDK versions differ in delegation helpers; guard dynamically.
        const w3up = (await import('@web3-storage/w3up-client')) as any;
        const parseDelegation = w3up.parseDelegation;
        if (typeof parseDelegation === "function") {
          const delegation = await parseDelegation(this.config.delegation);
          const space = await this.client.addSpace(delegation);
          await this.client.setCurrentSpace(space.did());
          console.log("✅ Storacha: Space configured");
        } else {
          console.warn(
            "Storacha delegation parser is unavailable in this SDK version; skipping delegation setup."
          );
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Storacha initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if Storacha is available (configured)
   */
  isAvailable(): boolean {
    return this.isInitialized || !!this.config.privateKey;
  }

  /**
   * Store caption transcript and segments permanently
   * Creates a JSON package with all caption data
   */
  async storeCaptions(
    transcript: string,
    segments: Array<{ text: string; start: number; end: number }>,
    language: string = 'en'
  ): Promise<StorachaUploadResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error('Storacha client not initialized');
    }

    const packageData: StorachaCaptionPackage = {
      transcript,
      segments,
      language,
      generatedAt: new Date().toISOString(),
      wordCount: transcript.split(/\s+/).length
    };

    console.log('📝 Storing captions to Storacha...');

    try {
      const blob = new Blob([JSON.stringify(packageData, null, 2)], {
        type: 'application/json'
      });

      const file = new File([blob], `captions-${Date.now()}.json`, {
        type: 'application/json'
      });

      const cid = await this.client.uploadFile(file);
      
      const result: StorachaUploadResult = {
        cid: cid.toString(),
        url: `ipfs://${cid}`,
        gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
        size: blob.size
      };

      console.log(`✅ Captions stored on Storacha: ${result.cid}`);
      
      return result;
    } catch (error) {
      console.error('❌ Storacha caption upload failed:', error);
      throw error;
    }
  }

  /**
   * Store video metadata as a permanent record
   * Links to video CID and caption CID for complete archiving
   */
  async storeVideoMetadata(metadata: StorachaVideoMetadata): Promise<StorachaUploadResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error('Storacha client not initialized');
    }

    const metadataWithTimestamp = {
      ...metadata,
      storedAt: new Date().toISOString(),
      platform: 'saywaht',
      type: 'video-metadata'
    };

    console.log('📄 Storing video metadata to Storacha...');

    try {
      const blob = new Blob([JSON.stringify(metadataWithTimestamp, null, 2)], {
        type: 'application/json'
      });

      const file = new File([blob], `metadata-${metadata.title.replace(/\s+/g, '-')}.json`, {
        type: 'application/json'
      });

      const cid = await this.client.uploadFile(file);
      
      const result: StorachaUploadResult = {
        cid: cid.toString(),
        url: `ipfs://${cid}`,
        gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
        size: blob.size
      };

      console.log(`✅ Metadata stored on Storacha: ${result.cid}`);
      
      return result;
    } catch (error) {
      console.error('❌ Storacha metadata upload failed:', error);
      throw error;
    }
  }

  /**
   * Store a complete content package: video, captions, and metadata
   * This creates a permanent, verifiable archive of creator content
   */
  async storeContentPackage(
    videoFile: File,
    captions: {
      transcript: string;
      segments: Array<{ text: string; start: number; end: number }>;
      language: string;
    },
    metadata: Omit<StorachaVideoMetadata, 'captionCid' | 'videoCid' | 'createdAt'>,
    onProgress?: (phase: 'video' | 'captions' | 'metadata', progress: number) => void
  ): Promise<{
    video: StorachaUploadResult;
    captions: StorachaUploadResult;
    metadata: StorachaUploadResult;
    contentIndex: StorachaUploadResult;
  }> {
    onProgress?.('video', 0);

    // 1. Upload video
    const videoResult = await this.uploadFile(videoFile);
    onProgress?.('video', 100);

    onProgress?.('captions', 0);
    // 2. Upload captions
    const captionResult = await this.storeCaptions(
      captions.transcript,
      captions.segments,
      captions.language
    );
    onProgress?.('captions', 100);

    onProgress?.('metadata', 0);
    // 3. Upload metadata with references
    const metadataResult = await this.storeVideoMetadata({
      ...metadata,
      createdAt: new Date().toISOString(),
      videoCid: videoResult.cid,
      captionCid: captionResult.cid
    });
    onProgress?.('metadata', 50);

    // 4. Create content index that ties everything together
    const contentIndex = {
      title: metadata.title,
      description: metadata.description,
      createdAt: new Date().toISOString(),
      platform: 'saywaht',
      type: 'content-package',
      assets: {
        video: {
          cid: videoResult.cid,
          url: videoResult.url,
          gatewayUrl: videoResult.gatewayUrl,
          size: videoResult.size
        },
        captions: {
          cid: captionResult.cid,
          url: captionResult.url,
          gatewayUrl: captionResult.gatewayUrl,
          size: captionResult.size
        },
        metadata: {
          cid: metadataResult.cid,
          url: metadataResult.url,
          gatewayUrl: metadataResult.gatewayUrl,
          size: metadataResult.size
        }
      }
    };

    const indexBlob = new Blob([JSON.stringify(contentIndex, null, 2)], {
      type: 'application/json'
    });
    const indexFile = new File([indexBlob], `index-${Date.now()}.json`, {
      type: 'application/json'
    });
    const indexCid = await this.client.uploadFile(indexFile);
    
    const indexResult: StorachaUploadResult = {
      cid: indexCid.toString(),
      url: `ipfs://${indexCid}`,
      gatewayUrl: `${this.config.gatewayUrl}/ipfs/${indexCid}`,
      size: indexBlob.size
    };

    onProgress?.('metadata', 100);

    console.log('✅ Complete content package stored on Storacha');
    console.log(`   Video: ${videoResult.cid}`);
    console.log(`   Captions: ${captionResult.cid}`);
    console.log(`   Metadata: ${metadataResult.cid}`);
    console.log(`   Index: ${indexResult.cid}`);

    return {
      video: videoResult,
      captions: captionResult,
      metadata: metadataResult,
      contentIndex: indexResult
    };
  }

  /**
   * Upload any file to Storacha
   */
  async uploadFile(file: File): Promise<StorachaUploadResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error('Storacha client not initialized');
    }

    console.log(`📤 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) to Storacha...`);

    try {
      const cid = await this.client.uploadFile(file);
      
      const result: StorachaUploadResult = {
        cid: cid.toString(),
        url: `ipfs://${cid}`,
        gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
        size: file.size
      };

      console.log(`✅ File stored on Storacha: ${result.cid}`);
      
      return result;
    } catch (error) {
      console.error('❌ Storacha upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload a directory/folder of files
   */
  async uploadDirectory(files: File[]): Promise<StorachaUploadResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error('Storacha client not initialized');
    }

    console.log(`📤 Uploading ${files.length} files to Storacha...`);

    try {
      const cid = await this.client.uploadDirectory(files);
      
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      
      const result: StorachaUploadResult = {
        cid: cid.toString(),
        url: `ipfs://${cid}`,
        gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
        size: totalSize
      };

      console.log(`✅ Directory stored on Storacha: ${result.cid}`);
      
      return result;
    } catch (error) {
      console.error('❌ Storacha directory upload failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve content from Storacha via gateway
   */
  async retrieve(cid: string): Promise<Response> {
    const url = `${this.config.gatewayUrl}/ipfs/${cid}`;
    return fetch(url);
  }

  /**
   * Get the gateway URL for a CID
   */
  getUrl(cid: string): string {
    return `${this.config.gatewayUrl}/ipfs/${cid}`;
  }
}

// Export singleton instance
export const storachaStorage = new StorachaStorageService();

/**
 * Quick convenience functions
 */

export async function storeCaptionsToStoracha(
  transcript: string,
  segments: Array<{ text: string; start: number; end: number }>,
  language: string = 'en'
): Promise<StorachaUploadResult> {
  return storachaStorage.storeCaptions(transcript, segments, language);
}

export async function storeMetadataToStoracha(
  metadata: StorachaVideoMetadata
): Promise<StorachaUploadResult> {
  return storachaStorage.storeVideoMetadata(metadata);
}

export async function storeContentPackageToStoracha(
  videoFile: File,
  captions: {
    transcript: string;
    segments: Array<{ text: string; start: number; end: number }>;
    language: string;
  },
  metadata: Omit<StorachaVideoMetadata, 'captionCid' | 'videoCid' | 'createdAt'>,
  onProgress?: (phase: 'video' | 'captions' | 'metadata', progress: number) => void
) {
  return storachaStorage.storeContentPackage(videoFile, captions, metadata, onProgress);
}
