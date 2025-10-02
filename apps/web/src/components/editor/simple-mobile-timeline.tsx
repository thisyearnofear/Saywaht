/**
 * SIMPLE MOBILE TIMELINE
 * Basic mobile timeline without complex dependencies
 * Following ENHANCEMENT FIRST and CLEAN principles
 */

"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";

interface SimpleMobileTimelineProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function SimpleMobileTimeline({
  expanded = false,
  onToggleExpand,
}: SimpleMobileTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const { currentTime, duration, seek } = usePlaybackStore();
  const { tracks } = useTimelineStore();

  // CLEAN: Simple toggle function
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // PERFORMANT: Simple touch handling for scrubbing
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsScrubbing(true);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScrubbing || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const position = (touch.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, position * duration));
    
    seek(newTime);
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsScrubbing(false);
  };

  // MODULAR: Simple zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.5));
  };

  // CLEAN: Format time display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const actualExpanded = onToggleExpand ? expanded : isExpanded;

  return (
    <div
      className={cn(
        "border-t border-border transition-all duration-300",
        actualExpanded ? "h-64" : "h-16"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between h-16 bg-muted px-4 cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {actualExpanded ? "↓" : "↑"} Timeline
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {actualExpanded && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
            >
              -
            </Button>
            <span className="text-xs">{zoomLevel.toFixed(1)}x</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
            >
              +
            </Button>
          </div>
        )}
      </div>

      {/* Timeline Content */}
      {actualExpanded && (
        <div className="h-48 bg-background border-t">
          <div
            ref={timelineRef}
            className="relative w-full h-full overflow-x-auto touch-pan-x"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              width: `${Math.max(100, duration * 50 * zoomLevel)}%`,
            }}
          >
            {/* Timeline ruler */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-muted/30 border-b">
              {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-border"
                  style={{ left: `${(i / duration) * 100}%` }}
                >
                  <span className="text-xs text-muted-foreground px-1">
                    {formatTime(i)}
                  </span>
                </div>
              ))}
            </div>

            {/* Tracks */}
            <div className="pt-8">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="h-12 border-b border-border bg-background/50"
                  style={{ top: `${index * 48 + 32}px` }}
                >
                  <div className="flex items-center h-full px-2">
                    <span className="text-xs text-muted-foreground">
                      {track.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />

            {/* Scrubbing indicator */}
            {isScrubbing && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                {formatTime(currentTime)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}