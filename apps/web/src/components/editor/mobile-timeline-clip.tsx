"use client";

import React from '@/lib/hooks-provider';
import { useTimelineStore, type TimelineClip } from "@/stores/timeline-store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from '@/lib/hooks-provider';

interface MobileTimelineClipProps {
  trackId: string;
  clipId: string;
  zoomLevel: number;
  onTouchStart: (
    e: React.TouchEvent,
    trackId: string,
    clipId: string,
    side: "left" | "right" | null
  ) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function MobileTimelineClip({
  trackId,
  clipId,
  zoomLevel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: MobileTimelineClipProps) {
  const clip = useTimelineStore((state) =>
    state.tracks
      .find((t) => t.id === trackId)
      ?.clips.find((c) => c.id === clipId)
  );

  const track = useTimelineStore((state) =>
    state.tracks.find((t) => t.id === trackId)
  );

  const [isInteracting, setIsInteracting] = useState(false);

  if (!clip || !track) return null;

  // Calculate clip start position and width based on timeline store values
  const clipStartPosition = clip.startTime * 50 * zoomLevel;
  const clipDuration = clip.duration - clip.trimStart - clip.trimEnd;
  const clipWidth = clipDuration * 50 * zoomLevel;

  // Determine clip type for styling based on parent track type
  const clipTypeStyles = {
    video: "bg-blue-500/30 border-blue-500",
    audio: "bg-green-500/30 border-green-500",
    effects: "bg-purple-500/30 border-purple-500",
  }[track.type];

  // Handle clip interaction
  const handleClipTouchStart = (
    e: React.TouchEvent,
    side: "left" | "right" | null
  ) => {
    e.stopPropagation();
    setIsInteracting(true);
    onTouchStart(e, trackId, clipId, side);
  };

  const handleClipTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    onTouchMove(e);
  };

  const handleClipTouchEnd = () => {
    setIsInteracting(false);
    onTouchEnd();
  };

  return (
    <motion.div
      className={cn(
        "absolute top-0 bottom-0 rounded-md border-2 overflow-hidden",
        clipTypeStyles,
        isInteracting ? "z-10 opacity-100" : "z-0 opacity-90",
        "touch-none select-none"
      )}
      style={{
        left: `${clipStartPosition}px`,
        width: `${clipWidth}px`,
      }}
      animate={{
        scale: isInteracting ? 1.05 : 1,
      }}
      transition={{ duration: 0.15 }}
      onTouchStart={(e: React.TouchEvent) => handleClipTouchStart(e, null)}
      onTouchMove={handleClipTouchMove}
      onTouchEnd={handleClipTouchEnd}
    >
      {/* Clip content */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <span className="text-xs font-medium truncate px-2 text-center">
          {clip.name || `Clip ${clip.id.substring(0, 4)}`}
        </span>
      </div>

      {/* Left trim handle */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize",
          "flex items-center justify-start",
          "bg-gradient-to-r from-background/50 to-transparent"
        )}
        onTouchStart={(e) => handleClipTouchStart(e, "left")}
        onTouchMove={handleClipTouchMove}
        onTouchEnd={handleClipTouchEnd}
      >
        <div className="h-8 w-1.5 rounded-full bg-white/80 mx-1.5" />
      </div>

      {/* Right trim handle */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize",
          "flex items-center justify-end",
          "bg-gradient-to-l from-background/50 to-transparent"
        )}
        onTouchStart={(e) => handleClipTouchStart(e, "right")}
        onTouchMove={handleClipTouchMove}
        onTouchEnd={handleClipTouchEnd}
      >
        <div className="h-8 w-1.5 rounded-full bg-white/80 mx-1.5" />
      </div>
    </motion.div>
  );
}
