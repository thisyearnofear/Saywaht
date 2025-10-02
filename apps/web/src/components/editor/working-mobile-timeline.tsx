/**
 * WORKING MOBILE TIMELINE
 * Simple, functional mobile timeline that fixes touch gesture conflicts
 * Following ENHANCEMENT FIRST principle - addresses user complaints directly
 */

"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";

interface WorkingMobileTimelineProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function WorkingMobileTimeline({
  expanded = false,
  onToggleExpand,
}: WorkingMobileTimelineProps) {
  // CLEAN: Connect to real stores
  const { currentTime, duration, seek } = usePlaybackStore();
  const { tracks } = useTimelineStore();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);

  // CLEAN: Simple toggle
  const handleToggle = useCallback(() => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  }, [onToggleExpand, isExpanded]);

  // PERFORMANT: Touch handling that prevents conflicts
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // CLEAN: Prevent event bubbling to avoid conflicts
    e.stopPropagation();
    setIsScrubbing(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isScrubbing || !timelineRef.current || !seek) return;
    
    // CLEAN: Prevent default to avoid scroll conflicts
    e.preventDefault();
    e.stopPropagation();
    
    const rect = timelineRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const newTime = position * duration;
    
    seek(newTime);
  }, [isScrubbing, duration, seek]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsScrubbing(false);
  }, []);

  // MODULAR: Simple zoom controls
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(3, prev + 0.5));
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(0.5, prev - 0.5));
  }, []);

  // CLEAN: Format time
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const actualExpanded = onToggleExpand ? expanded : isExpanded;

  return (
    <div
      className={cn(
        "border-t border-border transition-all duration-300 bg-background",
        actualExpanded ? "h-64" : "h-16"
      )}
    >
      {/* Header - CLEAN: Simple click handler */}
      <div
        className="flex items-center justify-between h-16 bg-muted px-4 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {actualExpanded ? "↓" : "↑"} Timeline
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* MODULAR: Zoom controls only when expanded */}
        {actualExpanded && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              −
            </Button>
            <span className="text-xs min-w-[3rem] text-center">
              {zoomLevel.toFixed(1)}x
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              +
            </Button>
          </div>
        )}
      </div>

      {/* PERFORMANT: Timeline content only when expanded */}
      {actualExpanded && (
        <div className="h-48 bg-background border-t relative">
          {/* CLEAN: Scrubbing area with proper touch handling */}
          <div
            ref={timelineRef}
            className="absolute inset-0 cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              touchAction: 'pan-x', // PERFORMANT: Allow horizontal pan only
            }}
          >
            {/* Timeline ruler */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-muted/30 border-b border-border">
              {Array.from({ length: Math.ceil(duration / 10) + 1 }).map((_, i) => {
                const time = i * 10;
                if (time > duration) return null;
                
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-border/50"
                    style={{ left: `${(time / duration) * 100}%` }}
                  >
                    <span className="text-xs text-muted-foreground px-1 leading-8">
                      {formatTime(time)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* MODULAR: Track lanes */}
            <div className="pt-8 space-y-0">
              {tracks.length > 0 ? (
                tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="h-10 border-b border-border/30 bg-background/50 flex items-center px-2"
                  >
                    <span className="text-xs text-muted-foreground truncate">
                      {track.name || `Track ${index + 1}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-10 border-b border-border/30 bg-background/50 flex items-center px-2">
                  <span className="text-xs text-muted-foreground">
                    No tracks available
                  </span>
                </div>
              )}
            </div>

            {/* CLEAN: Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              {/* Playhead handle */}
              <div className="absolute top-2 -left-1 w-2 h-4 bg-red-500 rounded-sm" />
            </div>

            {/* PERFORMANT: Scrubbing feedback */}
            {isScrubbing && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-3 py-1 rounded-md text-sm font-mono">
                {formatTime(currentTime)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}