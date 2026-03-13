import { groveStorage } from "./grove-storage";
import { getFilCDNService, isFilCDNConfigured } from "./filcdn";
import { requestDelegation, uploadFileToStoracha } from "./storacha-client";

const filcdnStorage = getFilCDNService();

/**
 * Unified Storage Manager
 * 
 * Provides a single interface for managing media storage across multiple providers:
 * - Grove (primary, up to 125MB)
 * - Storacha (secondary warm storage for larger files)
 * - FilCDN (optional, only when explicitly configured)
 * 
 * Features:
 * - Automatic provider selection based on file size
 * - Intelligent fallbacks when primary storage fails
 * - File optimization/compression when needed
 * - Comprehensive error handling with user-friendly messages
 * - Upload progress tracking
 * - Retry logic with exponential backoff
 */

// Storage provider types
export type StorageProvider = "grove" | "storacha" | "filcdn" | "ipfs" | "local";

// Storage limits by provider (in MB)
export const STORAGE_LIMITS = {
  grove: 125,
  storacha: 1024,
  filcdn: 254,
  ipfs: 50,
  local: 0, // No limit for local storage
};

// Error types for better handling
export enum StorageErrorType {
  SIZE_EXCEEDED = "SIZE_EXCEEDED",
  RATE_LIMIT = "RATE_LIMIT",
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  UNKNOWN = "UNKNOWN",
}

export interface StorageError extends Error {
  type: StorageErrorType;
  provider: StorageProvider;
  retryable: boolean;
  details?: any;
}

// Upload result interface
export interface UploadResult {
  url: string;
  ipfsUrl?: string;
  gatewayUrl?: string;
  metadataUrl?: string;
  size: number;
  provider: StorageProvider;
  optimized: boolean;
}

export interface CaptionTranscriptEntry {
  startTime: number;
  endTime: number;
  text: string;
}

export interface FilecoinArchiveResult {
  video: UploadResult;
  transcript?: UploadResult;
  manifest: UploadResult;
  retrieval: {
    videoUrl: string;
    videoCid?: string;
    transcriptUrl?: string;
    transcriptCid?: string;
    manifestUrl: string;
    manifestCid?: string;
  };
}

export interface ProjectExportData {
  project: any;
  tracks: any[];
  mediaItems: any[];
}

export interface MediaNormalizationResult {
  projectData: ProjectExportData;
  normalizedItems: Array<{ id: string; fromUrl: string; toUrl: string }>;
}

// Upload options interface
export interface UploadOptions {
  preferredProvider?: StorageProvider;
  allowFallback?: boolean;
  optimize?: boolean;
  maxSizeMB?: number;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
  onSizeWarning?: (size: number, limit: number) => Promise<boolean>; // Return true to continue, false to cancel
  onProviderFallback?: (from: StorageProvider, to: StorageProvider, reason: string) => Promise<boolean>; // Return true to continue, false to cancel
  metadata?: Record<string, any>;
}

// Default upload options
const DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
  preferredProvider: "grove",
  allowFallback: true,
  optimize: true,
  maxRetries: 3,
};

/**
 * Create a storage error with the appropriate type
 */
function createStorageError(
  message: string,
  type: StorageErrorType,
  provider: StorageProvider,
  retryable = false,
  details?: any
): StorageError {
  const error = new Error(message) as StorageError;
  error.type = type;
  error.provider = provider;
  error.retryable = retryable;
  error.details = details;
  return error;
}

/**
 * Check if file size exceeds provider limits
 */
function checkSizeLimit(
  file: File,
  provider: StorageProvider
): { exceeds: boolean; size: number; limit: number } {
  const sizeInMB = file.size / (1024 * 1024);
  const limit = STORAGE_LIMITS[provider];
  
  return {
    exceeds: limit > 0 && sizeInMB > limit,
    size: sizeInMB,
    limit,
  };
}

function slugifyFileBasename(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "export"
  );
}

function inferMimeType(mediaType?: string): string {
  if (mediaType === "video") return "video/mp4";
  if (mediaType === "audio") return "audio/mpeg";
  if (mediaType === "image") return "image/jpeg";
  return "application/octet-stream";
}

function inferFileExtension(mimeType?: string, mediaType?: string): string {
  if (mimeType) {
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("quicktime")) return "mov";
    if (mimeType.includes("mpeg")) return "mp3";
    if (mimeType.includes("wav")) return "wav";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  }

  if (mediaType === "video") return "mp4";
  if (mediaType === "audio") return "mp3";
  if (mediaType === "image") return "jpg";
  return "bin";
}

function extractCid(upload: UploadResult): string | undefined {
  if (!upload.ipfsUrl?.startsWith("ipfs://")) return undefined;
  return upload.ipfsUrl.replace("ipfs://", "");
}

/**
 * Optimize file size based on type
 * Returns a new optimized file or the original if optimization is not possible
 */
async function optimizeFile(
  file: File,
  targetSizeMB: number,
  onProgress?: (progress: number) => void
): Promise<File> {
  // Skip optimization for small files
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= targetSizeMB) {
    return file;
  }

  // Handle different file types
  if (file.type.startsWith("video/")) {
    return await optimizeVideo(file, targetSizeMB, onProgress);
  } else if (file.type.startsWith("image/")) {
    return await optimizeImage(file, targetSizeMB);
  } else if (file.type.startsWith("audio/")) {
    return await optimizeAudio(file, targetSizeMB);
  }

  // Return original if we can't optimize
  console.warn(`Cannot optimize file of type ${file.type}`);
  return file;
}

/**
 * Optimize video file using canvas and reduced quality
 */
async function optimizeVideo(
  file: File,
  targetSizeMB: number,
  onProgress?: (progress: number) => void
): Promise<File> {
  try {
    // For video optimization, we'd ideally use FFmpeg.wasm
    // But for now, we'll use a simple approach with reduced quality export
    
    // Create video element to get metadata
    const video = document.createElement("video");
    video.muted = true;
    video.src = URL.createObjectURL(file);
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
      video.load();
    });
    
    // Calculate target bitrate based on target size
    // Target bitrate = (target size in bits) / (duration in seconds)
    const targetBitrate = Math.floor(
      (targetSizeMB * 8 * 1024 * 1024) / video.duration
    );
    
    // Use MediaRecorder with lower bitrate
    const canvas = document.createElement("canvas");
    // Reduce resolution if needed
    const scaleFactor = Math.min(1, Math.sqrt(targetSizeMB / (file.size / (1024 * 1024))));
    canvas.width = video.videoWidth * scaleFactor;
    canvas.height = video.videoHeight * scaleFactor;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    const stream = canvas.captureStream();
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9", // Use VP9 for better compression
      videoBitsPerSecond: targetBitrate,
    });
    
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    // Start recording
    recorder.start(1000); // Collect data every second
    video.currentTime = 0;
    video.play();
    
    // Draw video frames to canvas
    const drawFrame = () => {
      if (video.ended || video.paused) {
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Report progress
      if (onProgress) {
        onProgress((video.currentTime / video.duration) * 100);
      }
      
      requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
    
    // Wait for video to finish
    await new Promise<void>((resolve) => {
      video.onended = () => {
        recorder.stop();
        resolve();
      };
    });
    
    // Get recorded blob
    const optimizedBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(blob);
      };
    });
    
    // Clean up
    URL.revokeObjectURL(video.src);
    video.remove();
    
    // Create new file
    const optimizedFile = new File(
      [optimizedBlob],
      file.name.replace(/\.[^/.]+$/, "") + ".webm",
      {
        type: "video/webm",
      }
    );
    
    console.log(
      `Video optimized: ${(file.size / (1024 * 1024)).toFixed(2)}MB → ${(
        optimizedFile.size / (1024 * 1024)
      ).toFixed(2)}MB`
    );
    
    return optimizedFile;
  } catch (error) {
    console.error("Video optimization failed:", error);
    return file; // Return original on failure
  }
}

/**
 * Optimize image file using canvas and reduced quality
 */
async function optimizeImage(file: File, targetSizeMB: number): Promise<File> {
  try {
    // Load image
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });
    
    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    // Calculate target size based on current size ratio
    const currentSizeMB = file.size / (1024 * 1024);
    const ratio = Math.min(1, Math.sqrt(targetSizeMB / currentSizeMB));
    
    // Resize image
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob with reduced quality
    const quality = Math.max(0.5, Math.min(0.9, targetSizeMB / currentSizeMB));
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        file.type,
        quality
      );
    });
    
    // Clean up
    URL.revokeObjectURL(img.src);
    
    // Create new file
    const optimizedFile = new File([blob], file.name, {
      type: file.type,
    });
    
    console.log(
      `Image optimized: ${(file.size / (1024 * 1024)).toFixed(2)}MB → ${(
        optimizedFile.size / (1024 * 1024)
      ).toFixed(2)}MB`
    );
    
    return optimizedFile;
  } catch (error) {
    console.error("Image optimization failed:", error);
    return file; // Return original on failure
  }
}

/**
 * Optimize audio file (basic implementation)
 */
async function optimizeAudio(file: File, targetSizeMB: number): Promise<File> {
  // Audio optimization would require more complex processing
  // This is a placeholder that could be implemented with Web Audio API
  console.warn("Audio optimization not fully implemented");
  return file;
}

/**
 * Retry function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (
        retries >= maxRetries ||
        !(error as StorageError)?.retryable
      ) {
        throw error;
      }
      
      retries++;
      console.log(`Retry ${retries}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

/**
 * Main storage manager class
 */
class StorageManager {
  /**
   * Upload a file to the appropriate storage provider
   */
  async uploadFile(
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    // Merge with default options
    const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };
    const provider = opts.preferredProvider || "grove";
    
    try {
      // Check file size against provider limits
      const sizeCheck = checkSizeLimit(file, provider);
      
      // If file exceeds size limit
      if (sizeCheck.exceeds) {
        console.warn(
          `File size (${sizeCheck.size.toFixed(2)}MB) exceeds ${
            provider
          } limit (${sizeCheck.limit}MB)`
        );
        
        // If size warning callback provided, ask user what to do
        if (opts.onSizeWarning) {
          const shouldContinue = await opts.onSizeWarning(
            sizeCheck.size,
            sizeCheck.limit
          );
          
          if (!shouldContinue) {
            throw createStorageError(
              `Upload cancelled: file size (${sizeCheck.size.toFixed(
                2
              )}MB) exceeds ${provider} limit (${sizeCheck.limit}MB)`,
              StorageErrorType.SIZE_EXCEEDED,
              provider,
              false
            );
          }
        }
        
        // Try to optimize if enabled
        if (opts.optimize) {
          console.log(`Attempting to optimize file to fit ${sizeCheck.limit}MB limit`);
          const optimizedFile = await optimizeFile(
            file,
            sizeCheck.limit * 0.95, // Target 95% of limit to be safe
            opts.onProgress
          );
          
          // Check if optimization was successful
          const optimizedSize = optimizedFile.size / (1024 * 1024);
          if (optimizedSize <= sizeCheck.limit) {
            console.log(
              `Optimization successful: ${sizeCheck.size.toFixed(
                2
              )}MB → ${optimizedSize.toFixed(2)}MB`
            );
            file = optimizedFile;
          } else if (opts.allowFallback) {
            // If still too large and fallback allowed, try another provider
            return this.fallbackUpload(
              file,
              provider,
              `File too large for ${provider} (${sizeCheck.size.toFixed(
                2
              )}MB > ${sizeCheck.limit}MB) even after optimization`,
              opts
            );
          } else {
            throw createStorageError(
              `File too large for ${provider} (${sizeCheck.size.toFixed(
                2
              )}MB > ${sizeCheck.limit}MB) even after optimization`,
              StorageErrorType.SIZE_EXCEEDED,
              provider,
              false
            );
          }
        } else if (opts.allowFallback) {
          // If optimization not enabled but fallback is allowed
          return this.fallbackUpload(
            file,
            provider,
            `File too large for ${provider} (${sizeCheck.size.toFixed(
              2
            )}MB > ${sizeCheck.limit}MB)`,
            opts
          );
        } else {
          throw createStorageError(
            `File too large for ${provider} (${sizeCheck.size.toFixed(
              2
            )}MB > ${sizeCheck.limit}MB)`,
            StorageErrorType.SIZE_EXCEEDED,
            provider,
            false
          );
        }
      }
      
      // Attempt upload with retry logic
      return await withRetry(
        async () => {
          try {
            // Upload to selected provider
            switch (provider) {
              case "grove":
                const groveResult = await groveStorage.uploadFile(file);
                
                return {
                  url: groveResult.gatewayUrl,
                  ipfsUrl: groveResult.uri,
                  gatewayUrl: groveResult.gatewayUrl,
                  metadataUrl: undefined,
                  size: file.size / (1024 * 1024),
                  provider: "grove",
                  optimized: false,
                };

              case "storacha":
                const { delegation } = await requestDelegation();
                const storachaResult = await uploadFileToStoracha(file, delegation);

                return {
                  url: storachaResult.gatewayUrl,
                  ipfsUrl: storachaResult.url,
                  gatewayUrl: storachaResult.gatewayUrl,
                  metadataUrl: undefined,
                  size: file.size / (1024 * 1024),
                  provider: "storacha",
                  optimized: false,
                };
                
              case "filcdn":
                const filcdnStatus = await isFilCDNConfigured();
                if (!filcdnStatus.configured) {
                  throw createStorageError(
                    "FilCDN is not configured. Configure Filecoin credentials or use Grove/Storacha.",
                    StorageErrorType.AUTHENTICATION,
                    "filcdn",
                    false
                  );
                }

                const filcdnResult = await filcdnStorage.uploadFile(file);
                
                return {
                  url: filcdnResult.filcdnUrl,
                  ipfsUrl: `ipfs://${filcdnResult.cid}`,
                  gatewayUrl: filcdnResult.filcdnUrl,
                  metadataUrl: undefined,
                  size: file.size / (1024 * 1024),
                  provider: "filcdn",
                  optimized: false,
                };
                
              default:
                throw createStorageError(
                  `Unsupported storage provider: ${provider}`,
                  StorageErrorType.UNSUPPORTED_FORMAT,
                  provider as StorageProvider,
                  false
                );
            }
          } catch (error) {
            // Convert provider-specific errors to StorageError
            if ((error as StorageError).type) {
              throw error; // Already a StorageError
            }
            
            // Handle different error types
            const errorMessage = (error as Error).message || String(error);
            
            if (
              errorMessage.includes("rate limit") ||
              errorMessage.includes("too many requests")
            ) {
              throw createStorageError(
                `Rate limit exceeded for ${provider}: ${errorMessage}`,
                StorageErrorType.RATE_LIMIT,
                provider as StorageProvider,
                true // Retryable
              );
            } else if (
              errorMessage.includes("network") ||
              errorMessage.includes("timeout") ||
              errorMessage.includes("connection")
            ) {
              throw createStorageError(
                `Network error with ${provider}: ${errorMessage}`,
                StorageErrorType.NETWORK,
                provider as StorageProvider,
                true // Retryable
              );
            } else if (
              errorMessage.includes("auth") ||
              errorMessage.includes("unauthorized") ||
              errorMessage.includes("permission")
            ) {
              throw createStorageError(
                `Authentication error with ${provider}: ${errorMessage}`,
                StorageErrorType.AUTHENTICATION,
                provider as StorageProvider,
                false // Not retryable
              );
            } else {
              throw createStorageError(
                `Unknown error with ${provider}: ${errorMessage}`,
                StorageErrorType.UNKNOWN,
                provider as StorageProvider,
                true // Retry unknown errors
              );
            }
          }
        },
        opts.maxRetries || 3
      );
    } catch (error) {
      // If error is retryable and fallback is allowed, try another provider
      if (
        opts.allowFallback &&
        (error as StorageError).type !== StorageErrorType.SIZE_EXCEEDED
      ) {
        return this.fallbackUpload(
          file,
          provider as StorageProvider,
          `Error with ${provider}: ${(error as Error).message}`,
          opts
        );
      }
      
      // Otherwise rethrow
      throw error;
    }
  }
  
  /**
   * Upload metadata to IPFS (optimized for small JSON files)
   */
  async uploadMetadata(
    metadata: Record<string, any>,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    // Convert metadata to file
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });
    
    const metadataFile = new File([metadataBlob], "metadata.json", {
      type: "application/json",
    });
    
    // Always use Grove for metadata (small files)
    const opts = { ...options, preferredProvider: "grove" as StorageProvider };
    return this.uploadFile(metadataFile, opts);
  }

  async normalizeProjectMediaForExport(
    projectData: ProjectExportData,
    options: UploadOptions = {}
  ): Promise<MediaNormalizationResult> {
    const mediaById = new Map(
      (projectData.mediaItems || []).map((item) => [item.id, item])
    );

    const referencedMediaIds = new Set<string>();
    for (const track of projectData.tracks || []) {
      for (const clip of track?.clips || []) {
        if (clip?.mediaId) {
          referencedMediaIds.add(clip.mediaId);
        }
      }
    }

    const normalizedItems: Array<{ id: string; fromUrl: string; toUrl: string }> = [];
    const normalizedMediaItems = (projectData.mediaItems || []).map((item) => ({ ...item }));

    for (const item of normalizedMediaItems) {
      if (!referencedMediaIds.has(item.id)) {
        continue;
      }

      if (typeof item.url !== "string" || !item.url.startsWith("blob:")) {
        continue;
      }

      const sourceItem = mediaById.get(item.id);
      let file: File | null = sourceItem?.file instanceof File ? sourceItem.file : null;

      if (!file) {
        const response = await fetch(item.url);
        if (!response.ok) {
          throw new Error(`Failed to read local media for ${item.name || item.id}`);
        }

        const blob = await response.blob();
        const extension = inferFileExtension(blob.type, item.type);
        const baseName = slugifyFileBasename(item.name || `${item.type || "media"}_${item.id}`);
        file = new File([blob], `${baseName}.${extension}`, {
          type: blob.type || inferMimeType(item.type),
        });
      }

      const uploadResult = await this.uploadFile(file, {
        preferredProvider: this.getBestProviderForFile(file),
        allowFallback: true,
        optimize: false,
        ...options,
      });

      const previousUrl = item.url;
      item.url = uploadResult.gatewayUrl || uploadResult.url;
      item.isLocal = false;
      item.isGrove = uploadResult.provider === "grove" || uploadResult.provider === "ipfs";
      item.isFilCDN = uploadResult.provider === "filcdn";
      item.cid = extractCid(uploadResult) || item.cid;
      item.size = file.size;
      delete item.file;

      normalizedItems.push({
        id: item.id,
        fromUrl: previousUrl,
        toUrl: item.url,
      });
    }

    return {
      projectData: {
        ...projectData,
        mediaItems: normalizedMediaItems,
      },
      normalizedItems,
    };
  }
  
  /**
   * Export project data to Grove storage for decentralized access
   * Consolidates project, tracks, and media items into a single JSON file
   */
  async exportProjectData(
    projectData: ProjectExportData,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    // Create comprehensive project data structure
    const exportData = {
      ...projectData,
      timestamp: Date.now(),
      version: "1.0",
      exportedBy: "SayWaht Editor",
    };

    // Create JSON blob
    const projectDataBlob = new Blob(
      [JSON.stringify(exportData, null, 2)], 
      { type: 'application/json' }
    );
    
    // Generate filename from project name
    const sanitizedName = projectData.project?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "project";
    const filename = `${sanitizedName}_project_${Date.now()}.json`;
    
    const projectFile = new File(
      [projectDataBlob], 
      filename,
      { type: 'application/json' }
    );

    // Upload with Grove preference for decentralized storage
    return this.uploadFile(projectFile, {
      preferredProvider: "grove",
      allowFallback: true,
      ...options,
    });
  }

  /**
   * Archive exported video + captions to decentralized storage.
   * Uses Grove/Storacha by default; FilCDN is optional fallback when configured.
   */
  async archiveExportToFilecoin(params: {
    projectName: string;
    videoBlob: Blob;
    outputExt?: string;
    captions?: CaptionTranscriptEntry[];
    metadata?: Record<string, any>;
  }): Promise<FilecoinArchiveResult> {
    const timestamp = Date.now();
    const baseName = slugifyFileBasename(params.projectName);
    const outputExt = params.outputExt || "mp4";

    const videoFile = new File(
      [params.videoBlob],
      `${baseName}_${timestamp}.${outputExt}`,
      { type: params.videoBlob.type || `video/${outputExt}` }
    );

    const video = await this.uploadFile(videoFile, {
      preferredProvider: this.getBestProviderForFile(videoFile),
      allowFallback: true,
      optimize: false,
      maxRetries: 2,
    });

    let transcript: UploadResult | undefined;
    if (params.captions && params.captions.length > 0) {
      const transcriptPayload = {
        projectName: params.projectName,
        createdAt: new Date(timestamp).toISOString(),
        captions: params.captions,
        metadata: params.metadata || {},
      };
      const transcriptFile = new File(
        [JSON.stringify(transcriptPayload, null, 2)],
        `${baseName}_captions_${timestamp}.json`,
        { type: "application/json" }
      );

      transcript = await this.uploadFile(transcriptFile, {
        preferredProvider: "grove",
        allowFallback: true,
        optimize: false,
        maxRetries: 2,
      });
    }

    const manifestPayload = {
      version: "1.0",
      type: "saywaht-filecoin-export",
      projectName: params.projectName,
      createdAt: new Date(timestamp).toISOString(),
      assets: {
        video: {
          url: video.url,
          cid: extractCid(video),
          sizeMB: video.size,
        },
        transcript: transcript
          ? {
              url: transcript.url,
              cid: extractCid(transcript),
              sizeMB: transcript.size,
            }
          : null,
      },
      metadata: params.metadata || {},
    };

    const manifestFile = new File(
      [JSON.stringify(manifestPayload, null, 2)],
      `${baseName}_manifest_${timestamp}.json`,
      { type: "application/json" }
    );

    const manifest = await this.uploadFile(manifestFile, {
      preferredProvider: "grove",
      allowFallback: true,
      optimize: false,
      maxRetries: 2,
    });

    return {
      video,
      transcript,
      manifest,
      retrieval: {
        videoUrl: video.url,
        videoCid: extractCid(video),
        transcriptUrl: transcript?.url,
        transcriptCid: transcript ? extractCid(transcript) : undefined,
        manifestUrl: manifest.url,
        manifestCid: extractCid(manifest),
      },
    };
  }
  
  /**
   * Fallback to another provider when the primary fails
   */
  private async fallbackUpload(
    file: File,
    failedProvider: StorageProvider,
    reason: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    // Determine fallback provider
    let fallbackProvider: StorageProvider;
    
    if (failedProvider === "grove") {
      fallbackProvider = "storacha";
    } else if (failedProvider === "storacha") {
      const filcdnStatus = await isFilCDNConfigured();
      fallbackProvider = filcdnStatus.configured ? "filcdn" : "grove";
    } else if (failedProvider === "filcdn") {
      fallbackProvider = "grove";
    } else {
      throw createStorageError(
        `No fallback available for ${failedProvider}`,
        StorageErrorType.UNKNOWN,
        failedProvider,
        false
      );
    }
    
    console.log(
      `Falling back from ${failedProvider} to ${fallbackProvider}: ${reason}`
    );
    
    // Notify user of fallback if callback provided
    if (options.onProviderFallback) {
      const shouldContinue = await options.onProviderFallback(
        failedProvider,
        fallbackProvider,
        reason
      );
      
      if (!shouldContinue) {
        throw createStorageError(
          `Upload cancelled during fallback from ${failedProvider} to ${fallbackProvider}`,
          StorageErrorType.UNKNOWN,
          failedProvider,
          false
        );
      }
    }
    
    // Try upload with fallback provider
    return this.uploadFile(file, {
      ...options,
      preferredProvider: fallbackProvider,
      allowFallback: false, // Prevent infinite fallback loops
    });
  }
  
  /**
   * Get a user-friendly error message for storage errors
   */
  getErrorMessage(error: StorageError): string {
    switch (error.type) {
      case StorageErrorType.SIZE_EXCEEDED:
        return `File too large for ${error.provider}. Please reduce file size or use a different storage option.`;
        
      case StorageErrorType.RATE_LIMIT:
        return `Rate limit exceeded for ${error.provider}. Please try again later.`;
        
      case StorageErrorType.NETWORK:
        return `Network error with ${error.provider}. Please check your connection and try again.`;
        
      case StorageErrorType.AUTHENTICATION:
        return `Authentication error with ${error.provider}. Please check your credentials.`;
        
      case StorageErrorType.UNSUPPORTED_FORMAT:
        return `Unsupported file format or storage provider.`;
        
      default:
        return `Error uploading to ${error.provider}: ${error.message}`;
    }
  }
  
  /**
   * Estimate if a file can be uploaded to a provider
   */
  canUploadToProvider(
    fileSize: number,
    provider: StorageProvider
  ): { allowed: boolean; limit: number } {
    const sizeMB = fileSize / (1024 * 1024);
    const limit = STORAGE_LIMITS[provider];
    
    return {
      allowed: limit === 0 || sizeMB <= limit,
      limit,
    };
  }
  
  /**
   * Get the best provider for a file based on size
   */
  getBestProviderForFile(file: File): StorageProvider {
    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB <= STORAGE_LIMITS.grove) {
      return "grove";
    }

    if (sizeMB <= STORAGE_LIMITS.storacha) {
      return "storacha";
    }

    // If file is too large for all providers, return the one with highest limit
    const providers = Object.entries(STORAGE_LIMITS)
      .filter(([_, limit]) => limit > 0)
      .sort(([_, limitA], [__, limitB]) => limitB - limitA);

    return (providers[0]?.[0] as StorageProvider) || "local";
  }
}

// Export singleton instance
export const storageManager = new StorageManager();
