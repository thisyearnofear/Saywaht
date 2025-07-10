"use client";

import React from '@/lib/hooks-provider';
import { useTimelineStore, type TimelineTrack } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";
import { MobileTimelineClip } from "./mobile-timeline-clip";

interface MobileTimelineTrackProps {
  track: TimelineTrack;
  zoomLevel: number;
  onClipTouchStart: (
    e: React.TouchEvent,
    trackId: string,
    clipId: string,
    side: "left" | "right" | null
  ) => void;
  onClipTouchMove: (e: React.TouchEvent) => void;
  onClipTouchEnd: () => void;
}

export function MobileTimelineTrack({
  track,
  zoomLevel,
  onClipTouchStart,
  onClipTouchMove,
  onClipTouchEnd,
}: MobileTimelineTrackProps) {
  const { currentTime } = usePlaybackStore();
  const trackColor =
    track.type === "video"
      ? "bg-blue-500/20"
      : track.type === "audio"
        ? "bg-green-500/20"
        : "bg-purple-500/20";

  return (
    <div
      className={cn(
        "relative h-full w-full",
        track.muted ? "opacity-50" : "",
        trackColor
      )}
    >
      {/* Track background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-transparent" />

      {/* Clips */}
      {track.clips.map((clip) => (
        <MobileTimelineClip
          key={clip.id}
          trackId={track.id}
          clipId={clip.id}
          zoomLevel={zoomLevel}
          onTouchStart={onClipTouchStart}
          onTouchMove={onClipTouchMove}
          onTouchEnd={onClipTouchEnd}
        />
      ))}

      {/* Current time indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
        style={{ left: `${currentTime * 50 * zoomLevel}px` }}
      />
    </div>
  );
}
