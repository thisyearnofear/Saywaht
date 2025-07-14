/**
 * WebCodecs Integration Module
 * 
 * Helper functions to integrate WebCodecs export with existing components
 * Provides seamless upgrades without breaking existing functionality
 */

import { generateWebCodecsTestReport, getWebCodecsStatus } from './webcodecs-test';
import { exportVideo } from './canvas-export-utils';
import { TimelineTrack } from '@/stores/timeline-store';
import { MediaItem } from '@/stores/media-store';

/**
 * Enhanced export function that automatically uses WebCodecs when available
 * Drop-in replacement for existing exportVideo calls
 */
export async function exportVideoEnhanced(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: {
    format: "landscape" | "portrait" | "square";
    quality: "low" | "medium" | "high";
    includeAudio?: boolean;
    outputFormat?: 'mp4' | 'webm';
    method?: "canvas" | "offline" | "webcodecs" | "auto";
  } = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    outputFormat: 'mp4',
    method: "auto"
  }
): Promise<{ blob: Blob; exportMethod: string; stats: any }> {
  const startTime = performance.now();
  
  // Check WebCodecs status
  const webCodecsStatus = getWebCodecsStatus();
  console.log('🔍 WebCodecs status:', webCodecsStatus);
  
  // Export with method detection
  const blob = await exportVideo(tracks, mediaItems, totalDuration, onProgress, options);
  
  const endTime = performance.now();
  const exportDuration = (endTime - startTime) / 1000;
  
  // Determine which method was actually used
  let exportMethod = 'unknown';
  if (options.method === 'auto') {
    if (webCodecsStatus.ready && webCodecsStatus.recommendation === 'use') {
      exportMethod = 'webcodecs';
    } else {
      exportMethod = 'offline';
    }
  } else {
    exportMethod = options.method || 'canvas';
  }
  
  const stats = {
    duration: exportDuration,
    size: blob.size,
    speedMultiplier: totalDuration / exportDuration,
    method: exportMethod,
    webCodecsAvailable: webCodecsStatus.ready
  };
  
  console.log('📊 Export completed:', stats);
  
  return { blob, exportMethod, stats };
}

/**
 * Test WebCodecs functionality and generate report
 * Useful for debugging and performance analysis
 */
export async function runWebCodecsTest(): Promise<string> {
  console.log('🧪 Running WebCodecs integration test...');
  return await generateWebCodecsTestReport();
}

/**
 * Get recommended export settings based on project complexity and browser support
 */
export function getRecommendedExportSettings(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number
): {
  method: "canvas" | "offline" | "webcodecs" | "auto";
  quality: "low" | "medium" | "high";
  outputFormat: 'mp4' | 'webm';
  frameRate: number;
  reason: string;
} {
  const webCodecsStatus = getWebCodecsStatus();
  
  // Calculate project complexity
  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  const hasVideo = mediaItems.some(item => item.type === 'video');
  const hasAudio = mediaItems.some(item => item.type === 'audio' || item.type === 'video');
  
  // Determine optimal settings
  if (webCodecsStatus.ready && (hasVideo || totalClips > 3 || totalDuration > 30)) {
    return {
      method: 'webcodecs',
      quality: 'high',
      outputFormat: 'mp4',
      frameRate: 30,
      reason: 'WebCodecs available for optimal performance with complex project'
    };
  }
  
  if (hasVideo && totalDuration > 60) {
    return {
      method: 'offline',
      quality: 'medium',
      outputFormat: 'mp4',
      frameRate: 30,
      reason: 'Long video project requires offline rendering for stability'
    };
  }
  
  if (hasVideo || totalClips > 5) {
    return {
      method: 'offline',
      quality: 'medium',
      outputFormat: 'mp4',
      frameRate: 30,
      reason: 'Video content or complex timeline requires offline rendering'
    };
  }
  
  return {
    method: 'canvas',
    quality: 'medium',
    outputFormat: 'webm',
    frameRate: 30,
    reason: 'Simple project suitable for canvas export'
  };
}

/**
 * Progress handler that provides more detailed feedback
 */
export function createEnhancedProgressHandler(
  onProgress: (progress: number) => void,
  onPhaseChange?: (phase: string, message: string) => void
): (progress: number) => void {
  return (progress: number) => {
    // Determine phase based on progress
    let phase = 'initializing';
    let message = 'Preparing export...';
    
    if (progress < 5) {
      phase = 'initializing';
      message = 'Initializing export system...';
    } else if (progress < 15) {
      phase = 'loading';
      message = 'Loading media assets...';
    } else if (progress < 40) {
      phase = 'extracting';
      message = 'Extracting video frames...';
    } else if (progress < 70) {
      phase = 'composing';
      message = 'Composing timeline frames...';
    } else if (progress < 80) {
      phase = 'audio';
      message = 'Processing audio tracks...';
    } else if (progress < 95) {
      phase = 'encoding';
      message = 'Encoding final video...';
    } else {
      phase = 'finalizing';
      message = 'Finalizing export...';
    }
    
    onProgress(progress);
    onPhaseChange?.(phase, message);
  };
}

/**
 * Validate export parameters before starting
 */
export function validateExportParameters(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  options: any
): { valid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check basic requirements
  if (!tracks || tracks.length === 0) {
    issues.push('No tracks provided for export');
  }
  
  if (!mediaItems || mediaItems.length === 0) {
    issues.push('No media items provided for export');
  }
  
  if (totalDuration <= 0) {
    issues.push('Invalid duration: must be greater than 0');
  }
  
  // Check for missing media
  const referencedMediaIds = new Set(
    tracks.flatMap(track => track.clips.map(clip => clip.mediaId))
  );
  
  const availableMediaIds = new Set(mediaItems.map(item => item.id));
  
  for (const mediaId of referencedMediaIds) {
    if (!availableMediaIds.has(mediaId)) {
      issues.push(`Missing media item: ${mediaId}`);
    }
  }
  
  // Performance warnings
  if (totalDuration > 300) { // 5 minutes
    warnings.push('Long video duration may result in slow export');
  }
  
  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  if (totalClips > 20) {
    warnings.push('High clip count may impact performance');
  }
  
  // WebCodecs specific checks
  if (options.method === 'webcodecs') {
    const webCodecsStatus = getWebCodecsStatus();
    if (!webCodecsStatus.ready) {
      issues.push('WebCodecs not supported but method set to webcodecs');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Export with automatic retry on failure
 */
export async function exportVideoWithRetry(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: any,
  maxRetries: number = 2
): Promise<{ blob: Blob; exportMethod: string; stats: any; attempts: number }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔄 Export attempt ${attempt}/${maxRetries + 1}`);
      
      // Modify options for retry attempts
      const retryOptions = { ...options };
      
      if (attempt === 2) {
        // Second attempt: fallback to offline method
        retryOptions.method = 'offline';
        console.log('⚠️ Falling back to offline export method');
      } else if (attempt === 3) {
        // Third attempt: fallback to canvas method
        retryOptions.method = 'canvas';
        console.log('⚠️ Falling back to canvas export method');
      }
      
      const result = await exportVideoEnhanced(
        tracks,
        mediaItems,
        totalDuration,
        onProgress,
        retryOptions
      );
      
      return { ...result, attempts: attempt };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Export attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries + 1) {
        throw new Error(`Export failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
}