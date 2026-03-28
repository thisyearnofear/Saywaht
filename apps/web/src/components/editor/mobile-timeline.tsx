/**
 * WORKING MOBILE TIMELINE
 * Enhanced mobile timeline with improved touch handling and visual feedback
 */

"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import {
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Trash2,
  GripVertical,
  Sparkles,
  Scissors,
  Copy,
  X,
  Volume2,
  VolumeX
} from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { formatTime } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface MobileTimelineProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
  compact?: boolean;
}

export const MobileTimeline = React.memo(function MobileTimeline({
  expanded = false,
  onToggleExpand,
  compact = false,
}: MobileTimelineProps) {
  // Connect to real stores
  const { currentTime, duration, seek, isPlaying, toggle } = usePlaybackStore();
  const { tracks, removeClipFromTrack } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showTimeTooltip, setShowTimeTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipTime, setTooltipTime] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [contextMenuClip, setContextMenuClip] = useState<{ trackId: string; clip: any; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef<boolean>(false);
  const lastSnappedTimeRef = useRef<number | null>(null);
  const lastSeekTimeRef = useRef<number>(0); 

  const handleClipTouchStart = useCallback((e: React.TouchEvent, trackId: string, clip: any) => {
    // Only trigger if not already pinching or scrubbing
    if (e.touches.length > 1 || scrubbingRef.current) return;
    
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    longPressTimerRef.current = setTimeout(() => {
      addHapticFeedback("heavy");
      setContextMenuClip({ trackId, clip, x, y });
      setSelectedClipId(clip.id);
    }, 600);
  }, []);

  const handleClipTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleSplitClip = useCallback(() => {
    if (!contextMenuClip) return;
    const { trackId, clip } = contextMenuClip;
    const splitTime = currentTime;
    
    const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
    if (splitTime <= clip.startTime + 0.2 || splitTime >= clipEnd - 0.2) {
      toast.error("Playhead must be inside the clip to split");
      setContextMenuClip(null);
      return;
    }

    addHapticFeedback("medium");
    const relativeSplitPoint = splitTime - clip.startTime;
    
    // Split: 
    // 1. Current clip ends at splitTime
    // 2. New clip starts at splitTime, with trimStart increased
    
    const originalTrimEnd = clip.trimEnd;
    const newTrimEndForFirstHalf = originalTrimEnd + (clipEnd - splitTime);
    
    useTimelineStore.getState().updateClipTrim(trackId, clip.id, clip.trimStart, newTrimEndForFirstHalf);

    const newClipData = {
      ...clip,
      startTime: splitTime,
      trimStart: clip.trimStart + relativeSplitPoint,
      trimEnd: originalTrimEnd
    };
    
    useTimelineStore.getState().addClipToTrack(trackId, newClipData);
    
    toast.success("Clip split");
    setContextMenuClip(null);
  }, [contextMenuClip, currentTime]);

  const handleDuplicateClip = useCallback(() => {
    if (!contextMenuClip) return;
    const { trackId, clip } = contextMenuClip;
    addHapticFeedback("medium");
    
    const clipDuration = clip.duration - clip.trimStart - clip.trimEnd;
    const newClipData = {
      ...clip,
      startTime: clip.startTime + clipDuration,
    };
    useTimelineStore.getState().addClipToTrack(trackId, newClipData);
    
    toast.success("Clip duplicated");
    setContextMenuClip(null);
  }, [contextMenuClip]);  
  // Pinch zoom state
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(1);
  const isPinchingRef = useRef<boolean>(false);
  
  // Trimming state
  const [isTrimming, setIsTrimming] = useState<"start" | "end" | null>(null);
  const [trimDelta, setTrimDelta] = useState(0);
  const trimStartValRef = useRef(0);
  const trimEndValRef = useRef(0);
  const trimStartTimeRef = useRef(0);

  // One-handed zoom state
  const lastTapTimeRef = useRef<number>(0);
  const isOneHandZoomRef = useRef<boolean>(false);
  const initialZoomYRef = useRef<number>(0);
  const initialZoomLevelRef = useRef<number>(1);

  const SNAP_THRESHOLD = 0.2; // Seconds

  const getSnappedTime = useCallback((time: number): number => {
    // 1. Snap to start/end of timeline
    if (time < SNAP_THRESHOLD) return 0;
    if (Math.abs(time - duration) < SNAP_THRESHOLD) return duration;

    // 2. Snap to clip boundaries
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
        
        if (Math.abs(time - clip.startTime) < SNAP_THRESHOLD) {
          return clip.startTime;
        }
        if (Math.abs(time - clipEnd) < SNAP_THRESHOLD) {
          return clipEnd;
        }
      }
    }

    // 3. Snap to text elements
    const textElements = useTextStore.getState().textElements;
    for (const text of textElements) {
      if (Math.abs(time - text.startTime) < SNAP_THRESHOLD) return text.startTime;
      if (Math.abs(time - text.endTime) < SNAP_THRESHOLD) return text.endTime;
    }

    return time;
  }, [tracks, duration]);

  // Sync expanded state with prop
  useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  // Simple toggle
  const handleToggle = useCallback(() => {
    addHapticFeedback("light");
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  }, [onToggleExpand, isExpanded]);

  // Calculate time from position
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return position * duration;
  }, [duration]);

  // Touch handling that prevents conflicts
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (e.touches.length === 2) {
      // Start pinching
      isPinchingRef.current = true;
      scrubbingRef.current = false;
      isOneHandZoomRef.current = false;
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoomLevel;
      return;
    }

    // One-handed zoom detection (Double tap and hold)
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      isOneHandZoomRef.current = true;
      scrubbingRef.current = false;
      initialZoomYRef.current = e.touches[0].clientY;
      initialZoomLevelRef.current = zoomLevel;
      addHapticFeedback("medium");
      return;
    }
    lastTapTimeRef.current = now;

    isPinchingRef.current = false;
    isOneHandZoomRef.current = false;
    scrubbingRef.current = true;
    setIsScrubbing(true);
    addHapticFeedback("light");
    
    const touch = e.touches[0];
    const newTime = getTimeFromPosition(touch.clientX);
    seek(newTime);
    
    setTooltipTime(newTime);
    setTooltipPosition((newTime / duration) * 100);
    setShowTimeTooltip(true);
  }, [seek, getTimeFromPosition, duration, zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinchingRef.current && e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.max(0.5, Math.min(5, pinchStartZoomRef.current * scale));
      
      if (Math.abs(newZoom - zoomLevel) > 0.05) {
        setZoomLevel(newZoom);
        // addHapticFeedback('light'); // Too frequent on zoom
      }
      return;
    }

    if (isOneHandZoomRef.current) {
      e.preventDefault();
      const deltaY = initialZoomYRef.current - e.touches[0].clientY;
      const zoomFactor = 1 + deltaY / 200; // 200px for full scale change
      const newZoom = Math.max(0.5, Math.min(5, initialZoomLevelRef.current * zoomFactor));
      
      if (Math.abs(newZoom - zoomLevel) > 0.05) {
        setZoomLevel(newZoom);
      }
      return;
    }

    if (!scrubbingRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const rawTime = getTimeFromPosition(touch.clientX);
    const snappedTime = getSnappedTime(rawTime);
    
    // Throttle seek calls to ~30fps for better performance
    const now = Date.now();
    if (now - (lastSeekTimeRef.current || 0) < 33) {
      // Update tooltip but skip seek
      setTooltipTime(snappedTime);
      setTooltipPosition((snappedTime / duration) * 100);
      return;
    }
    lastSeekTimeRef.current = now;
    
    // Haptic feedback on snap
    if (snappedTime !== rawTime && snappedTime !== lastSnappedTimeRef.current) {
      addHapticFeedback("light");
      lastSnappedTimeRef.current = snappedTime;
    } else if (snappedTime === rawTime) {
      lastSnappedTimeRef.current = null;
    }

    seek(snappedTime);
    
    setTooltipTime(snappedTime);
    setTooltipPosition((snappedTime / duration) * 100);
  }, [seek, getTimeFromPosition, duration, getSnappedTime]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (e.touches.length < 2) {
      isPinchingRef.current = false;
    }

    if (isOneHandZoomRef.current) {
      isOneHandZoomRef.current = false;
      addHapticFeedback("heavy");
      return;
    }
    
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      setIsScrubbing(false);
      setShowTimeTooltip(false);
      addHapticFeedback("medium");
    }
  }, []);

  // Mouse handling for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    scrubbingRef.current = true;
    setIsScrubbing(true);
    const rawTime = getTimeFromPosition(e.clientX);
    const snappedTime = getSnappedTime(rawTime);
    seek(snappedTime);
    setTooltipTime(snappedTime);
    setTooltipPosition((snappedTime / duration) * 100);
    setShowTimeTooltip(true);
  }, [seek, getTimeFromPosition, duration, getSnappedTime]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!scrubbingRef.current) return;
    const rawTime = getTimeFromPosition(e.clientX);
    const snappedTime = getSnappedTime(rawTime);

    if (snappedTime !== rawTime && snappedTime !== lastSnappedTimeRef.current) {
      lastSnappedTimeRef.current = snappedTime;
    } else if (snappedTime === rawTime) {
      lastSnappedTimeRef.current = null;
    }

    seek(snappedTime);
    setTooltipTime(snappedTime);
    setTooltipPosition((snappedTime / duration) * 100);
  }, [seek, getTimeFromPosition, duration, getSnappedTime]);

  const handleMouseUp = useCallback(() => {
    scrubbingRef.current = false;
    setIsScrubbing(false);
    setShowTimeTooltip(false);
  }, []);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (scrubbingRef.current) {
        scrubbingRef.current = false;
        setIsScrubbing(false);
        setShowTimeTooltip(false);
      }
    };
    
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(5, prev + 0.5));
    addHapticFeedback("light");
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(0.5, prev - 0.5));
    addHapticFeedback("light");
  }, []);

  // Playback controls
  const handleSkipBack = useCallback(() => {
    addHapticFeedback("light");
    seek(Math.max(0, currentTime - 5));
  }, [seek, currentTime]);

  const handleSkipForward = useCallback(() => {
    addHapticFeedback("light");
    seek(Math.min(duration, currentTime + 5));
  }, [seek, currentTime, duration]);

  const handleTrimStart = useCallback((e: React.PointerEvent, trackId: string, clip: any) => {
    e.stopPropagation();
    setIsTrimming("start");
    trimStartValRef.current = clip.trimStart;
    trimEndValRef.current = clip.trimEnd;
    trimStartTimeRef.current = clip.startTime;
    addHapticFeedback("medium");
    
    const startX = e.clientX;
    const handleMove = (moveEvent: PointerEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const moveDeltaX = moveEvent.clientX - startX;
      const moveDeltaTime = (moveDeltaX / rect.width) * duration;
      
      // Calculate new values with constraints
      const newTrimStart = Math.max(0, Math.min(clip.duration - clip.trimEnd - 0.5, trimStartValRef.current + moveDeltaTime));
      const actualDelta = newTrimStart - trimStartValRef.current;
      
      setTrimDelta(actualDelta);
      useTimelineStore.getState().updateClipTrim(trackId, clip.id, newTrimStart, clip.trimEnd);
      useTimelineStore.getState().updateClipStartTime(trackId, clip.id, trimStartTimeRef.current + actualDelta);
    };
    
    const handleUp = () => {
      setIsTrimming(null);
      setTrimDelta(0);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      addHapticFeedback("heavy");
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [duration]);

  const handleTrimEnd = useCallback((e: React.PointerEvent, trackId: string, clip: any) => {
    e.stopPropagation();
    setIsTrimming("end");
    trimStartValRef.current = clip.trimStart;
    trimEndValRef.current = clip.trimEnd;
    addHapticFeedback("medium");
    
    const startX = e.clientX;
    const handleMove = (moveEvent: PointerEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const moveDeltaX = moveEvent.clientX - startX;
      const moveDeltaTime = (moveDeltaX / rect.width) * duration;
      
      const newTrimEnd = Math.max(0, Math.min(clip.duration - clip.trimStart - 0.5, trimEndValRef.current - moveDeltaTime));
      setTrimDelta(- (newTrimEnd - trimEndValRef.current));
      useTimelineStore.getState().updateClipTrim(trackId, clip.id, clip.trimStart, newTrimEnd);
    };
    
    const handleUp = () => {
      setIsTrimming(null);
      setTrimDelta(0);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      addHapticFeedback("heavy");
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [duration]);

  // Clip deletion
  const handleDeleteClip = useCallback((trackId: string, clipId: string) => {
    addHapticFeedback("medium");
    removeClipFromTrack(trackId, clipId);
    setSelectedClipId(null);
  }, [removeClipFromTrack]);

  const actualExpanded = onToggleExpand ? expanded : isExpanded;
  const timelineProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Memoize expensive calculations
  const visibleTimeRange = useMemo(() => {
    const visibleDuration = duration / zoomLevel;
    const startTime = Math.max(0, currentTime - visibleDuration / 2);
    const endTime = Math.min(duration, startTime + visibleDuration);
    return { visibleDuration, startTime, endTime };
  }, [duration, zoomLevel, currentTime]);

  const { visibleDuration, startTime, endTime } = visibleTimeRange;

  if (compact) {
    return (
      <div className="bg-transparent px-4 py-3">
        <div className="mb-3 flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/10 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-primary" />
            ) : (
              <Play className="h-4 w-4 fill-primary ml-0.5" />
            )}
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
            <span className="text-[10px] font-black tabular-nums text-white/80">
              {formatTime(currentTime)}
            </span>
            <span className="text-white/20 text-[10px]">/</span>
            <span className="text-[10px] font-black tabular-nums text-white/40">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div
          ref={timelineRef}
          className="relative h-8 w-full touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
            style={{ width: `${timelineProgress}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-xl"
            style={{ left: `${timelineProgress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-transparent transition-all duration-300",
        actualExpanded ? "h-full" : "h-full"
      )}
    >
      {/* Header with playback controls - Standardized and sleek */}
      <div
        className="flex items-center justify-between h-14 bg-white/[0.02] px-5 border-b border-white/5 select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-4">
          {/* Play/Pause Button - Bigger target */}
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 border border-primary/10 shadow-none"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-primary" />
            ) : (
              <Play className="h-5 w-5 fill-primary ml-0.5" />
            )}
          </Button>

          {/* Time Display - Mono font for stability */}
          <div className="flex items-center gap-2 text-[10px] font-black bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md">
            <span className={cn("text-primary tabular-nums", !isPlaying && "text-white/80")}>
              {formatTime(currentTime)}
            </span>
            <span className="text-white/20">/</span>
            <span className="text-white/40 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Zoom controls - only when expanded, more compact */}
        {actualExpanded && (
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8 rounded-lg hover:bg-white/5"
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOut className="h-4 w-4 text-white/40" />
            </Button>
            <span className="text-[10px] font-black w-10 text-center tabular-nums text-white/60">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8 rounded-lg hover:bg-white/5"
              disabled={zoomLevel >= 5}
            >
              <ZoomIn className="h-4 w-4 text-white/40" />
            </Button>
          </div>
        )}
      </div>

      {/* Timeline content - High contrast and clear */}
      <div className="flex-1 relative overflow-hidden bg-transparent">
        {/* Scrubbing area with proper touch handling */}
        <div
          ref={timelineRef}
          className="absolute inset-0 cursor-pointer touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            touchAction: 'none',
          }}
        >
          {/* Time ruler - refined ticks */}
          <div className="absolute top-0 left-0 right-0 h-7 bg-white/[0.03] border-b border-white/5 flex items-center z-10 backdrop-blur-sm">
            {Array.from({ length: 20 }).map((_, i) => {
              const time = startTime + i * (visibleDuration / 10);
              if (time > duration) return null;
              
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-white/5 flex items-end pb-1"
                  style={{ left: `${((time - startTime) / visibleDuration) * 100}%` }}
                >
                  <span className="text-[8px] font-black text-white/20 px-2 tabular-nums">
                    {formatTime(time)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track lanes - Layered and clean */}
          <div className="absolute top-7 left-0 right-0 bottom-0">
            {tracks.length > 0 ? (
              tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="h-16 border-b border-white/[0.02] bg-transparent relative group"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                  }}
                >
                  {/* Floating Track label - Doesn't overlap with clips */}
                  <div className="absolute left-4 top-1.5 z-10 pointer-events-none">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 group-hover:text-white/30 transition-colors">
                      {track.name || `CH ${index + 1}`}
                    </span>
                  </div>

                  {/* Clips on track - Better styling */}
                  <div className="absolute inset-0">
                    {track.clips?.map((clip) => {
                      const mediaItem = mediaItems.find(m => m.id === clip.mediaId);
                      const isSelected = selectedClipId === clip.id;
                      
                      return (
                        <div
                          key={clip.id}
                          className={cn(
                            "absolute top-5 bottom-2 rounded-xl border-2 cursor-pointer transition-all shadow-lg",
                            isSelected 
                              ? "border-primary bg-primary/30 z-20 ring-4 ring-primary/10 shadow-primary/20" 
                              : "border-white/5 bg-white/[0.05] hover:bg-white/[0.08]"
                          )}
                          style={{
                            left: `${((clip.startTime - startTime) / visibleDuration) * 100}%`,
                            width: `${((clip.duration - clip.trimStart - clip.trimEnd) / visibleDuration) * 100}%`,
                            minWidth: '40px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            addHapticFeedback("light");
                          }}
                          onTouchStart={(e) => handleClipTouchStart(e, track.id, clip)}
                          onTouchEnd={handleClipTouchEnd}
                          onTouchCancel={handleClipTouchEnd}
                        >
                          {/* Contextual Floating Toolbar */}
                          <AnimatePresence>
                            {isSelected && !isTrimming && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, x: '-50%' }}
                                animate={{ opacity: 1, y: 0, x: '-50%' }}
                                exit={{ opacity: 0, y: 10, x: '-50%' }}
                                className="absolute -top-12 left-1/2 z-[60] flex items-center gap-1 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 p-1 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentGain = clip.audioGain ?? 1;
                                    const nextGain = currentGain > 0 ? 0 : 1;
                                    useTimelineStore.getState().updateClipAudioGain(track.id, clip.id, nextGain);
                                    addHapticFeedback("light");
                                    toast.success(nextGain === 0 ? "Clip muted" : "Clip unmuted");
                                  }}
                                >
                                  {(clip.audioGain ?? 1) > 0 ? <Volume2 className="h-3.5 w-3.5 text-white/70" /> : <VolumeX className="h-3.5 w-3.5 text-red-400" />}
                                </Button>
                                
                                <div className="w-px h-4 bg-white/10 mx-0.5" />
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContextMenuClip({ trackId: track.id, clip, x: e.clientX, y: e.clientY });
                                    handleSplitClip();
                                  }}
                                >
                                  <Scissors className="h-3.5 w-3.5 text-white/70" />
                                </Button>

                                <div className="w-px h-4 bg-white/10 mx-0.5" />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-red-500/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClip(track.id, clip.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Trimming Handles */}
                          {isSelected && (
                            <>
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-5 bg-white/80 rounded-l-lg z-20 cursor-ew-resize flex items-center justify-center active:bg-white"
                                onPointerDown={(e) => handleTrimStart(e, track.id, clip)}
                              >
                                <div className="w-1 h-5 bg-black/20 rounded-full" />
                              </div>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-5 bg-white/80 rounded-r-lg z-20 cursor-ew-resize flex items-center justify-center active:bg-white"
                                onPointerDown={(e) => handleTrimEnd(e, track.id, clip)}
                              >
                                <div className="w-1 h-5 bg-black/20 rounded-full" />
                              </div>
                            </>
                          )}

                          {/* Clip content */}
                          <div className="h-full flex items-center px-3 overflow-hidden">
                            {!isSelected && <GripVertical className="h-3 w-3 text-white/10 mr-2 flex-shrink-0" />}
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-tight truncate",
                              isSelected ? "text-white" : "text-white/40"
                            )}>
                              {clip.name || mediaItem?.name || "Clip"}
                            </span>
                          </div>

                          {/* Delete button when selected - Higher to avoid handles */}
                          {isSelected && !isTrimming && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-7 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full shadow-2xl border-2 border-black animate-in zoom-in-50 bg-red-500 hover:bg-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClip(track.id, clip.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/5 px-10 text-center space-y-4">
                <Sparkles className="h-10 w-10 opacity-10" />
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] block opacity-20">Timeline Empty</span>
                  <p className="text-[10px] font-bold leading-relaxed opacity-10 px-6">
                    Add media or record voice to start coining commentary.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Playhead - Professional look */}
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-primary z-30 pointer-events-none"
            style={{ left: `${((currentTime - startTime) / visibleDuration) * 100}%` }}
          >
            {/* Playhead handle - Diamond shape for precision */}
            <div className="absolute -top-1 -left-[6px] w-[13px] h-[13px] bg-primary rotate-45 rounded-sm shadow-[0_0_15px_rgba(var(--primary),0.5)] border border-white/20" />
            
            {/* Playhead Line Glow */}
            <div className="absolute inset-0 w-full bg-primary/30 blur-[2px]" />
          </div>

          {/* Scrubbing feedback tooltip — follows playhead position */}
          {showTimeTooltip && (
            <div
              className="absolute top-0 bg-primary text-white text-[11px] font-black px-4 py-2 rounded-full shadow-2xl animate-in fade-in-0 zoom-in-95 tabular-nums z-40 pointer-events-none -translate-x-1/2 border border-white/20"
              style={{
                left: `clamp(2rem, ${tooltipPosition}%, calc(100% - 2rem))`,
                top: "-3rem",
              }}
            >
              {formatTime(tooltipTime)}
            </div>
          )}
        </div>
      </div>

      {/* Modern Control Bar (Navigation hints) */}
      {actualExpanded && (
        <div className="h-10 flex items-center justify-center border-t border-white/5 bg-white/[0.02] px-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em]">Scrub</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em]">Select</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em]">Pinch Zoom</span>
            </div>
          </div>
        </div>
      )}

      {/* Clip Context Menu Overlay */}
      <AnimatePresence>
        {contextMenuClip && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
            onClick={() => setContextMenuClip(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 min-w-[240px] shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: `clamp(20px, ${contextMenuClip.x - 120}px, calc(100vw - 260px))`,
                top: `${Math.max(100, contextMenuClip.y - 180)}px`
              }}
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Clip Actions</span>
                <button onClick={() => setContextMenuClip(null)} className="text-white/20 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              
              <div className="p-1 grid grid-cols-1 gap-1">
                <button 
                  onClick={handleSplitClip}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98]"
                >
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Scissors className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Split at Playhead</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase">Cut clip into two</p>
                  </div>
                </button>

                <button 
                  onClick={handleDuplicateClip}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98]"
                >
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Copy className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Duplicate Clip</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase">Add copy to timeline</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    handleDeleteClip(contextMenuClip.trackId, contextMenuClip.clip.id);
                    setContextMenuClip(null);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-red-500/10 transition-all active:scale-[0.98]"
                >
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-400">Delete Clip</p>
                    <p className="text-[9px] font-bold text-red-400/20 uppercase">Remove from project</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
