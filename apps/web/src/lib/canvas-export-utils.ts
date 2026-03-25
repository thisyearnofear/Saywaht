/**
 * ENHANCED EXPORT SYSTEM
 * Consolidated export functionality following CLEAN and DRY principles
 * ENHANCEMENT FIRST: Improved existing export with consolidated features
 */

import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { exportVideoTrueOffline } from "./optimized-export";
import { VideoFormat, getVideoBitrate } from "./video-utils";
import { exportVideoBackend, isBackendExportAvailable } from "./backend-export";
import { getExportRuntimeConfig } from "./export-runtime-config";
import { getExportErrorMessage } from "./export-error-handler";
import { startExportDiagnostics, updateExportProgress, finishExportDiagnostics } from "./monitoring";

// CLEAN: Simplified export methods (removed unreliable WebCodecs)
export type ExportMethod = "backend" | "offline" | "auto";
export type { VideoFormat };

export interface ExportOptions {
  format: VideoFormat;
  quality: "low" | "medium" | "high";
  includeAudio?: boolean;
  method?: ExportMethod;
  outputFormat?: 'mp4' | 'webm';
  frameRate?: number;
  videoBitrate?: number;
  audioBitrate?: number;
  maxFileSizeMB?: number;
  timeout?: number;
}

// CONSOLIDATION: Export configuration (from deleted export-config.ts)
interface ExportConfig {
  outputFormat: 'mp4' | 'webm';
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
}

function getExportConfig(options: ExportOptions): ExportConfig {
  return {
    outputFormat: options.outputFormat || 'mp4',
    frameRate: options.frameRate || 30,
    videoBitrate: options.videoBitrate || getVideoBitrate(options.quality || 'medium'),
    audioBitrate: options.audioBitrate || 192000
  };
}

// CONSOLIDATION: Content complexity analysis (from deleted export-method-selector.ts)
interface ContentComplexity {
  score: number;
  hasVideo: boolean;
  hasAudio: boolean;
  hasMultipleTracks: boolean;
  totalClips: number;
  reason: string;
}

function analyzeContentComplexity(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number
): ContentComplexity {
  const videoTracks = tracks.filter(track =>
    track.clips.some(clip => {
      const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
      return mediaItem?.type === "video";
    })
  );

  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  const hasVideo = videoTracks.length > 0;
  const hasAudio = tracks.some(track => !track.muted);
  const hasMultipleTracks = tracks.length > 2;

  let score = 0;
  let reasons: string[] = [];

  if (hasVideo) {
    score += 0.4;
    reasons.push("video content");
  }

  if (hasAudio) {
    score += 0.2;
    reasons.push("audio tracks");
  }

  if (hasMultipleTracks) {
    score += 0.2;
    reasons.push("multiple tracks");
  }

  if (totalClips > 5) {
    score += 0.2;
    reasons.push(`${totalClips} clips`);
  }

  return {
    score: Math.min(score, 1),
    hasVideo,
    hasAudio,
    hasMultipleTracks,
    totalClips,
    reason: reasons.join(", ")
  };
}

// CONSOLIDATION: Method selection logic (simplified from deleted files)
async function selectExportMethod(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  options: ExportOptions
): Promise<ExportMethod> {
  if (options.method && options.method !== "auto") {
    return options.method;
  }

  const complexity = analyzeContentComplexity(tracks, mediaItems, totalDuration);
  const runtimeConfig = getExportRuntimeConfig({
    tracks,
    mediaItems,
    totalDuration,
    surface: "download",
  });

  if (!runtimeConfig.backendCompatible) {
    console.info("Falling back to offline export because backend compatibility checks failed.", {
      reason: runtimeConfig.backendCompatibilityReason,
    });
    return "offline";
  }

  // Check if backend is available
  try {
    const backendAvailable = await isBackendExportAvailable();

    if (backendAvailable) {
      // Use backend for complex content or high quality
      if (complexity.score > 0.5 || options.quality === "high" || totalDuration > 60) {
        return "backend";
      }
    }
  } catch {
    // Backend unavailable, use offline
  }

  return "offline";
}

// CONSOLIDATION: Simple retry logic (from deleted export-retry-system.ts)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        console.warn(`Export attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * ENHANCED: Main export function with consolidated functionality
 * CLEAN: Simplified to 2 reliable methods with automatic fallback
 */
export const exportVideo = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: ExportOptions = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    method: "auto",
    outputFormat: "mp4"
  }
): Promise<Blob> => {
  const runtimeConfig = getExportRuntimeConfig({
    tracks,
    mediaItems,
    totalDuration,
    surface: "download",
  });

  // CONSOLIDATION: Start diagnostics tracking
  const contentInfo = {
    tracks: tracks.length,
    clips: tracks.reduce((sum, track) => sum + track.clips.length, 0),
    hasVideo: tracks.some(track =>
      track.clips.some(clip => {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        return mediaItem?.type === "video";
      })
    ),
    hasAudio: tracks.some(track => !track.muted),
    totalDuration
  };

  // Select export method
  const method = await selectExportMethod(tracks, mediaItems, totalDuration, options);

  startExportDiagnostics(method, contentInfo);

  // Enhanced progress tracking
  const trackedProgress = (progress: number) => {
    updateExportProgress(progress);
    onProgress(progress);
  };

  try {
    let result: Blob;

    if (method === "backend") {
      // ENHANCEMENT: Backend export with automatic fallback
      try {
        result = await withRetry(async () => {
          const backendResult = await exportVideoBackend(
            tracks,
            mediaItems,
            totalDuration,
            trackedProgress,
            {
              ...options,
              maxFileSizeMB: options.maxFileSizeMB ?? 100,
              timeout: options.timeout ?? runtimeConfig.backendTimeoutMs
            }
          );
          return backendResult.blob;
        });
      } catch (backendError) {
        console.warn("Backend export failed, falling back to offline:", backendError);
        trackedProgress(0); // Reset progress
        result = await exportVideoTrueOffline(
          tracks,
          mediaItems,
          totalDuration,
          trackedProgress,
          options
        );
      }
    } else {
      // Offline export
      result = await withRetry(async () => {
        return await exportVideoTrueOffline(
          tracks,
          mediaItems,
          totalDuration,
          trackedProgress,
          options
        );
      });
    }

    // CONSOLIDATION: Track successful export
    finishExportDiagnostics(true);
    return result;

  } catch (error) {
    // CONSOLIDATION: Track failed export with enhanced error handling
    const errorMessage = getExportErrorMessage(error);
    finishExportDiagnostics(false, errorMessage);
    throw error;
  }
};

/**
 * CAPTURE: Grabs the current frame from the preview canvas
 */
export const captureFrameAsBlob = async (
  quality = 0.8
): Promise<Blob> => {
  // Find the preview canvas in the DOM
  const canvas = document.querySelector('canvas[data-preview="true"]') as HTMLCanvasElement;
  if (!canvas) {
    // Fallback: search for any visible canvas in the preview area
    const anyCanvas = document.querySelector('.preview-container canvas') as HTMLCanvasElement;
    if (anyCanvas) return new Promise(resolve => anyCanvas.toBlob(b => resolve(b!), 'image/jpeg', quality));
    throw new Error("Preview canvas not found");
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to capture frame"));
    }, 'image/jpeg', quality);
  });
};
