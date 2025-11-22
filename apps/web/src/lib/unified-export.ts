import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { FORMAT_DIMENSIONS, VideoFormat, getQualityBitrate } from "./video-utils";
import { exportVideo } from "./canvas-export-utils";

/**
 * Unified Export System
 * 
 * A single, reliable export pipeline that eliminates audio/video sync issues,
 * frame dropping, and black frames by using offline rendering techniques.
 */

export interface UnifiedExportOptions {
  format: VideoFormat;
  quality: "low" | "medium" | "high";
  includeAudio: boolean;
  outputFormat: 'mp4' | 'webm';
  frameRate: number;
  videoBitrate?: number;
  audioBitrate?: number;
  maxFileSizeMB?: number;
  onSizeEstimate?: (estimatedSizeMB: number, maxSizeMB: number) => Promise<boolean>;
}

export interface ExportProgress {
  phase: 'initializing' | 'preloading' | 'extracting' | 'audio' | 'frames' | 'encoding' | 'finalizing';
  percentage: number;
  message: string;
}

/**
 * Estimate the file size of an export based on video parameters
 */
export function estimateExportFileSize(
  durationSeconds: number,
  width: number,
  height: number,
  videoBitrate: number,
  audioBitrate: number,
  includeAudio: boolean
): number {
  // Video size calculation
  const videoSizeBytes = (videoBitrate * durationSeconds) / 8;
  
  // Audio size calculation
  const audioSizeBytes = includeAudio ? (audioBitrate * durationSeconds) / 8 : 0;
  
  // Container overhead (approximately 5-10% for MP4/WebM)
  const containerOverhead = 1.08;
  
  // Total size in MB
  const totalSizeMB = ((videoSizeBytes + audioSizeBytes) * containerOverhead) / (1024 * 1024);
  
  return totalSizeMB;
}

/**
 * Adjust export settings to target a specific file size
 */
export function adjustSettingsForFileSize(
  options: UnifiedExportOptions,
  totalDuration: number,
  targetSizeMB: number
): UnifiedExportOptions {
  const dimensions = FORMAT_DIMENSIONS[options.format];
  let { frameRate, videoBitrate, audioBitrate } = options;
  
  // Start with current settings
  let currentEstimate = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    videoBitrate || getQualityBitrate(options.quality),
    audioBitrate || 192000,
    options.includeAudio
  );
  
  // If already under target size, return unchanged
  if (currentEstimate <= targetSizeMB) {
    return options;
  }
  
  // Create adjusted options
  const adjustedOptions = { ...options };
  
  // Reduce quality first
  if (adjustedOptions.quality === "high") {
    adjustedOptions.quality = "medium";
    adjustedOptions.videoBitrate = getQualityBitrate("medium");
  } else if (adjustedOptions.quality === "medium") {
    adjustedOptions.quality = "low";
    adjustedOptions.videoBitrate = getQualityBitrate("low");
  }
  
  // Check if quality reduction is enough
  currentEstimate = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    adjustedOptions.videoBitrate || getQualityBitrate(adjustedOptions.quality),
    adjustedOptions.audioBitrate || 192000,
    adjustedOptions.includeAudio
  );
  
  if (currentEstimate <= targetSizeMB) {
    return adjustedOptions;
  }
  
  // If still too large, reduce frame rate
  if (adjustedOptions.frameRate && adjustedOptions.frameRate > 24) {
    adjustedOptions.frameRate = 24;
  }
  
  // Final check
  currentEstimate = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    adjustedOptions.videoBitrate || getQualityBitrate(adjustedOptions.quality),
    adjustedOptions.audioBitrate || 192000,
    adjustedOptions.includeAudio
  );
  
  if (currentEstimate <= targetSizeMB) {
    return adjustedOptions;
  }
  
  return adjustedOptions;
}

/**
 * Main unified export function
 * Now uses intelligent export method selection with backend export prioritized for Zora coin deployment
 */
export async function unifiedExport(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: ExportProgress) => void,
  options: Partial<UnifiedExportOptions> = {}
): Promise<Blob> {
  console.log("🪙 Starting Zora coin export with intelligent method selection...");

  // Determine default max size based on storage provider availability
  async function getDefaultMaxSize(): Promise<number> {
    try {
      const hasFilcdnMedia = mediaItems.some(m => m.isFilCDN);
      if (hasFilcdnMedia) return 254; // MiB
      const res = await fetch('/api/filecoin/status');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.allowanceSufficient) return 254;
      }
      return 8;
    } catch {
      return 8;
    }
  }

  // Convert UnifiedExportOptions to ExportOptions for our smart export system
  const exportOptions = {
    format: options.format || "portrait",
    quality: options.quality || "medium",
    includeAudio: options.includeAudio !== false,
    outputFormat: options.outputFormat || "mp4",
    frameRate: options.frameRate || 30,
    videoBitrate: options.videoBitrate || getQualityBitrate(options.quality || "medium"),
    audioBitrate: options.audioBitrate || 192000,
    method: "auto" as const, // Use intelligent method selection
    maxFileSizeMB: options.maxFileSizeMB || await getDefaultMaxSize()
  };
  
  // Convert progress callback to simple percentage for our export system
  const progressCallback = (percentage: number) => {
    const phase = percentage < 10 ? 'initializing' :
                  percentage < 30 ? 'preloading' :
                  percentage < 50 ? 'extracting' :
                  percentage < 70 ? 'encoding' :
                  percentage < 90 ? 'finalizing' : 'finalizing';

    onProgress({
      phase,
      percentage,
      message: `${phase.charAt(0).toUpperCase() + phase.slice(1)}... ${Math.round(percentage)}%`
    });
  };

  try {
    console.log("🎬 Using intelligent export method selection for Zora coin...");

    // Use our smart export system which will automatically choose the best method
    // Backend export will be prioritized for Zora coin deployment
    const blob = await exportVideo(
      tracks,
      mediaItems,
      totalDuration,
      progressCallback,
      exportOptions
    );

    console.log(`✅ Zora coin export completed: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    return blob;
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

/**
 * Calculate optimal export settings for a given file size limit
 */
export function calculateOptimalExportSettings(
  format: VideoFormat,
  totalDuration: number,
  maxSizeMB: number
): {
  feasible: boolean;
  estimatedSize: number;
  recommendedSettings?: UnifiedExportOptions;
  message: string;
} {
  // Start with high quality settings
  const highQualityOptions: UnifiedExportOptions = {
    format,
    quality: "high",
    includeAudio: true,
    outputFormat: "mp4",
    frameRate: 30,
    videoBitrate: getQualityBitrate("high"),
    audioBitrate: 192000
  };

  const dimensions = FORMAT_DIMENSIONS[format];
  
  // Estimate size with high quality settings
  const estimatedSize = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    highQualityOptions.videoBitrate!,
    highQualityOptions.audioBitrate!,
    true
  );
  
  // If high quality is feasible, return that
  if (estimatedSize <= maxSizeMB) {
    return {
      feasible: true,
      estimatedSize,
      recommendedSettings: highQualityOptions,
      message: `High quality export estimated at ${estimatedSize.toFixed(2)}MB (under ${maxSizeMB}MB limit)`
    };
  }
  
  // Try to adjust settings to fit within size limit
  const adjustedOptions = adjustSettingsForFileSize(
    highQualityOptions,
    totalDuration,
    maxSizeMB * 0.95 // Target 95% of max to be safe
  );
  
  const adjustedSize = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    adjustedOptions.videoBitrate || getQualityBitrate(adjustedOptions.quality),
    adjustedOptions.audioBitrate || 192000,
    adjustedOptions.includeAudio
  );
  
  // If adjusted settings are feasible, return those
  if (adjustedSize <= maxSizeMB) {
    return {
      feasible: true,
      estimatedSize: adjustedSize,
      recommendedSettings: adjustedOptions,
      message: `Adjusted quality settings to fit within ${maxSizeMB}MB limit (estimated: ${adjustedSize.toFixed(2)}MB)`
    };
  }
  
  // If even with lowest settings it's not feasible
  return {
    feasible: false,
    estimatedSize,
    message: `Video too long or complex for ${maxSizeMB}MB limit. Consider trimming content or using alternative storage.`
  };
}

/**
 * Check if a video can be exported within size constraints
 */
export async function checkExportFeasibility(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  maxSizeMB: number,
  format: VideoFormat = "portrait"
): Promise<{
  feasible: boolean;
  estimatedSize: number;
  recommendedSettings?: UnifiedExportOptions;
  message: string;
}> {
  return calculateOptimalExportSettings(format, totalDuration, maxSizeMB);
}
