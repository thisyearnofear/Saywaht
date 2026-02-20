import type { TimelineTrack } from "@/stores/timeline-store";

// Track color definitions - adapted for your track types
export const TRACK_COLORS: Record<
  "video" | "audio" | "effects",
  { solid: string; background: string; border: string }
> = {
  video: {
    solid: "bg-blue-500",
    background: "bg-blue-100",
    border: "border-blue-300",
  },
  audio: {
    solid: "bg-green-500",
    background: "bg-green-100", 
    border: "border-green-300",
  },
  effects: {
    solid: "bg-purple-500",
    background: "bg-purple-100",
    border: "border-purple-300",
  },
} as const;

// Utility functions
export function getTrackColors(type: "video" | "audio" | "effects") {
  return TRACK_COLORS[type];
}

export function getTrackElementClasses(type: "video" | "audio" | "effects") {
  const colors = getTrackColors(type);
  return `${colors.background} ${colors.border}`;
}

// Track height definitions
export const TRACK_HEIGHTS: Record<"video" | "audio" | "effects", number> = {
  video: 60,
  audio: 50,
  effects: 40,
} as const;

// Utility function for track heights
export function getTrackHeight(type: "video" | "audio" | "effects"): number {
  return TRACK_HEIGHTS[type];
}

// Calculate cumulative height up to (but not including) a track index
export function getCumulativeHeightBefore(
  tracks: Array<{ type: "video" | "audio" | "effects" }>,
  trackIndex: number
): number {
  const GAP = 4; // 4px gap between tracks (equivalent to Tailwind's gap-1)
  return tracks
    .slice(0, trackIndex)
    .reduce((sum, track) => sum + getTrackHeight(track.type) + GAP, 0);
}

// Calculate total height of all tracks
export function getTotalTracksHeight(
  tracks: Array<{ type: "video" | "audio" | "effects" }>
): number {
  const GAP = 4; // 4px gap between tracks (equivalent to Tailwind's gap-1)
  const tracksHeight = tracks.reduce(
    (sum, track) => sum + getTrackHeight(track.type),
    0
  );
  const gapsHeight = Math.max(0, tracks.length - 1) * GAP; // n-1 gaps for n tracks
  return tracksHeight + gapsHeight;
}

// Other timeline constants
export const TIMELINE_CONSTANTS = {
  ELEMENT_MIN_WIDTH: 80,
  PIXELS_PER_SECOND: 50,
  TRACK_HEIGHT: 60, // Default fallback
  DEFAULT_CLIP_DURATION: 5,
  MAX_RECORDING_DURATION: 10,
  ZOOM_LEVELS: [0.25, 0.5, 1, 1.5, 2, 3, 4],
} as const;

// FPS presets for project settings
export const FPS_PRESETS = [
  { value: "24", label: "24 fps" },
  { value: "25", label: "25 fps" },
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
  { value: "120", label: "120 fps" },
] as const;

// Frame snapping utilities
export function timeToFrame(time: number, fps: number): number {
  return Math.round(time * fps);
}

export function frameToTime(frame: number, fps: number): number {
  return frame / fps;
}

export function snapTimeToFrame(time: number, fps: number): number {
  if (fps <= 0) return time; // Fallback for invalid FPS
  const frame = timeToFrame(time, fps);
  return frameToTime(frame, fps);
}

export function getFrameDuration(fps: number): number {
  return 1 / fps;
}
