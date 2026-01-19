/**
 * Export Validator - CONSOLIDATION of pre-export checks
 * 
 * Validates project before export to catch issues early:
 * - Detects empty frames/gaps
 * - Verifies media availability
 * - Warns about potential issues
 * 
 * ENHANCEMENT FIRST: Consolidates validation logic in one place
 */

import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

export interface ExportValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * CONSOLIDATION: Validate project before export
 */
export function validateExportProject(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number
): ExportValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check: No tracks
  const activeTracks = tracks.filter(t => !t.muted && t.clips.length > 0);
  if (activeTracks.length === 0) {
    errors.push('No video content to export. Add clips to a track.');
    return { isValid: false, warnings, errors };
  }

  // Check: Missing media files
  const usedMediaIds = new Set<string>();
  for (const track of tracks) {
    for (const clip of track.clips) {
      usedMediaIds.add(clip.mediaId);
    }
  }

  const missingMedia = Array.from(usedMediaIds).filter(id => 
    !mediaItems.find(item => item.id === id)
  );

  if (missingMedia.length > 0) {
    errors.push(`${missingMedia.length} media file(s) are missing and cannot be exported.`);
  }

  // Check: Very short duration
  if (totalDuration < 0.1) {
    errors.push('Video is too short (less than 0.1 seconds). Add more content.');
  }

  // Check: Detect gaps in timeline (frames with no content)
  const timelineMap = new Map<number, boolean>();
  const frameRate = 30;
  const totalFrames = Math.ceil(totalDuration * frameRate);

  for (const track of tracks) {
    if (track.muted) continue;
    
    for (const clip of track.clips) {
      const startFrame = Math.floor(clip.startTime * frameRate);
      const endFrame = Math.ceil((clip.startTime + clip.duration) * frameRate);
      
      for (let f = startFrame; f < endFrame && f < totalFrames; f++) {
        timelineMap.set(f, true);
      }
    }
  }

  const emptyFrames = totalFrames - timelineMap.size;
  const emptyPercent = (emptyFrames / totalFrames) * 100;

  if (emptyPercent > 50) {
    warnings.push(`Timeline has ${Math.round(emptyPercent)}% empty frames. Video will show black during gaps.`);
  } else if (emptyPercent > 10) {
    warnings.push(`Timeline has ${Math.round(emptyPercent)}% empty frames.`);
  }

  // Check: Very large number of clips (performance warning)
  const totalClips = tracks.reduce((sum, t) => sum + t.clips.length, 0);
  if (totalClips > 100) {
    warnings.push(`Project has ${totalClips} clips. Export may be slow.`);
  }

  // Check: High quality + long duration
  if (totalDuration > 300) { // 5+ minutes
    warnings.push('Video is very long. Export may take a considerable amount of time.');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * MODULAR: Format validation messages for UI
 */
export function formatValidationMessages(result: ExportValidationResult): {
  error?: string;
  warning?: string;
} {
  return {
    error: result.errors.length > 0 ? result.errors[0] : undefined,
    warning: result.warnings.length > 0 ? result.warnings[0] : undefined
  };
}
