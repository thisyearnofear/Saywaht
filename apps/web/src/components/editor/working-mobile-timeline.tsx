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
  GripVertical,
  Sparkles
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
      {/* Header with playback controls - Standardized and sleek */}
      <div
        className="flex items-center justify-between h-14 bg-muted/20 px-4 border-b border-border/50 select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          {/* Play/Pause Button - Bigger target */}
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none"
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
          <div className="flex items-center gap-1.5 text-xs font-bold bg-background/50 px-3 py-1.5 rounded-full border border-border/30">
            <span className={cn("text-primary tabular-nums", !isPlaying && "text-foreground")}>
              {formatTime(currentTime)}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Zoom controls - only when expanded, more compact */}
        {actualExpanded && (
          <div className="flex items-center bg-muted/40 p-1 rounded-full border border-border/20">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-7 w-7 rounded-full"
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] font-black w-10 text-center tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-7 w-7 rounded-full"
              disabled={zoomLevel >= 5}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        
        {!actualExpanded && (
          <div className="flex items-center gap-1 text-muted-foreground/40">
            <SkipBack className="h-3 w-3" />
            <div className="w-8 h-0.5 bg-border/50 rounded-full" />
            <SkipForward className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Timeline content - High contrast and clear */}
      <div className="flex-1 relative overflow-hidden bg-muted/5">
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
          <div className="absolute top-0 left-0 right-0 h-6 bg-muted/40 border-b border-border/30 flex items-center z-10">
            {Array.from({ length: 20 }).map((_, i) => {
              const time = startTime + i * (visibleDuration / 10);
              if (time > duration) return null;
              
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-border/40 flex items-end pb-0.5"
                  style={{ left: `${((time - startTime) / visibleDuration) * 100}%` }}
                >
                  <span className="text-[8px] font-bold text-muted-foreground/60 px-1 tabular-nums">
                    {formatTime(time)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track lanes - Layered and clean */}
          <div className="absolute top-6 left-0 right-0 bottom-0">
            {tracks.length > 0 ? (
              tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="h-14 border-b border-border/10 bg-background/20 relative group"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'hsl(var(--muted) / 0.1)' : 'transparent'
                  }}
                >
                  {/* Floating Track label - Doesn't overlap with clips */}
                  <div className="absolute left-3 top-1 z-10 pointer-events-none">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
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
                            "absolute top-4 bottom-1.5 rounded-lg border-2 cursor-pointer transition-all shadow-sm",
                            isSelected 
                              ? "border-primary bg-primary/20 z-20 ring-4 ring-primary/10" 
                              : "border-muted-foreground/10 bg-muted/60 hover:bg-muted/80"
                          )}
                          style={{
                            left: `${((clip.startTime - startTime) / visibleDuration) * 100}%`,
                            width: `${(clip.duration / visibleDuration) * 100}%`,
                            minWidth: '32px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            addHapticFeedback("light");
                          }}
                        >
                          {/* Clip content */}
                          <div className="h-full flex items-center px-2 overflow-hidden">
                            <GripVertical className="h-3 w-3 text-muted-foreground/40 mr-1.5 flex-shrink-0" />
                            <span className="text-[10px] font-bold truncate text-foreground/80">
                              {clip.name || mediaItem?.name || "Clip"}
                            </span>
                          </div>

                          {/* Delete button when selected - Bigger touch target */}
                          {isSelected && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-3 -right-3 h-7 w-7 rounded-full shadow-lg border-2 border-background animate-in zoom-in-50"
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
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 px-8 text-center space-y-3">
                <Sparkles className="h-8 w-8 opacity-20" />
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest block opacity-40">Timeline Empty</span>
                  <p className="text-[9px] font-bold leading-relaxed opacity-30">
                    Add a template from the library or record your voice to start coining commentary.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Playhead - Professional look */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none"
            style={{ left: `${((currentTime - startTime) / visibleDuration) * 100}%` }}
          >
            {/* Playhead handle - Diamond shape for precision */}
            <div className="absolute -top-1 -left-[5px] w-[11px] h-[11px] bg-primary rotate-45 rounded-sm shadow-md" />
            
            {/* Playhead Line Glow */}
            <div className="absolute inset-0 w-full bg-primary/20 blur-[1px]" />
          </div>

          {/* Scrubbing feedback tooltip */}
          {showTimeTooltip && (
            <div 
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 tabular-nums"
            >
              {formatTime(tooltipTime)}
            </div>
          )}
        </div>
      </div>

      {/* Modern Control Bar (Navigation hints) */}
      {actualExpanded && (
        <div className="h-10 flex items-center justify-center border-t border-border/30 bg-muted/10 px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest">Scrub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest">Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest">Pinch Zoom</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
