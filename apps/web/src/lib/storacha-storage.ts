/**
 * Storacha Storage Service
 * Permanent decentralized storage for captions, transcripts, and metadata
 * Uses UCAN-based authorization with proper key management
 */

import { create } from '@storacha/client'
import { Signer } from '@storacha/client/principal/ed25519'
import { StoreMemory } from '@storacha/client/stores/memory'
import type { Client } from '@storacha/client'

export interface StorachaConfig {
  privateKey?: string
  gatewayUrl?: string
}

export interface StorachaUploadResult {
  cid: string
  url: string
  gatewayUrl: string
  size: number
}

export interface CaptionData {
  transcript: string
  segments: Array<{ text: string; start: number; end: number }>
  language: string
}

export interface VideoMetadata {
  title: string
  description?: string
  duration: number
  resolution?: string
  format: string
  tags?: string[]
}

export interface ContentPackage {
  video: StorachaUploadResult
  captions: StorachaUploadResult
  metadata: StorachaUploadResult
  contentIndex: StorachaUploadResult
}

/**
 * Storacha Storage Service
 * Provides permanent, decentralized storage using UCAN authorization
 */
export class StorachaStorageService {
  private client: Client | null = null
  private config: Required<Omit<StorachaConfig, 'privateKey'>> & { privateKey?: string }

  constructor(config: StorachaConfig = {}) {
    this.config = {
      gatewayUrl: config.gatewayUrl || 'https://w3s.link',
      privateKey: config.privateKey
    }
  }

  /**
   * Initialize Storacha client with private key authentication
   * Server-side only - frontend should use delegated capabilities
   */
  async initialize(): Promise<void> {
    if (this.client) return
    if (typeof window !== 'undefined') {
      throw new Error('Storacha client initialization is server-side only')
    }

    if (!this.config.privateKey) {
      throw new Error('STORACHA_PRIVATE_KEY required for server-side operations')
    }

    try {
      const principal = Signer.parse(this.config.privateKey)
      const store = new StoreMemory()
      this.client = await create({ principal, store })
    } catch (error) {
      console.error('Storacha initialization failed:', error)
      throw new Error('Failed to initialize Storacha client')
    }
  }

  /**
   * Check if Storacha is configured and available
   */
  isAvailable(): boolean {
    return typeof window === 'undefined' && !!this.config.privateKey
  }

  /**
   * Store caption transcript permanently
   */
  async storeCaptions(
    transcript: string,
    segments: Array<{ text: string; start: number; end: number }>,
    language: string = 'en'
  ): Promise<StorachaUploadResult> {
    await this.initialize()

    if (!this.client) {
      throw new Error('Storacha client not initialized')
    }

    const captionPackage = {
      transcript,
      segments,
      language,
      generatedAt: new Date().toISOString(),
      wordCount: transcript.split(/\s+/).length,
      platform: 'saywaht'
    }

    const blob = new Blob([JSON.stringify(captionPackage, null, 2)], {
      type: 'application/json'
    })

    const file = new File([blob], `captions-${Date.now()}.json`, {
      type: 'application/json'
    })

    const cid = await this.client.uploadFile(file)

    return {
      cid: cid.toString(),
      url: `ipfs://${cid}`,
      gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
      size: blob.size
    }
  }

  /**
   * Store video metadata as permanent record
   */
  async storeVideoMetadata(
    metadata: VideoMetadata & { videoCid?: string; captionCid?: string }
  ): Promise<StorachaUploadResult> {
    await this.initialize()

    if (!this.client) {
      throw new Error('Storacha client not initialized')
    }

    const metadataWithTimestamp = {
      ...metadata,
      storedAt: new Date().toISOString(),
      platform: 'saywaht',
      type: 'video-metadata'
    }

    const blob = new Blob([JSON.stringify(metadataWithTimestamp, null, 2)], {
      type: 'application/json'
    })

    const filename = `metadata-${metadata.title.replace(/\s+/g, '-').toLowerCase()}.json`
    const file = new File([blob], filename, { type: 'application/json' })

    const cid = await this.client.uploadFile(file)

    return {
      cid: cid.toString(),
      url: `ipfs://${cid}`,
      gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
      size: blob.size
    }
  }

  /**
   * Store complete content package: video, captions, and metadata
   * Creates permanent, verifiable archive with content index
   */
  async storeContentPackage(
    videoFile: File,
    captions: CaptionData,
    metadata: Omit<VideoMetadata, 'videoCid' | 'captionCid'>
  ): Promise<ContentPackage> {
    // Upload video
    const videoResult = await this.uploadFile(videoFile)

    // Upload captions
    const captionResult = await this.storeCaptions(
      captions.transcript,
      captions.segments,
      captions.language
    )

    // Upload metadata with references
    const metadataResult = await this.storeVideoMetadata({
      ...metadata,
      videoCid: videoResult.cid,
      captionCid: captionResult.cid
    })

    // Create content index
    const contentIndex = {
      title: metadata.title,
      description: metadata.description,
      createdAt: new Date().toISOString(),
      platform: 'saywaht',
      type: 'content-package',
      assets: {
        video: { cid: videoResult.cid, size: videoResult.size },
        captions: { cid: captionResult.cid, size: captionResult.size },
        metadata: { cid: metadataResult.cid, size: metadataResult.size }
      }
    }

    const indexBlob = new Blob([JSON.stringify(contentIndex, null, 2)], {
      type: 'application/json'
    })
    const indexFile = new File([indexBlob], `index-${Date.now()}.json`, {
      type: 'application/json'
    })
    const indexCid = await this.client!.uploadFile(indexFile)

    const indexResult: StorachaUploadResult = {
      cid: indexCid.toString(),
      url: `ipfs://${indexCid}`,
      gatewayUrl: `${this.config.gatewayUrl}/ipfs/${indexCid}`,
      size: indexBlob.size
    }

    return {
      video: videoResult,
      captions: captionResult,
      metadata: metadataResult,
      contentIndex: indexResult
    }
  }

  /**
   * Upload file to Storacha
   */
  async uploadFile(file: File): Promise<StorachaUploadResult> {
    await this.initialize()

    if (!this.client) {
      throw new Error('Storacha client not initialized')
    }

    const cid = await this.client.uploadFile(file)

    return {
      cid: cid.toString(),
      url: `ipfs://${cid}`,
      gatewayUrl: `${this.config.gatewayUrl}/ipfs/${cid}`,
      size: file.size
    }
  }

  /**
   * Get gateway URL for CID retrieval
   */
  getGatewayUrl(cid: string): string {
    return `${this.config.gatewayUrl}/ipfs/${cid}`
  }
}

// Export singleton instance for server-side use
export const storachaStorage = new StorachaStorageService()

/**
 * Convenience functions for common operations
 */

export async function storeCaptionsToStoracha(
  transcript: string,
  segments: Array<{ text: string; start: number; end: number }>,
  language: string = 'en'
): Promise<StorachaUploadResult> {
  return storachaStorage.storeCaptions(transcript, segments, language)
}

export async function storeMetadataToStoracha(
  metadata: VideoMetadata & { videoCid?: string; captionCid?: string }
): Promise<StorachaUploadResult> {
  return storachaStorage.storeVideoMetadata(metadata)
}
