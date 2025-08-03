import { useState, useEffect, useCallback } from "@/lib/hooks-provider";
import { TimelineClip, TimelineTrack } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { snapTimeToFrame } from "@/constants/timeline-constants";

interface ResizeState {
  clipId: string;
  side: "left" | "right";
  startX: number;
  initialTrimStart: number;
  initialTrimEnd: number;
}

interface UseTimelineClipResizeProps {
  clip: TimelineClip;
  track: TimelineTrack;
  zoomLevel: number;
  onUpdateTrim?: (
    trackId: string,
    clipId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
}

export function useTimelineClipResize({
  clip,
  track,
  zoomLevel,
  onUpdateTrim,
}: UseTimelineClipResizeProps) {
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const { mediaItems } = useMediaStore();
  const { updateClipTrim, pushHistory } = useTimelineStore();

  const handleResizeStart = (
    e: React.MouseEvent,
    clipId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // Push history once at the start of the resize operation
    pushHistory();

    setResizing({
      clipId,
      side,
      startX: e.clientX,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
    });
  };

  const canExtendClipDuration = useCallback(() => {
    // Check if this is a media clip and what type of media it is
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
    if (!mediaItem) return false;

    // Images can be extended (static content)
    if (mediaItem.type === "image") {
      return true;
    }

    // Videos and audio cannot be extended beyond their natural duration
    // (no additional content exists)
    return false;
  }, [mediaItems, clip.mediaId]);

  const updateTrimFromMouseMove = useCallback((e: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizing.startX;
    // Reasonable sensitivity for resize operations - similar to timeline scale
    const deltaTime = deltaX / (50 * zoomLevel);

    // Default FPS for frame snapping (you can make this configurable later)
    const projectFps = 30;

    if (resizing.side === "left") {
      // Left resize - adjust trimStart and startTime
      const maxAllowed = clip.duration - resizing.initialTrimEnd - 0.1;
      const calculated = resizing.initialTrimStart + deltaTime;

      if (calculated >= 0) {
        // Normal trimming within available content
        const newTrimStart = snapTimeToFrame(
          Math.min(maxAllowed, calculated),
          projectFps
        );
        const trimDelta = newTrimStart - resizing.initialTrimStart;
        
        // Update trim
        const finalTrimEnd = resizing.initialTrimEnd;
        if (onUpdateTrim) {
          onUpdateTrim(track.id, clip.id, newTrimStart, finalTrimEnd);
        } else {
          updateClipTrim(track.id, clip.id, newTrimStart, finalTrimEnd);
        }
      } else {
        // Trying to extend beyond trimStart = 0
        if (canExtendClipDuration()) {
          // For images: we could extend duration, but for now just limit to trimStart = 0
          const newTrimStart = 0;
          if (onUpdateTrim) {
            onUpdateTrim(track.id, clip.id, newTrimStart, resizing.initialTrimEnd);
          } else {
            updateClipTrim(track.id, clip.id, newTrimStart, resizing.initialTrimEnd);
          }
        } else {
          // Video/Audio: can't extend beyond original content - limit to trimStart = 0
          const newTrimStart = 0;
          if (onUpdateTrim) {
            onUpdateTrim(track.id, clip.id, newTrimStart, resizing.initialTrimEnd);
          } else {
            updateClipTrim(track.id, clip.id, newTrimStart, resizing.initialTrimEnd);
          }
        }
      }
    } else {
      // Right resize - adjust trimEnd
      const calculated = resizing.initialTrimEnd - deltaTime;

      if (calculated < 0) {
        // We're trying to extend beyond original duration
        if (canExtendClipDuration()) {
          // For images, we could extend duration, but for now just set trimEnd to 0
          const newTrimEnd = 0;
          if (onUpdateTrim) {
            onUpdateTrim(track.id, clip.id, resizing.initialTrimStart, newTrimEnd);
          } else {
            updateClipTrim(track.id, clip.id, resizing.initialTrimStart, newTrimEnd);
          }
        } else {
          // Can't extend - just set trimEnd to 0 (maximum possible extension)
          const newTrimEnd = 0;
          if (onUpdateTrim) {
            onUpdateTrim(track.id, clip.id, resizing.initialTrimStart, newTrimEnd);
          } else {
            updateClipTrim(track.id, clip.id, resizing.initialTrimStart, newTrimEnd);
          }
        }
      } else {
        // Normal trimming within original duration
        const newTrimEnd = snapTimeToFrame(calculated, projectFps);
        
        // Ensure we don't trim more than available content (leave at least 0.1s visible)
        const maxTrimEnd = clip.duration - clip.trimStart - 0.1;
        const finalTrimEnd = Math.min(maxTrimEnd, Math.max(0, newTrimEnd));

        if (onUpdateTrim) {
          onUpdateTrim(track.id, clip.id, clip.trimStart, finalTrimEnd);
        } else {
          updateClipTrim(track.id, clip.id, clip.trimStart, finalTrimEnd);
        }
      }
    }
  }, [
    resizing,
    zoomLevel,
    clip,
    track,
    canExtendClipDuration,
    onUpdateTrim,
    updateClipTrim,
  ]);

  // Set up document-level mouse listeners during resize (like proper drag behavior)
  useEffect(() => {
    if (!resizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      updateTrimFromMouseMove({ clientX: e.clientX });
    };

    const handleDocumentMouseUp = () => {
      handleResizeEnd();
    };

    // Add document-level listeners for proper drag behavior
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [resizing, updateTrimFromMouseMove]); // Re-run when resizing state changes

  const handleResizeEnd = () => {
    setResizing(null);
  };

  return {
    resizing,
    isResizing: resizing !== null,
    handleResizeStart,
    // Return empty handlers since we use document listeners now
    handleResizeMove: () => {}, // Not used anymore
    handleResizeEnd: () => {}, // Not used anymore
  };
}
