"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { Scissors, Trash2, MoreVertical, ArrowLeftRight } from "lucide-react";
import { useTimelineStore, type TimelineTrack } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { toast } from "sonner";

export function TimelineTrackContent({
  track,
  zoomLevel,
  setContextMenu,
  contextMenu,
  onDrop,
}: {
  track: TimelineTrack;
  zoomLevel: number;
  setContextMenu: (
    menu: {
      type: "track" | "clip";
      trackId: string;
      clipId?: string;
      x: number;
      y: number;
    } | null
  ) => void;
  contextMenu: {
    type: "track" | "clip";
    trackId: string;
    clipId?: string;
    x: number;
    y: number;
  } | null;
  onDrop: () => void;
}) {
  const { mediaItems } = useMediaStore();
  const {
    tracks,
    moveClipToTrack,
    updateClipTrim,
    updateClipStartTime,
    addClipToTrack,
    removeClipFromTrack,
    selectedClips,
    selectClip,
    deselectClip,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();
  const [isDropping, setIsDropping] = useState(false);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [wouldOverlap, setWouldOverlap] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);
  const [snapSourceClip, setSnapSourceClip] = useState<string | null>(null);
  const [timeIndicator, setTimeIndicator] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{
    clipId: string;
    side: "left" | "right";
    startX: number;
    initialTrimStart: number;
    initialTrimEnd: number;
  } | null>(null);
  const dragCounterRef = useRef(0);
  const [clipMenuOpen, setClipMenuOpen] = useState<string | null>(null);

  // Handle clip deletion
  const handleDeleteClip = (clipId: string) => {
    removeClipFromTrack(track.id, clipId);
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    clipId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    setResizing({
      clipId,
      side,
      startX: e.clientX,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
    });
  };

  const updateTrimFromMouseMove = (e: { clientX: number }) => {
    if (!resizing) return;

    const clip = track.clips.find((c) => c.id === resizing.clipId);
    if (!clip) return;

    const deltaX = e.clientX - resizing.startX;
    const deltaTime = deltaX / (50 * zoomLevel);

    if (resizing.side === "left") {
      const newTrimStart = Math.max(
        0,
        Math.min(
          clip.duration - clip.trimEnd - 0.1,
          resizing.initialTrimStart + deltaTime
        )
      );
      updateClipTrim(track.id, clip.id, newTrimStart, clip.trimEnd);
    } else {
      const newTrimEnd = Math.max(
        0,
        Math.min(
          clip.duration - clip.trimStart - 0.1,
          resizing.initialTrimEnd - deltaTime
        )
      );
      updateClipTrim(track.id, clip.id, clip.trimStart, newTrimEnd);
    }
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    updateTrimFromMouseMove(e);
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  const handleClipDragStart = (e: React.DragEvent, clip: any) => {
    const dragData = { clipId: clip.id, trackId: track.id, name: clip.name };

    e.dataTransfer.setData(
      "application/x-timeline-clip",
      JSON.stringify(dragData)
    );
    e.dataTransfer.effectAllowed = "move";

    // Add visual feedback to the dragged element
    const target = e.currentTarget.parentElement as HTMLElement;
    target.style.opacity = "0.5";
    target.style.transform = "scale(0.95)";
  };

  const handleClipDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    const target = e.currentTarget.parentElement as HTMLElement;
    target.style.opacity = "";
    target.style.transform = "";
  };

  // Find the nearest clip edge for snapping
  const findNearestClipEdge = (dropTime: number, movingClipId?: string) => {
    // Dynamic snap threshold based on zoom level
    // At higher zoom levels (more zoomed in), the threshold is smaller
    const snapThreshold = 0.2 / Math.max(0.5, Math.min(2, zoomLevel));
    let nearestEdge = null;
    let minDistance = snapThreshold;

    // Check all clips on this track for potential snap points
    track.clips.forEach((existingClip) => {
      // Skip the clip being moved
      if (movingClipId && existingClip.id === movingClipId) return;

      const clipStart = existingClip.startTime;
      const clipEnd =
        existingClip.startTime +
        (existingClip.duration - existingClip.trimStart - existingClip.trimEnd);

      // Check distance to start edge
      const distanceToStart = Math.abs(dropTime - clipStart);
      if (distanceToStart < minDistance) {
        minDistance = distanceToStart;
        nearestEdge = clipStart;
      }

      // Check distance to end edge
      const distanceToEnd = Math.abs(dropTime - clipEnd);
      if (distanceToEnd < minDistance) {
        minDistance = distanceToEnd;
        nearestEdge = clipEnd;
      }
    });

    return nearestEdge;
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Handle both timeline clips and media items
    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const { type } = JSON.parse(mediaItemData);
          const isCompatible =
            (track.type === "video" &&
              (type === "video" || type === "image")) ||
            (track.type === "audio" && type === "audio");

          if (!isCompatible) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
        }
      } catch (error) {}
    }

    // Calculate drop position for overlap checking
    const trackContainer = e.currentTarget.querySelector(
      ".track-clips-container"
    ) as HTMLElement;
    let dropTime = 0;
    if (trackContainer) {
      const rect = trackContainer.getBoundingClientRect();
      const mouseX = Math.max(0, e.clientX - rect.left);
      dropTime = mouseX / (50 * zoomLevel);
    }

    // Check for potential snapping
    let movingClipId;
    if (hasTimelineClip) {
      try {
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (timelineClipData) {
          const { clipId } = JSON.parse(timelineClipData);
          movingClipId = clipId;
        }
      } catch (error) {}
    }

    // Find nearest clip edge for snapping
    const snapTarget = findNearestClipEdge(dropTime, movingClipId);

    // Apply snapping if a target is found
    if (snapTarget !== null) {
      setIsSnapping(true);
      setSnapTarget(snapTarget);
      dropTime = snapTarget;
    } else {
      setIsSnapping(false);
      setSnapTarget(null);
    }

    // Check for potential overlaps and show appropriate feedback
    let wouldOverlap = false;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const { id } = JSON.parse(mediaItemData);
          const mediaItem = mediaItems.find((item) => item.id === id);
          if (mediaItem) {
            const newClipDuration = mediaItem.duration || 5;
            const snappedTime =
              snapTarget !== null ? snapTarget : Math.round(dropTime * 10) / 10;
            const newClipEnd = snappedTime + newClipDuration;

            wouldOverlap = track.clips.some((existingClip) => {
              const existingStart = existingClip.startTime;
              const existingEnd =
                existingClip.startTime +
                (existingClip.duration -
                  existingClip.trimStart -
                  existingClip.trimEnd);
              return snappedTime < existingEnd && newClipEnd > existingStart;
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    } else if (hasTimelineClip) {
      try {
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (timelineClipData) {
          const { clipId, trackId: fromTrackId } = JSON.parse(timelineClipData);
          const sourceTrack = tracks.find(
            (t: TimelineTrack) => t.id === fromTrackId
          );
          const movingClip = sourceTrack?.clips.find(
            (c: any) => c.id === clipId
          );

          if (movingClip) {
            const movingClipDuration =
              movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
            const snappedTime =
              snapTarget !== null ? snapTarget : Math.round(dropTime * 10) / 10;
            const movingClipEnd = snappedTime + movingClipDuration;

            wouldOverlap = track.clips.some((existingClip) => {
              if (fromTrackId === track.id && existingClip.id === clipId)
                return false;

              const existingStart = existingClip.startTime;
              const existingEnd =
                existingClip.startTime +
                (existingClip.duration -
                  existingClip.trimStart -
                  existingClip.trimEnd);
              return snappedTime < existingEnd && movingClipEnd > existingStart;
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    }

    if (wouldOverlap) {
      e.dataTransfer.dropEffect = "none";
      setIsDraggedOver(true);
      setWouldOverlap(true);
      setDropPosition(
        snapTarget !== null ? snapTarget : Math.round(dropTime * 10) / 10
      );
      return;
    }

    e.dataTransfer.dropEffect = hasTimelineClip ? "move" : "copy";
    setIsDraggedOver(true);
    setWouldOverlap(false);
    setDropPosition(
      snapTarget !== null ? snapTarget : Math.round(dropTime * 10) / 10
    );

    // Update time indicator
    setTimeIndicator(
      snapTarget !== null ? snapTarget : Math.round(dropTime * 10) / 10
    );
  };

  const handleTrackDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    dragCounterRef.current++;
    setIsDropping(true);
    setIsDraggedOver(true);
  };

  const handleTrackDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDropping(false);
      setIsDraggedOver(false);
      setWouldOverlap(false);
      setDropPosition(null);
      setIsSnapping(false);
      setSnapTarget(null);
      setTimeIndicator(null);
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    onDrop();
    // Reset all drag states
    dragCounterRef.current = 0;
    setIsDropping(false);
    setIsDraggedOver(false);
    setWouldOverlap(false);
    const currentDropPosition = dropPosition;
    const currentSnapTarget = snapTarget;
    setDropPosition(null);
    setIsSnapping(false);
    setSnapTarget(null);
    setTimeIndicator(null);

    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineClip && !hasMediaItem) return;

    const trackContainer = e.currentTarget.querySelector(
      ".track-clips-container"
    ) as HTMLElement;
    if (!trackContainer) return;

    const rect = trackContainer.getBoundingClientRect();
    const mouseX = Math.max(0, e.clientX - rect.left);
    const newStartTime = mouseX / (50 * zoomLevel);

    // Use snapped position if available, otherwise round to nearest 0.1s
    const snappedTime =
      currentSnapTarget !== null
        ? currentSnapTarget
        : Math.round(newStartTime * 10) / 10;

    try {
      if (hasTimelineClip) {
        // Handle timeline clip movement
        const timelineClipData = e.dataTransfer.getData(
          "application/x-timeline-clip"
        );
        if (!timelineClipData) return;

        const { clipId, trackId: fromTrackId } = JSON.parse(timelineClipData);

        // Find the clip being moved
        const sourceTrack = tracks.find(
          (t: TimelineTrack) => t.id === fromTrackId
        );
        const movingClip = sourceTrack?.clips.find((c: any) => c.id === clipId);

        if (!movingClip) {
          toast.error("Clip not found");
          return;
        }

        // Check for overlaps with existing clips (excluding the moving clip itself)
        const movingClipDuration =
          movingClip.duration - movingClip.trimStart - movingClip.trimEnd;
        const movingClipEnd = snappedTime + movingClipDuration;

        const hasOverlap = track.clips.some((existingClip) => {
          // Skip the clip being moved if it's on the same track
          if (fromTrackId === track.id && existingClip.id === clipId)
            return false;

          const existingStart = existingClip.startTime;
          const existingEnd =
            existingClip.startTime +
            (existingClip.duration -
              existingClip.trimStart -
              existingClip.trimEnd);

          // Check if clips overlap
          return snappedTime < existingEnd && movingClipEnd > existingStart;
        });

        if (hasOverlap) {
          toast.error(
            "Cannot move clip here - it would overlap with existing clips"
          );
          return;
        }

        if (fromTrackId === track.id) {
          // Moving within same track
          updateClipStartTime(track.id, clipId, snappedTime);
          if (currentSnapTarget !== null) {
            toast.success("Clip snapped to adjacent clip");
          }
        } else {
          // Moving to different track
          moveClipToTrack(fromTrackId, track.id, clipId);
          requestAnimationFrame(() => {
            updateClipStartTime(track.id, clipId, snappedTime);
            if (currentSnapTarget !== null) {
              toast.success("Clip snapped to adjacent clip");
            }
          });
        }
      } else if (hasMediaItem) {
        // Handle media item drop
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (!mediaItemData) return;

        const { id, type } = JSON.parse(mediaItemData);
        const mediaItem = mediaItems.find((item) => item.id === id);

        if (!mediaItem) {
          toast.error("Media item not found");
          return;
        }

        // Check if track type is compatible
        const isCompatible =
          (track.type === "video" && (type === "video" || type === "image")) ||
          (track.type === "audio" && type === "audio");

        if (!isCompatible) {
          toast.error(`Cannot add ${type} to ${track.type} track`);
          return;
        }

        // Check for overlaps with existing clips
        const newClipDuration = mediaItem.duration || 5;
        const newClipEnd = snappedTime + newClipDuration;

        const hasOverlap = track.clips.some((existingClip) => {
          const existingStart = existingClip.startTime;
          const existingEnd =
            existingClip.startTime +
            (existingClip.duration -
              existingClip.trimStart -
              existingClip.trimEnd);

          // Check if clips overlap
          return snappedTime < existingEnd && newClipEnd > existingStart;
        });

        if (hasOverlap) {
          toast.error(
            "Cannot place clip here - it would overlap with existing clips"
          );
          return;
        }

        addClipToTrack(track.id, {
          mediaId: mediaItem.id,
          name: mediaItem.name,
          duration: mediaItem.duration || 5,
          startTime: snappedTime,
          trimStart: 0,
          trimEnd: 0,
        });

        if (currentSnapTarget !== null) {
          toast.success(
            `Added ${mediaItem.name} to ${track.name} (snapped to adjacent clip)`
          );
        } else {
          toast.success(`Added ${mediaItem.name} to ${track.name}`);
        }
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      toast.error("Failed to add media to track");
    }
  };

  const getTrackColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-blue-500/20 border-blue-500/30";
      case "audio":
        return "bg-green-500/20 border-green-500/30";
      case "effects":
        return "bg-purple-500/20 border-purple-500/30";
      default:
        return "bg-gray-500/20 border-gray-500/30";
    }
  };

  const renderClipContent = (clip: any) => {
    const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

    if (!mediaItem) {
      return (
        <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
      );
    }

    if (mediaItem.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src={mediaItem.url}
            alt={mediaItem.name}
            fill
            style={{ objectFit: "cover" }}
          />
        </div>
      );
    }

    if (mediaItem.type === "video" && mediaItem.thumbnailUrl) {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0 relative">
            <Image
              src={mediaItem.thumbnailUrl}
              alt={mediaItem.name}
              fill
              style={{ objectFit: "cover" }}
              className="rounded-sm"
            />
          </div>
          <span className="text-xs text-foreground/80 truncate flex-1">
            {clip.name}
          </span>
        </div>
      );
    }

    // Fallback for audio or videos without thumbnails
    return (
      <span className="text-xs text-foreground/80 truncate">{clip.name}</span>
    );
  };

  const handleSplitClip = (clip: any) => {
    // Use current playback time as split point
    const splitTime = currentTime;
    // Only split if splitTime is within the clip's effective range
    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
    if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;
    const firstDuration = splitTime - effectiveStart;
    const secondDuration = effectiveEnd - splitTime;
    // First part: adjust original clip
    updateClipTrim(
      track.id,
      clip.id,
      clip.trimStart,
      clip.trimEnd + secondDuration
    );
    // Second part: add new clip after split
    addClipToTrack(track.id, {
      mediaId: clip.mediaId,
      name: clip.name + " (cut)",
      duration: clip.duration,
      startTime: splitTime,
      trimStart: clip.trimStart + firstDuration,
      trimEnd: clip.trimEnd,
    });
  };

  // Memoize gaps to prevent unnecessary recalculations
  const gaps = useMemo(() => {
    return useTimelineStore.getState().getGapsInTrack(track.id);
  }, [track.id]);

  // Memoize the gap rendering for better performance
  const gapElements = useMemo(() => {
    return gaps.map((gap, index) => {
      const gapLeft = gap.startTime * 50 * zoomLevel;
      const gapWidth = gap.duration * 50 * zoomLevel;

      return (
        <div
          key={`gap-${index}`}
          className="absolute h-full bg-gray-200/30 border-l border-r border-dashed border-gray-400/50 flex items-center justify-center"
          style={{
            left: `${gapLeft}px`,
            width: `${Math.max(5, gapWidth)}px`,
          }}
        >
          {gapWidth > 40 && (
            <div className="text-xs text-gray-500 px-1 py-0.5 bg-white/80 rounded flex items-center">
              <ArrowLeftRight className="h-3 w-3 mr-1" />
              {gap.duration.toFixed(1)}s
            </div>
          )}
        </div>
      );
    });
  }, [gaps, zoomLevel]);

  return (
    <div
      className={`w-full h-full transition-all duration-150 ease-out ${
        isDraggedOver
          ? wouldOverlap
            ? "bg-red-500/15 border-2 border-dashed border-red-400 shadow-lg"
            : isSnapping
              ? "bg-green-500/15 border-2 border-dashed border-green-400 shadow-lg"
              : "bg-blue-500/15 border-2 border-dashed border-blue-400 shadow-lg"
          : "hover:bg-muted/20"
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        // Only show track menu if we didn't click on a clip
        if (!(e.target as HTMLElement).closest(".timeline-clip")) {
          setContextMenu({
            type: "track",
            trackId: track.id,
            x: e.clientX,
            y: e.clientY,
          });
        }
      }}
      onDragOver={handleTrackDragOver}
      onDragEnter={handleTrackDragEnter}
      onDragLeave={handleTrackDragLeave}
      onDrop={handleTrackDrop}
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
    >
      <div className="h-full relative track-clips-container min-w-full">
        {/* Render gaps between clips */}
        {track.clips.length > 1 && gapElements}

        {/* Time indicator during drag */}
        {timeIndicator !== null && (
          <div
            className="absolute top-0 px-1 py-0.5 bg-black text-white text-xs rounded z-50 transform -translate-x-1/2"
            style={{ left: `${timeIndicator * 50 * zoomLevel}px` }}
          >
            {timeIndicator.toFixed(1)}s
          </div>
        )}
        {track.clips.length === 0 ? (
          <div
            className={`h-full w-full rounded-sm border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground transition-colors ${
              isDropping
                ? wouldOverlap
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : isSnapping
                    ? "border-green-500 bg-green-500/10 text-green-600"
                    : "border-blue-500 bg-blue-500/10 text-blue-600"
                : "border-muted/30"
            }`}
          >
            {isDropping
              ? wouldOverlap
                ? "Cannot drop - would overlap"
                : isSnapping
                  ? "Drop to snap to adjacent clip"
                  : "Drop clip here"
              : "Drop media here"}
          </div>
        ) : (
          <>
            {track.clips.map((clip) => {
              const effectiveDuration =
                clip.duration - clip.trimStart - clip.trimEnd;
              const clipWidth = Math.max(
                80,
                effectiveDuration * 50 * zoomLevel
              );
              const clipLeft = clip.startTime * 50 * zoomLevel;
              const isSelected = selectedClips.some(
                (c) => c.trackId === track.id && c.clipId === clip.id
              );
              return (
                <div
                  key={clip.id}
                  className={`timeline-clip absolute h-full border transition-all duration-200 ${getTrackColor(track.type)} flex items-center py-3 min-w-[80px] overflow-hidden group hover:shadow-lg ${isSelected ? "ring-2 ring-blue-500 z-10" : ""}`}
                  style={{
                    width: `${clipWidth}px`,
                    left: `${clipLeft}px`,
                    transform: "translateZ(0)",
                    willChange: "transform",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();

                    // Close context menu if it's open
                    if (contextMenu) {
                      setContextMenu(null);
                      return; // Don't handle selection when closing context menu
                    }

                    const isSelected = selectedClips.some(
                      (c) => c.trackId === track.id && c.clipId === clip.id
                    );

                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                      // Multi-selection mode: toggle the clip
                      selectClip(track.id, clip.id, true);
                    } else if (isSelected) {
                      // If clip is already selected, deselect it
                      deselectClip(track.id, clip.id);
                    } else {
                      // If clip is not selected, select it (replacing other selections)
                      selectClip(track.id, clip.id, false);
                    }
                  }}
                  tabIndex={0}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      type: "clip",
                      trackId: track.id,
                      clipId: clip.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                >
                  {/* Left trim handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/50 hover:bg-blue-500"
                    onMouseDown={(e) => handleResizeStart(e, clip.id, "left")}
                  ></div>
                  {/* Clip content */}
                  <div
                    className="flex-1 cursor-grab active:cursor-grabbing relative"
                    draggable={true}
                    onDragStart={(e) => handleClipDragStart(e, clip)}
                    onDragEnd={handleClipDragEnd}
                  >
                    {renderClipContent(clip)}
                    {/* Clip options menu */}
                    <div className="absolute top-1 right-1 z-10">
                      <Button
                        variant="text"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setClipMenuOpen(clip.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {clipMenuOpen === clip.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50">
                          <button
                            className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted/30"
                            onClick={() => {
                              handleSplitClip(clip);
                              setClipMenuOpen(null);
                            }}
                          >
                            <Scissors className="h-4 w-4 mr-2" /> Split
                          </button>
                          <button
                            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClip(clip.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Right trim handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/50 hover:bg-blue-500"
                    onMouseDown={(e) => handleResizeStart(e, clip.id, "right")}
                  ></div>
                </div>
              );
            })}

            {/* Drop position indicator */}
            {isDraggedOver && dropPosition !== null && (
              <div
                className={`absolute top-0 bottom-0 w-1 pointer-events-none z-30 transition-all duration-75 ease-out ${
                  wouldOverlap
                    ? "bg-red-500"
                    : isSnapping
                      ? "bg-green-500 w-2"
                      : "bg-blue-500"
                }`}
                style={{
                  left: `${dropPosition * 50 * zoomLevel}px`,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md ${
                    wouldOverlap
                      ? "bg-red-500"
                      : isSnapping
                        ? "bg-green-500"
                        : "bg-blue-500"
                  }`}
                ></div>
                <div
                  className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md ${
                    wouldOverlap
                      ? "bg-red-500"
                      : isSnapping
                        ? "bg-green-500"
                        : "bg-blue-500"
                  }`}
                ></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
