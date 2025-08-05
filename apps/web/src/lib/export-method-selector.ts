import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions } from "./canvas-export-utils";
import { detectWebCodecsSupport } from "./video-utils";

export interface ExportMethodInfo {
  method: "webcodecs" | "offline" | "canvas";
  reason: string;
  confidence: number; // 0-1, higher is better
}

/**
 * Intelligently selects the best export method based on:
 * - Browser capabilities
 * - Content complexity
 * - Previous failure history
 * - System performance
 */
export function selectBestExportMethod(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  options: ExportOptions,
  totalDuration: number
): ExportMethodInfo {
  // Check if we've had recent WebCodecs failures
  const recentFailures = getRecentWebCodecsFailures();
  const hasRecentFailures = recentFailures > 2;
  
  // Detect browser capabilities
  const webCodecsSupport = detectWebCodecsSupport();
  const hasFullWebCodecsSupport = webCodecsSupport.fullSupport && !hasRecentFailures;
  
  // Analyze content complexity
  const complexity = analyzeContentComplexity(tracks, mediaItems, totalDuration);
  
  // Check system performance
  const systemPerformance = checkSystemPerformance();
  
  // Decision matrix
  if (hasFullWebCodecsSupport && complexity.score < 0.7 && systemPerformance.isGood) {
    // WebCodecs is suitable for simpler content on capable systems
    return {
      method: "webcodecs",
      reason: "WebCodecs available with good system performance for moderate complexity content",
      confidence: 0.8 - (recentFailures * 0.1)
    };
  }
  
  if (complexity.hasVideo || complexity.hasMultipleTracks || totalDuration > 30) {
    // Offline export for complex projects
    return {
      method: "offline",
      reason: `Offline export selected for ${complexity.reason}`,
      confidence: 0.95
    };
  }
  
  // Canvas export for simple projects
  return {
    method: "canvas",
    reason: "Canvas export for simple, short content",
    confidence: 0.9
  };
}

interface ContentComplexity {
  score: number; // 0-1, higher is more complex
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
  
  const audioTracks = tracks.filter(track =>
    track.clips.some(clip => {
      const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
      return mediaItem?.type === "audio" || (mediaItem?.type === "video" && !track.muted);
    })
  );
  
  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  const hasMultipleTracks = tracks.length > 2;
  const hasVideo = videoTracks.length > 0;
  const hasAudio = audioTracks.length > 0;
  
  // Calculate complexity score
  let score = 0;
  let reasons: string[] = [];
  
  if (hasVideo) {
    score += 0.3;
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
  
  if (totalDuration > 60) {
    score += 0.1;
    reasons.push(`${Math.round(totalDuration)}s duration`);
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

interface SystemPerformance {
  isGood: boolean;
  memory: number;
  cores: number;
}

function checkSystemPerformance(): SystemPerformance {
  // Check available memory (if API is available)
  const memory = (navigator as any).deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 4;
  
  // Consider performance good if we have decent memory and cores
  const isGood = memory >= 4 && cores >= 4;
  
  return {
    isGood,
    memory,
    cores
  };
}

// Track WebCodecs failures in session storage
const FAILURE_KEY = "webcodecs_export_failures";
const FAILURE_WINDOW = 3600000; // 1 hour

export function recordWebCodecsFailure(): void {
  try {
    const failures = JSON.parse(sessionStorage.getItem(FAILURE_KEY) || "[]");
    failures.push(Date.now());
    
    // Keep only recent failures
    const recentFailures = failures.filter((time: number) => 
      Date.now() - time < FAILURE_WINDOW
    );
    
    sessionStorage.setItem(FAILURE_KEY, JSON.stringify(recentFailures));
  } catch (e) {
    console.warn("Could not record WebCodecs failure:", e);
  }
}

export function recordWebCodecsSuccess(): void {
  try {
    // Clear failures on success
    sessionStorage.removeItem(FAILURE_KEY);
  } catch (e) {
    console.warn("Could not clear WebCodecs failures:", e);
  }
}

function getRecentWebCodecsFailures(): number {
  try {
    const failures = JSON.parse(sessionStorage.getItem(FAILURE_KEY) || "[]");
    const recentFailures = failures.filter((time: number) => 
      Date.now() - time < FAILURE_WINDOW
    );
    return recentFailures.length;
  } catch (e) {
    return 0;
  }
}

/**
 * Get export method recommendation with detailed reasoning
 */
export function getExportMethodRecommendation(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  options: ExportOptions,
  totalDuration: number
): string {
  const methodInfo = selectBestExportMethod(tracks, mediaItems, options, totalDuration);
  const complexity = analyzeContentComplexity(tracks, mediaItems, totalDuration);
  const performance = checkSystemPerformance();
  
  let recommendation = `Export Method: ${methodInfo.method.toUpperCase()}\n`;
  recommendation += `Confidence: ${Math.round(methodInfo.confidence * 100)}%\n`;
  recommendation += `Reason: ${methodInfo.reason}\n\n`;
  
  recommendation += `Content Analysis:\n`;
  recommendation += `- Complexity Score: ${Math.round(complexity.score * 100)}%\n`;
  recommendation += `- Video Tracks: ${complexity.hasVideo ? "Yes" : "No"}\n`;
  recommendation += `- Audio Tracks: ${complexity.hasAudio ? "Yes" : "No"}\n`;
  recommendation += `- Total Clips: ${complexity.totalClips}\n`;
  recommendation += `- Duration: ${Math.round(totalDuration)}s\n\n`;
  
  recommendation += `System Performance:\n`;
  recommendation += `- Memory: ${performance.memory}GB\n`;
  recommendation += `- CPU Cores: ${performance.cores}\n`;
  recommendation += `- Performance: ${performance.isGood ? "Good" : "Limited"}\n`;
  
  return recommendation;
}