"use client";

import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import {
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Snowflake,
  Copy,
  SplitSquareHorizontal,
  MoreVertical,
  Volume2,
  VolumeX,
  Pause,
  Play,
  ArrowLeftRight,
} from "@/lib/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
import { useTimelineStore, type TimelineTrack } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { SelectionBox } from "./selection-box";
import { useSelectionBox } from "@/hooks/use-selection-box";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import { TimelineTrackContent } from "./TimelineTrackContent";

export function Timeline() {
  // Timeline shows all tracks (video, audio, effects) and their clips.
  // You can drag media here to add it to your project.
  // Clips can be trimmed, deleted, and moved.
  const {
    tracks,
    addTrack,
    addClipToTrack,
    removeTrack,
    toggleTrackMute,
    removeClipFromTrack,
    getTotalDuration,
    selectedClips,
    clearSelectedClips,
    setSelectedClips,
    updateClipTrim,
    updateClipSpeed,
    toggleClipReversed,
    undo,
    redo,
  } = useTimelineStore();
  const { mediaItems, addMediaItem } = useMediaStore();
  const {
    currentTime,
    duration,
    seek,
    setDuration,
    isPlaying,
    toggle,
    setSpeed,
    speed,
  } = usePlaybackStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounterRef = useRef(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const [isInTimeline, setIsInTimeline] = useState(false);

  // Enhanced zoom functionality
  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
  });

  // Unified context menu state
  const [contextMenu, setContextMenu] = useState<{
    type: "track" | "clip";
    trackId: string;
    clipId?: string;
    x: number;
    y: number;
  } | null>(null);

  // Enhanced selection system
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const {
    selectionBox,
    handleMouseDown: handleSelectionMouseDown,
    isSelecting,
    justFinishedSelecting,
  } = useSelectionBox({
    containerRef: tracksContainerRef,
    playheadRef,
    onSelectionComplete: (clips) => {
      console.log(JSON.stringify({ onSelectionComplete: clips.length }));
      setSelectedClips(clips);
    },
  });

  // Enhanced playhead functionality with auto-scroll
  const {
    playheadPosition,
    handlePlayheadMouseDown,
    handleRulerMouseDown,
    isDraggingRuler,
    isScrubbing,
  } = useTimelinePlayhead({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  // Action handlers for toolbar (moved before useEffect to avoid hoisting issues)
  const handleSplitSelected = useCallback(() => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (clip && track) {
        const splitTime = currentTime;
        const effectiveStart = clip.startTime;
        const effectiveEnd =
          clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (splitTime > effectiveStart && splitTime < effectiveEnd) {
          updateClipTrim(
            track.id,
            clip.id,
            clip.trimStart,
            clip.trimEnd + (effectiveEnd - splitTime)
          );
          useTimelineStore.getState().addClipToTrack(track.id, {
            mediaId: clip.mediaId,
            name: clip.name + " (split)",
            startTime: splitTime,
            duration: clip.duration,
            trimStart: clip.trimStart + (splitTime - effectiveStart),
            trimEnd: clip.trimEnd,
          });
        }
      }
    });
    clearSelectedClips();
    toast.success("Split selected clip(s)");
  }, [selectedClips, tracks, currentTime, updateClipTrim, clearSelectedClips]);

  const handleSeparateAudio = useCallback(() => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }

    let separatedCount = 0;
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);

      if (clip && track && track.type === "video") {
        const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
        if (mediaItem && mediaItem.type === "video") {
          // Check if audio is already separated for this video
          const existingAudioTrack = tracks.find(
            (t) =>
              t.type === "audio" &&
              t.clips.some((c) => c.mediaId === clip.mediaId)
          );

          if (existingAudioTrack) {
            toast.error("Audio already separated for this clip");
            return;
          }

          // Create audio track if it doesn't exist
          let audioTrackId = tracks.find((t) => t.type === "audio")?.id;
          if (!audioTrackId) {
            audioTrackId = addTrack("audio");
          }

          // Add audio clip to audio track using direct store access
          const audioClip = {
            mediaId: clip.mediaId,
            name: clip.name + " (audio)",
            startTime: clip.startTime,
            duration: clip.duration,
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd,
          };

          useTimelineStore.getState().addClipToTrack(audioTrackId, audioClip);
          separatedCount++;
        }
      }
    });

    if (separatedCount > 0) {
      clearSelectedClips();
      toast.success(`Separated audio from ${separatedCount} clip(s)`);
    } else {
      toast.error("No video clips selected or audio already separated");
    }
  }, [selectedClips, tracks, mediaItems, addTrack, clearSelectedClips]);

  // ENHANCEMENT: Move handleToggleReversedSelected before useEffect that uses it
  const handleToggleReversedSelected = useCallback(() => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      toggleClipReversed(trackId, clipId);
    });
    const hasReversed = selectedClips.some(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      return clip?.reversed;
    });
    toast.success(
      `${hasReversed ? "Enabled" : "Disabled"} reversal for selected clip(s)`
    );
  }, [selectedClips, tracks, toggleClipReversed]);

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(Math.max(totalDuration, 10)); // Minimum 10 seconds for empty timeline
  }, [tracks, setDuration, getTotalDuration]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Keyboard event for deleting selected clips and other shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedClips.length > 0
      ) {
        selectedClips.forEach(({ trackId, clipId }) => {
          removeClipFromTrack(trackId, clipId);
        });
        clearSelectedClips();
      } else if (e.key.toLowerCase() === "e" && selectedClips.length > 0) {
        e.preventDefault();
        handleSeparateAudio();
      } else if (e.key.toLowerCase() === "s" && selectedClips.length > 0) {
        e.preventDefault();
        handleSplitSelected();
      } else if (
        e.key.toLowerCase() === "r" &&
        e.shiftKey &&
        selectedClips.length > 0
      ) {
        e.preventDefault();
        handleToggleReversedSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedClips,
    removeClipFromTrack,
    clearSelectedClips,
    handleSeparateAudio,
    handleSplitSelected,
    handleToggleReversedSelected,
  ]);

  // Keyboard event for undo (Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  // Keyboard event for redo (Cmd+Shift+Z or Cmd+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo]);

  // Mouse down on timeline background to start selection
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && e.button === 0) {
      handleSelectionMouseDown(e);
    }
  };

  // Selection system is now handled by useSelectionBox hook

  const handleDragEnter = (e: React.DragEvent) => {
    // When something is dragged over the timeline, show overlay
    e.preventDefault();
    // Don't show overlay for timeline clips - they're handled by tracks
    if (e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }
    dragCounterRef.current += 1;
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    // Don't update state for timeline clips - they're handled by tracks
    if (e.dataTransfer.types.includes("application/x-timeline-clip")) {
      return;
    }

    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    // When media is dropped, add it as a new track/clip
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    // Ignore timeline clip drags - they're handled by track-specific handlers
    const hasTimelineClip = e.dataTransfer.types.includes(
      "application/x-timeline-clip"
    );
    if (hasTimelineClip) {
      return;
    }

    const mediaItemData = e.dataTransfer.getData("application/x-media-item");
    if (mediaItemData) {
      // Handle media item drops by creating new tracks
      try {
        const { id, type } = JSON.parse(mediaItemData);
        const mediaItem = mediaItems.find((item) => item.id === id);
        if (!mediaItem) {
          toast.error("Media item not found");
          return;
        }

        // Validate duration for audio files
        if (
          type === "audio" &&
          (!mediaItem.duration || mediaItem.duration === 0)
        ) {
          toast.error(
            "Audio file has invalid duration. Please re-record or re-upload."
          );
          return;
        }

        // Add to video or audio track depending on type
        const trackType = type === "audio" ? "audio" : "video";
        const newTrackId = addTrack(trackType);
        addClipToTrack(newTrackId, {
          mediaId: mediaItem.id,
          name: mediaItem.name,
          duration: mediaItem.duration || 5,
          startTime: 0,
          trimStart: 0,
          trimEnd: 0,
        });
        toast.success(`Added ${mediaItem.name} to new ${trackType} track`);
      } catch (error) {
        // Show error if parsing fails
        console.error("Error parsing media item data:", error);
        toast.error("Failed to add media to timeline");
      }
    } else if (e.dataTransfer.files?.length > 0) {
      // Handle file drops by creating new tracks
      setIsProcessing(true);
      try {
        const processedItems = await processMediaFiles(e.dataTransfer.files);
        for (const processedItem of processedItems) {
          addMediaItem(processedItem);
          const currentMediaItems = useMediaStore.getState().mediaItems;
          const addedItem = currentMediaItems.find(
            (item) =>
              item.name === processedItem.name && item.url === processedItem.url
          );
          if (addedItem) {
            const trackType =
              processedItem.type === "audio" ? "audio" : "video";
            const newTrackId = addTrack(trackType);
            addClipToTrack(newTrackId, {
              mediaId: addedItem.id,
              name: addedItem.name,
              duration: addedItem.duration || 5,
              startTime: 0,
              trimStart: 0,
              trimEnd: 0,
            });
          }
        }
      } catch (error) {
        // Show error if file processing fails
        console.error("Error processing external files:", error);
        toast.error("Failed to process dropped files");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleTimelineAreaClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelectedClips();
    }
  };

  // Playhead logic is now handled by useTimelinePlayhead hook

  const handleTrackDrop = () => {
    setIsDragOver(false);
    dragCounterRef.current = 0;
  };

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  // Old function definitions removed - now using useCallback versions above

  const handleDuplicateSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (clip && track) {
        addClipToTrack(track.id, {
          mediaId: clip.mediaId,
          name: clip.name + " (copy)",
          duration: clip.duration,
          startTime:
            clip.startTime +
            (clip.duration - clip.trimStart - clip.trimEnd) +
            0.1,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
        });
      }
    });
    toast.success("Duplicated selected clip(s)");
  };

  const handleFreezeSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (clip && track) {
        // Add a new freeze frame clip at the playhead
        addClipToTrack(track.id, {
          mediaId: clip.mediaId,
          name: clip.name + " (freeze)",
          duration: 1, // 1 second freeze frame
          startTime: currentTime,
          trimStart: 0,
          trimEnd: clip.duration - 1,
        });
      }
    });
    toast.success("Freeze frame added for selected clip(s)");
  };

  const handleDeleteSelected = () => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      removeClipFromTrack(trackId, clipId);
    });
    clearSelectedClips();
    toast.success("Deleted selected clip(s)");
  };

  const handleSpeedChangeSelected = (newSpeed: number) => {
    if (selectedClips.length === 0) {
      toast.error("No clips selected");
      return;
    }
    selectedClips.forEach(({ trackId, clipId }) => {
      updateClipSpeed(trackId, clipId, newSpeed);
    });
    toast.success(`Set speed to ${newSpeed}x for selected clip(s)`);
  };

  // Function definition moved above to fix dependency order
  // Prevent explorer zooming in/out when in timeline
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      // if (isInTimeline && (e.ctrlKey || e.metaKey)) {
      if (
        isInTimeline &&
        (e.ctrlKey || e.metaKey) &&
        timelineRef.current?.contains(e.target as Node)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      document.removeEventListener("wheel", preventZoom);
    };
  }, [isInTimeline]);

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 relative ${
        isDragOver ? "bg-accent/30 border-accent" : ""
      }`}
      {...dragProps}
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
      onWheel={handleWheel}
    >
      {/* Show overlay when dragging media over the timeline */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none backdrop-blur-lg">
          <div>Drop media here to add to timeline</div>
        </div>
      )}
      {/* Toolbar */}
      <div className="border-b flex items-center px-2 py-1 gap-1">
        <TooltipProvider delayDuration={500}>
          {/* Play/Pause Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={toggle}
                className="mr-2"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPlaying ? "Pause (Space)" : "Play (Space)"}
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Time Display */}
          <div
            className="text-xs text-muted-foreground font-mono px-2"
            style={{ minWidth: "18ch", textAlign: "center" }}
          >
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </div>

          {/* Test Clip Button - for debugging */}
          {tracks.length === 0 && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const trackId = addTrack("video");
                      addClipToTrack(trackId, {
                        mediaId: "test",
                        name: "Test Clip",
                        duration: 5,
                        startTime: 0,
                        trimStart: 0,
                        trimEnd: 0,
                      });
                    }}
                    className="text-xs"
                  >
                    Add Test Clip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a test clip to try playback</TooltipContent>
              </Tooltip>
            </>
          )}

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleSplitSelected}>
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split clip (S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon">
                <ArrowLeftToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep left (A)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon">
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep right (D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleSeparateAudio}>
                <SplitSquareHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Separate audio (E)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleDuplicateSelected}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate clip (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleFreezeSelected}>
                <Snowflake className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Freeze frame (F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleDeleteSelected}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete clip (Delete)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Per-Clip Speed Control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={
                  selectedClips.length > 0
                    ? tracks
                        .find((t) => t.id === selectedClips[0].trackId)
                        ?.clips.find((c) => c.id === selectedClips[0].clipId)
                        ?.speed?.toFixed(1) || "1.0"
                    : "1.0"
                }
                onValueChange={(value: string) =>
                  handleSpeedChangeSelected(parseFloat(value))
                }
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.8">0.8x</SelectItem>
                  <SelectItem value="1.0">1.0x</SelectItem>
                  <SelectItem value="1.2">1.2x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2.0">2.0x</SelectItem>
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>Clip speed</TooltipContent>
          </Tooltip>

          {/* Reverse Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleToggleReversedSelected}
                className={
                  selectedClips.some(({ trackId, clipId }) => {
                    const track = tracks.find((t) => t.id === trackId);
                    const clip = track?.clips.find((c) => c.id === clipId);
                    return clip?.reversed;
                  })
                    ? "bg-accent"
                    : ""
                }
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reverse clip (Shift+R)</TooltipContent>
          </Tooltip>

          {/* Speed Control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={speed.toFixed(1)}
                onValueChange={(value: string) => setSpeed(parseFloat(value))}
              >
                <SelectTrigger className="w-[90px] h-8">
                  <SelectValue placeholder="1.0x" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1.0">1.0x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2.0">2.0x</SelectItem>
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>Playback Speed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {/* Timeline Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header with Ruler */}
        <div className="flex border-b bg-background sticky top-0 z-10">
          {/* Track Labels Header */}
          <div className="w-48 flex-shrink-0 bg-muted/30 border-r flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Tracks
            </span>
            <div className="text-xs text-muted-foreground">
              {zoomLevel.toFixed(1)}x
            </div>
          </div>

          {/* Timeline Ruler */}
          <div className="flex-1 relative overflow-hidden">
            <ScrollArea ref={rulerScrollRef} className="w-full">
              <div
                ref={rulerRef}
                className="relative h-12 bg-muted/30 cursor-pointer"
                style={{
                  width: `${Math.max(1000, duration * 50 * zoomLevel)}px`,
                }}
                onMouseDown={handleRulerMouseDown}
                data-ruler-area
              >
                {/* Time markers */}
                {(() => {
                  // Calculate appropriate time interval based on zoom level
                  const getTimeInterval = (zoom: number) => {
                    const pixelsPerSecond = 50 * zoom;
                    if (pixelsPerSecond >= 200) return 0.1; // Every 0.1s when very zoomed in
                    if (pixelsPerSecond >= 100) return 0.5; // Every 0.5s when zoomed in
                    if (pixelsPerSecond >= 50) return 1; // Every 1s at normal zoom
                    if (pixelsPerSecond >= 25) return 2; // Every 2s when zoomed out
                    if (pixelsPerSecond >= 12) return 5; // Every 5s when more zoomed out
                    if (pixelsPerSecond >= 6) return 10; // Every 10s when very zoomed out
                    return 30; // Every 30s when extremely zoomed out
                  };

                  const interval = getTimeInterval(zoomLevel);
                  const markerCount = Math.ceil(duration / interval) + 1;

                  return Array.from({ length: markerCount }, (_, i) => {
                    const time = i * interval;
                    if (time > duration) return null;

                    const isMainMarker =
                      time % (interval >= 1 ? Math.max(1, interval) : 1) === 0;

                    return (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 ${
                          isMainMarker
                            ? "border-l border-muted-foreground/40"
                            : "border-l border-muted-foreground/20"
                        }`}
                        style={{ left: `${time * 50 * zoomLevel}px` }}
                      >
                        <span
                          className={`absolute top-1 left-1 text-xs ${
                            isMainMarker
                              ? "text-muted-foreground font-medium"
                              : "text-muted-foreground/70"
                          }`}
                        >
                          {(() => {
                            const formatTime = (seconds: number) => {
                              const hours = Math.floor(seconds / 3600);
                              const minutes = Math.floor((seconds % 3600) / 60);
                              const secs = seconds % 60;

                              if (hours > 0) {
                                return `${hours}:${minutes
                                  .toString()
                                  .padStart(2, "0")}:${Math.floor(secs)
                                  .toString()
                                  .padStart(2, "0")}`;
                              } else if (minutes > 0) {
                                return `${minutes}:${Math.floor(secs)
                                  .toString()
                                  .padStart(2, "0")}`;
                              } else if (interval >= 1) {
                                return `${Math.floor(secs)}s`;
                              } else {
                                return `${secs.toFixed(1)}s`;
                              }
                            };
                            return formatTime(time);
                          })()}
                        </span>
                      </div>
                    );
                  }).filter(Boolean);
                })()}

                {/* Playhead in ruler (scrubbable) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-auto z-10 cursor-ew-resize"
                  style={{ left: `${playheadPosition * 50 * zoomLevel}px` }}
                  onMouseDown={handlePlayheadMouseDown}
                >
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Labels */}
          {tracks.length > 0 && (
            <div className="w-48 flex-shrink-0 border-r bg-background overflow-y-auto">
              <div className="flex flex-col">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="h-[60px] flex items-center px-3 border-b border-muted/30 bg-background group"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        type: "track",
                        trackId: track.id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          track.type === "video"
                            ? "bg-blue-500"
                            : track.type === "audio"
                            ? "bg-green-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <span className="ml-2 text-sm font-medium truncate">
                        {track.name}
                      </span>
                    </div>
                    {track.muted && (
                      <span className="ml-2 text-xs text-red-500 font-semibold flex-shrink-0">
                        Muted
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Tracks Content */}
          <div className="flex-1 relative overflow-hidden">
            <ScrollArea ref={tracksScrollRef} className="w-full h-full">
              <div
                className="w-full h-full overflow-hidden flex"
                ref={timelineRef}
                style={{ position: "relative" }}
                onWheel={handleWheel}
              >
                {/* Timeline grid and clips area (with left margin for sifdebar) */}
                <div
                  ref={tracksContainerRef}
                  className="relative flex-1"
                  style={{
                    height: `${Math.max(
                      200,
                      Math.min(800, tracks.length * 60)
                    )}px`,
                    width: `${Math.max(1000, duration * 50 * zoomLevel)}px`,
                  }}
                  onClick={handleTimelineAreaClick}
                  onMouseDown={handleTimelineMouseDown}
                >
                  {tracks.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4 mx-auto">
                          <SplitSquareHorizontal className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Drop media here to start
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {tracks.map((track, index) => (
                        <div
                          key={track.id}
                          className="absolute left-0 right-0 border-b border-muted/30"
                          style={{
                            top: `${index * 60}px`,
                            height: "60px",
                          }}
                          // Show context menu on right click
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              type: "track",
                              trackId: track.id,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                        >
                          <TimelineTrackContent
                            track={track}
                            zoomLevel={zoomLevel}
                            setContextMenu={setContextMenu}
                            contextMenu={contextMenu}
                            onDrop={handleTrackDrop}
                          />
                        </div>
                      ))}

                      {/* Playhead for tracks area (scrubbable) */}
                      {tracks.length > 0 && (
                        <div
                          ref={playheadRef}
                          className="absolute top-0 w-0.5 bg-red-500 pointer-events-auto z-20 cursor-ew-resize"
                          style={{
                            left: `${playheadPosition * 50 * zoomLevel}px`,
                            height: `${tracks.length * 60}px`,
                          }}
                          onMouseDown={handlePlayheadMouseDown}
                        />
                      )}

                      {/* Enhanced Selection Box */}
                      <SelectionBox
                        startPos={selectionBox?.startPos || null}
                        currentPos={selectionBox?.currentPos || null}
                        containerRef={tracksContainerRef}
                        isActive={selectionBox?.isActive || false}
                      />
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      {/* Clean Unified Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-md py-1 text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.type === "track" ? (
            // Track context menu
            <>
              <button
                className="flex items-center w-full px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                onClick={() => {
                  const track = tracks.find(
                    (t) => t.id === contextMenu.trackId
                  );
                  if (track) toggleTrackMute(track.id);
                  setContextMenu(null);
                }}
              >
                {(() => {
                  const track = tracks.find(
                    (t) => t.id === contextMenu.trackId
                  );
                  return track?.muted ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Unmute Track
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Mute Track
                    </>
                  );
                })()}
              </button>
              <button
                className="flex items-center w-full px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                onClick={() => {
                  useTimelineStore
                    .getState()
                    .closeGapsInTrack(contextMenu.trackId);
                  setContextMenu(null);
                  toast.success("Gaps closed in track");
                }}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Close Gaps
              </button>
              <div className="h-px bg-border mx-1 my-1" />
              <button
                className="flex items-center w-full px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors text-left"
                onClick={() => {
                  removeTrack(contextMenu.trackId);
                  setContextMenu(null);
                  toast.success("Track deleted");
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Track
              </button>
            </>
          ) : (
            // Clip context menu
            <>
              <button
                className="flex items-center w-full px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                onClick={() => {
                  if (contextMenu.clipId) {
                    const track = tracks.find(
                      (t) => t.id === contextMenu.trackId
                    );
                    const clip = track?.clips.find(
                      (c) => c.id === contextMenu.clipId
                    );
                    if (clip && track) {
                      const splitTime = currentTime;
                      const effectiveStart = clip.startTime;
                      const effectiveEnd =
                        clip.startTime +
                        (clip.duration - clip.trimStart - clip.trimEnd);

                      if (
                        splitTime > effectiveStart &&
                        splitTime < effectiveEnd
                      ) {
                        updateClipTrim(
                          track.id,
                          clip.id,
                          clip.trimStart,
                          clip.trimEnd + (effectiveEnd - splitTime)
                        );
                        useTimelineStore.getState().addClipToTrack(track.id, {
                          mediaId: clip.mediaId,
                          name: clip.name + " (split)",
                          duration: clip.duration,
                          startTime: splitTime,
                          trimStart:
                            clip.trimStart + (splitTime - effectiveStart),
                          trimEnd: clip.trimEnd,
                        });
                        toast.success("Clip split successfully");
                      } else {
                        toast.error("Playhead must be within clip to split");
                      }
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <Scissors className="h-4 w-4 mr-2" />
                Split at Playhead
              </button>
              <button
                className="flex items-center w-full px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                onClick={() => {
                  if (contextMenu.clipId) {
                    const track = tracks.find(
                      (t) => t.id === contextMenu.trackId
                    );
                    const clip = track?.clips.find(
                      (c) => c.id === contextMenu.clipId
                    );
                    if (clip && track) {
                      useTimelineStore.getState().addClipToTrack(track.id, {
                        mediaId: clip.mediaId,
                        name: clip.name + " (copy)",
                        duration: clip.duration,
                        startTime:
                          clip.startTime +
                          (clip.duration - clip.trimStart - clip.trimEnd) +
                          0.1,
                        trimStart: clip.trimStart,
                        trimEnd: clip.trimEnd,
                      });
                      toast.success("Clip duplicated");
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Clip
              </button>
              <div className="h-px bg-border mx-1 my-1" />
              <button
                className="flex items-center w-full px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors text-left"
                onClick={() => {
                  if (contextMenu.clipId) {
                    removeClipFromTrack(
                      contextMenu.trackId,
                      contextMenu.clipId
                    );
                    toast.success("Clip deleted");
                  }
                  setContextMenu(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Clip
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
