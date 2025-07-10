"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "@/lib/hooks-provider";
import type { TouchEvent } from "@/lib/hooks-provider";
import {
  useTouchGestures,
  TouchGestureState,
} from "@/hooks/use-touch-gestures";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { addHapticFeedback } from "@/lib/mobile-utils";

interface MomentumScrollState {
  velocity: number;
  timestamp: number;
  active: boolean;
}

export function useMobileTimeline(zoomLevel: number = 1) {
  // Timeline refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  // Momentum scrolling state
  const [momentum, setMomentum] = useState<MomentumScrollState>({
    velocity: 0,
    timestamp: 0,
    active: false,
  });

  // Stores
  const { currentTime, duration, seek } = usePlaybackStore();
  const { tracks, selectedClips, updateClipTrim, setSelectedClips } =
    useTimelineStore();

  // Touch state tracking
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isTrimming, setIsTrimming] = useState<{
    trackId: string;
    clipId: string;
    side: "left" | "right" | null;
  } | null>(null);
  const [snapPoints, setSnapPoints] = useState<number[]>([]);
  const lastTouchRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate snap points from timeline
  useEffect(() => {
    const points: number[] = [0]; // Always snap to beginning

    // Add clip boundaries as snap points
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        // Start of clip
        points.push(clip.startTime);
        // End of clip
        const endTime =
          clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
        points.push(endTime);
      });
    });

    // Add playhead position
    points.push(currentTime);

    // Sort and deduplicate
    setSnapPoints([...new Set(points)].sort((a, b) => a - b));
  }, [tracks, currentTime]);

  // Find nearest snap point
  const findNearestSnapPoint = useCallback(
    (time: number, threshold: number = 0.3): number | null => {
      // Don't snap if we're too far
      const thresholdInPixels = threshold * 50 * zoomLevel;
      const timeThreshold = thresholdInPixels / (50 * zoomLevel);

      let closestPoint = null;
      let minDistance = Infinity;

      for (const point of snapPoints) {
        const distance = Math.abs(point - time);
        if (distance < minDistance && distance <= timeThreshold) {
          minDistance = distance;
          closestPoint = point;
        }
      }

      return closestPoint;
    },
    [snapPoints, zoomLevel]
  );

  // Timeline scrubbing with playhead
  const handlePlayheadTouchStart = useCallback((e: TouchEvent) => {
    if (!timelineRef.current) return;

    e.stopPropagation();
    setIsScrubbing(true);
    addHapticFeedback("light");

    const touch = e.touches[0];
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handlePlayheadTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isScrubbing || !timelineRef.current) return;

      const touch = e.touches[0];
      const rect = timelineRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;

      // Calculate time based on position and zoom
      let time = Math.max(0, Math.min(duration, x / (50 * zoomLevel)));

      // Check for snapping
      const snappedTime = findNearestSnapPoint(time);
      if (snappedTime !== null) {
        time = snappedTime;
        // Add haptic feedback when snapping
        addHapticFeedback("light");
      }

      // Update playhead position
      seek(time);

      // Track touch for momentum
      const now = Date.now();
      const deltaX = touch.clientX - lastTouchRef.current.x;
      const deltaTime = now - momentum.timestamp;

      if (deltaTime > 0) {
        setMomentum({
          velocity: deltaX / deltaTime,
          timestamp: now,
          active: false,
        });
      }

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [
      isScrubbing,
      duration,
      zoomLevel,
      momentum.timestamp,
      seek,
      findNearestSnapPoint,
    ]
  );

  const handlePlayheadTouchEnd = useCallback(() => {
    if (!isScrubbing) return;

    setIsScrubbing(false);

    // Enable momentum scrolling if velocity is high enough
    if (Math.abs(momentum.velocity) > 0.5) {
      setMomentum((prev: MomentumScrollState) => ({
        ...prev,
        active: true,
      }));
    }
  }, [isScrubbing, momentum.velocity]);

  // Handle clip trimming interactions
  const handleClipTouchStart = useCallback(
    (
      e: TouchEvent,
      trackId: string,
      clipId: string,
      side: "left" | "right" | null
    ) => {
      e.stopPropagation();

      // Only allow trimming edges
      if (side) {
        setIsTrimming({ trackId, clipId, side });
        addHapticFeedback("medium");

        // Select this clip
        setSelectedClips([{ trackId, clipId }]);

        const touch = e.touches[0];
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      }
    },
    [setSelectedClips]
  );

  const handleClipTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isTrimming || !trackAreaRef.current) return;

      const { trackId, clipId, side } = isTrimming;
      const track = tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);

      if (!clip) return;

      const touch = e.touches[0];
      const rect = trackAreaRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const deltaX = touch.clientX - lastTouchRef.current.x;

      // Convert pixels to seconds based on zoom level
      const deltaTime = deltaX / (50 * zoomLevel);

      // Calculate new trim values
      if (side === "left") {
        // Adjust trim start (left side)
        const currentTrimStart = clip.trimStart;
        const newTrimStart = Math.max(
          0,
          Math.min(
            clip.duration - clip.trimEnd - 0.5,
            currentTrimStart - deltaTime
          )
        );

        // Apply the trim
        updateClipTrim(trackId, clipId, newTrimStart, clip.trimEnd);
      } else if (side === "right") {
        // Adjust trim end (right side)
        const currentTrimEnd = clip.trimEnd;
        const newTrimEnd = Math.max(
          0,
          Math.min(
            clip.duration - clip.trimStart - 0.5,
            currentTrimEnd + deltaTime
          )
        );

        // Apply the trim
        updateClipTrim(trackId, clipId, clip.trimStart, newTrimEnd);
      }

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [isTrimming, tracks, zoomLevel, updateClipTrim]
  );

  const handleClipTouchEnd = useCallback(() => {
    if (isTrimming) {
      setIsTrimming(null);
      addHapticFeedback("light");
    }
  }, [isTrimming]);

  // Apply momentum scrolling
  useEffect(() => {
    if (!momentum.active || Math.abs(momentum.velocity) < 0.01) {
      if (momentum.active) {
        setMomentum((prev: MomentumScrollState) => ({
          ...prev,
          active: false,
        }));
      }
      return;
    }

    const momentumScroll = () => {
      // Apply momentum with decay
      let newTime = currentTime + momentum.velocity * 0.05;

      // Bounds check
      newTime = Math.max(0, Math.min(duration, newTime));

      // Apply snap during momentum scrolling
      const snappedTime = findNearestSnapPoint(newTime, 0.5);
      if (snappedTime !== null) {
        newTime = snappedTime;
        // Stop momentum when snapping
        setMomentum((prev: MomentumScrollState) => ({
          ...prev,
          active: false,
        }));
        addHapticFeedback("light");
      }

      // Update position
      seek(newTime);

      // Decay velocity
      setMomentum((prev: MomentumScrollState) => ({
        ...prev,
        velocity: prev.velocity * 0.95,
      }));
    };

    const id = requestAnimationFrame(momentumScroll);
    return () => cancelAnimationFrame(id);
  }, [momentum, currentTime, duration, seek, findNearestSnapPoint]);

  // Gestures for horizontal scrolling
  const { gestureHandlers: timelineGestureHandlers } = useTouchGestures(
    {
      onPan: (state: TouchGestureState) => {
        if (isScrubbing || isTrimming) return;

        // Scroll the timeline horizontally
        if (timelineRef.current) {
          timelineRef.current.scrollLeft -= state.deltaX;
        }
      },
    },
    {
      enablePan: true,
      enableSwipe: false,
      enablePinch: false,
    }
  );

  return {
    timelineRef,
    trackAreaRef,
    isScrubbing,
    isTrimming,
    timelineGestureHandlers,
    handlePlayheadTouchStart,
    handlePlayheadTouchMove,
    handlePlayheadTouchEnd,
    handleClipTouchStart,
    handleClipTouchMove,
    handleClipTouchEnd,
  };
}
