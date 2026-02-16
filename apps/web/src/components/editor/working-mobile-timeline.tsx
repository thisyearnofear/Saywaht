/**
 * WORKING MOBILE TIMELINE
 * Enhanced mobile timeline with improved touch handling and visual feedback
 */

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
  GripVertical
} from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { formatTime } from "@/lib/utils";

interface WorkingMobileTimelineProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function WorkingMobileTimeline({
  expanded = false,
  onToggleExpand,
}: WorkingMobileTimelineProps) {
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
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef<boolean>(false);

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
    scrubbingRef.current = true;
    setIsScrubbing(true);
    addHapticFeedback("light");
    
    const touch = e.touches[0];
    const newTime = getTimeFromPosition(touch.clientX);
    seek(newTime);
    
    setTooltipTime(newTime);
    setTooltipPosition((newTime / duration) * 100);
    setShowTimeTooltip(true);
  }, [seek, getTimeFromPosition, duration]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!scrubbingRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const newTime = getTimeFromPosition(touch.clientX);
    seek(newTime);
    
    setTooltipTime(newTime);
    setTooltipPosition((newTime / duration) * 100);
  }, [seek, getTimeFromPosition, duration]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    scrubbingRef.current = false;
    setIsScrubbing(false);
    setShowTimeTooltip(false);
    addHapticFeedback("medium");
  }, []);

  // Mouse handling for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    scrubbingRef.current = true;
    setIsScrubbing(true);
    const newTime = getTimeFromPosition(e.clientX);
    seek(newTime);
    setTooltipTime(newTime);
    setTooltipPosition((newTime / duration) * 100);
    setShowTimeTooltip(true);
  }, [seek, getTimeFromPosition, duration]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!scrubbingRef.current) return;
    const newTime = getTimeFromPosition(e.clientX);
    seek(newTime);
    setTooltipTime(newTime);
    setTooltipPosition((newTime / duration) * 100);
  }, [seek, getTimeFromPosition, duration]);

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

  // Clip deletion
  const handleDeleteClip = useCallback((trackId: string, clipId: string) => {
    addHapticFeedback("medium");
    removeClipFromTrack(trackId, clipId);
    setSelectedClipId(null);
  }, [removeClipFromTrack]);

  const actualExpanded = onToggleExpand ? expanded : isExpanded;

  // Calculate visible time range based on zoom
  const visibleDuration = duration / zoomLevel;
  const startTime = Math.max(0, currentTime - visibleDuration / 2);
  const endTime = Math.min(duration, startTime + visibleDuration);

  return (
    <div
      className={cn(
        "flex flex-col bg-background transition-all duration-300",
        actualExpanded ? "h-full" : "h-full"
      )}
    >
      {/* Header with playback controls */}
      <div
        className="flex items-center justify-between h-14 bg-muted/50 px-3 border-b border-border select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Skip Buttons */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleSkipBack();
              }}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleSkipForward();
              }}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-1 text-sm font-mono bg-background/50 px-2 py-1 rounded">
            <span className={cn("font-medium", isPlaying && "text-primary")}>
              {formatTime(currentTime)}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Zoom controls - only when expanded */}
        {actualExpanded && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8"
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs min-w-[3rem] text-center font-mono">
              {zoomLevel.toFixed(1)}x
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8"
              disabled={zoomLevel >= 5}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Timeline content */}
      <div className="flex-1 relative overflow-hidden">
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
            touchAction: 'none', // Prevent scrolling while scrubbing
          }}
        >
          {/* Time ruler */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-muted/30 border-b border-border flex items-center">
            {Array.from({ length: Math.min(10, Math.ceil(visibleDuration / 1) + 1) }).map((_, i) => {
              const time = startTime + i * (visibleDuration / 10);
              if (time > duration) return null;
              
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-border/50 flex items-end pb-1"
                  style={{ left: `${((time - startTime) / visibleDuration) * 100}%` }}
                >
                  <span className="text-[10px] text-muted-foreground px-1">
                    {formatTime(time)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track lanes */}
          <div className="absolute top-8 left-0 right-0 bottom-0">
            {tracks.length > 0 ? (
              tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="h-12 border-b border-border/30 bg-background/50 relative"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'hsl(var(--muted) / 0.3)' : 'transparent'
                  }}
                >
                  {/* Track label */}
                  <div className="absolute left-0 top-0 bottom-0 w-20 bg-background/80 border-r border-border/30 flex items-center px-2 z-10">
                    <span className="text-xs text-muted-foreground truncate">
                      {track.name || `Track ${index + 1}`}
                    </span>
                  </div>

                  {/* Clips on track */}
                  <div className="absolute left-20 right-0 top-0 bottom-0">
                    {track.clips?.map((clip) => {
                      const mediaItem = mediaItems.find(m => m.id === clip.mediaId);
                      const isSelected = selectedClipId === clip.id;
                      
                      return (
                        <div
                          key={clip.id}
                          className={cn(
                            "absolute top-1 bottom-1 rounded border-2 cursor-pointer transition-all",
                            isSelected 
                              ? "border-primary bg-primary/10" 
                              : "border-border bg-muted/50 hover:bg-muted"
                          )}
                          style={{
                            left: `${((clip.startTime - startTime) / visibleDuration) * 100}%`,
                            width: `${(clip.duration / visibleDuration) * 100}%`,
                            minWidth: '20px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            addHapticFeedback("light");
                          }}
                        >
                          {/* Clip content */}
                          <div className="h-full flex items-center px-2 overflow-hidden">
                            <GripVertical className="h-3 w-3 text-muted-foreground mr-1 flex-shrink-0" />
                            <span className="text-xs truncate">
                              {clip.name || mediaItem?.name || "Clip"}
                            </span>
                          </div>

                          {/* Delete button when selected */}
                          {isSelected && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClip(track.id, clip.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-12 border-b border-border/30 flex items-center justify-center text-muted-foreground">
                <span className="text-xs">No tracks available</span>
              </div>
            )}
          </div>

          {/* Current time indicator (playhead) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: `${((currentTime - startTime) / visibleDuration) * 100}%` }}
          >
            {/* Playhead handle */}
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
            
            {/* Time tooltip */}
            {showTimeTooltip && (
              <div 
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
              >
                {formatTime(tooltipTime)}
              </div>
            )}
          </div>

          {/* Scrubbing feedback */}
          {isScrubbing && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-sm font-mono shadow-lg">
              {formatTime(currentTime)}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {actualExpanded && (
        <div className="h-8 flex items-center justify-center border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Tap and drag to scrub • Tap clips to select • Double tap to delete
          </p>
        </div>
      )}
    </div>
  );
}
