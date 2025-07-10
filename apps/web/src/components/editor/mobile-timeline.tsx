"use client";

import React from "@/lib/hooks-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
// Import a core set of icons that we know work
import {
  LuChevronUp as ChevronUp,
  LuChevronDown as ChevronDown,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useMobileContext } from "@/contexts/mobile-context";
import { useTouchGestures } from "@/hooks/use-touch-gestures";
import { useMobileTimeline } from "@/hooks/use-mobile-timeline";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { MobileTimelineTrack } from "./mobile-timeline-track";
import { useState } from "@/lib/hooks-provider";

interface MobileTimelineProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function MobileTimeline({
  expanded = false,
  onToggleExpand,
}: MobileTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const { orientation } = useMobileContext();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const { currentTime, duration } = usePlaybackStore();
  const { tracks } = useTimelineStore();

  // Mobile timeline hook provides the touch interactions
  const {
    timelineRef,
    trackAreaRef,
    isScrubbing,
    timelineGestureHandlers,
    handlePlayheadTouchStart,
    handlePlayheadTouchMove,
    handlePlayheadTouchEnd,
    handleClipTouchStart,
    handleClipTouchMove,
    handleClipTouchEnd,
  } = useMobileTimeline(zoomLevel);

  // Use the provided toggle function or the internal state
  const handleToggle = () => {
    addHapticFeedback("light");
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // Touch gestures for expanding/collapsing the timeline panel
  const { gestureHandlers } = useTouchGestures(
    {
      onSwipeUp: () => {
        if (!actualExpanded) {
          handleToggle();
        }
      },
      onSwipeDown: () => {
        if (actualExpanded) {
          handleToggle();
        }
      },
    },
    {
      enableSwipe: true,
      threshold: 50,
      velocityThreshold: 0.3,
    }
  );

  // Determine the actual expanded state
  const actualExpanded = onToggleExpand ? expanded : isExpanded;

  // Calculate height based on expanded state and orientation
  const getTimelineHeight = () => {
    if (actualExpanded) {
      return orientation === "portrait" ? "50vh" : "70vh";
    }
    return "120px";
  };

  // Handle zoom level changes
  const handleZoomIn = () => {
    setZoomLevel((prev: number) => Math.min(10, prev + 0.5));
    addHapticFeedback("light");
  };

  const handleZoomOut = () => {
    setZoomLevel((prev: number) => Math.max(0.5, prev - 0.5));
    addHapticFeedback("light");
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "border-t border-border transition-all duration-300 ease-in-out",
        actualExpanded ? "flex-1" : "flex-none"
      )}
      style={{ height: getTimelineHeight() }}
    >
      {/* Header with expand/collapse control */}
      <div
        className="flex items-center justify-between h-12 bg-muted cursor-pointer touch-manipulation select-none active:bg-muted/80 transition-colors px-2"
        style={{ minHeight: "48px" }}
        {...gestureHandlers}
      >
        <div className="flex items-center" onClick={handleToggle}>
          {actualExpanded ? (
            <>
              <ChevronDown size={16}  />
              <span className="text-xs">Collapse Timeline</span>
            </>
          ) : (
            <>
              <div className="h-4 w-4 mr-1">
                <ChevronUp size={16} />
              </div>
              <span className="text-xs">Expand Timeline</span>
            </>
          )}
        </div>

        {/* Timeline Controls */}
        {actualExpanded && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleZoomOut}
            >
              <span className="text-xs">-</span>
            </Button>
            <span className="text-xs font-mono">{zoomLevel.toFixed(1)}x</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleZoomIn}
            >
              <span className="text-xs">+</span>
            </Button>
          </div>
        )}
      </div>

      {/* Current time display */}
      {actualExpanded && (
        <div className="flex items-center justify-between px-3 py-1 bg-background border-y border-border">
          <div className="flex items-center">
            <span className="text-xs font-mono text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <Button variant="ghost" size="sm" className="h-6 text-xs">
            Split
          </Button>
        </div>
      )}

      {/* Timeline Content */}
      <div
        className="h-[calc(100%-48px)]"
        style={{
          height: actualExpanded
            ? `calc(100% - ${actualExpanded ? "78px" : "48px"})`
            : "calc(100% - 48px)",
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden"
          ref={timelineRef}
          {...timelineGestureHandlers}
        >
          <div
            className="absolute inset-0 touch-manipulation"
            onTouchStart={handlePlayheadTouchStart}
            onTouchMove={handlePlayheadTouchMove}
            onTouchEnd={handlePlayheadTouchEnd}
            ref={trackAreaRef}
          >
            {/* Render mobile timeline tracks */}
            <div className="relative w-full h-full">
              {tracks.map((track) => (
                <MobileTimelineTrack
                  key={track.id}
                  track={track}
                  zoomLevel={zoomLevel}
                  onClipTouchStart={handleClipTouchStart}
                  onClipTouchMove={handleClipTouchMove}
                  onClipTouchEnd={handleClipTouchEnd}
                />
              ))}

              {/* Timeline ruler */}
              <div className="absolute top-0 left-0 right-0 h-6 border-b border-border bg-muted/30 pointer-events-none">
                {/* Time markers */}
                {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-border flex items-end"
                    style={{ left: `${i * 50 * zoomLevel}px` }}
                  >
                    <span className="text-[10px] text-muted-foreground px-1 pb-0.5">
                      {formatTime(i)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: `${currentTime * 50 * zoomLevel}px` }}
              />
            </div>

            {/* Overlay instructions when in scrubbing mode */}
            {isScrubbing && (
              <div className="absolute bottom-2 left-0 right-0 mx-auto w-max bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs pointer-events-none border border-border shadow-md">
                <span>Drag to scrub • Release for momentum</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
