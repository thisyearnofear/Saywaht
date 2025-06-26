"use client";

import { useRef, useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface AudioPlayerProps {
  src: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
}

export function AudioPlayer({
  src,
  clipStartTime,
  trimStart,
  trimEnd,
  clipDuration,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isPlaying, currentTime, volume, speed, muted } = usePlaybackStore();

  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange =
    currentTime >= clipStartTime && currentTime < clipEndTime;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isInClipRange) return;

    const handleSeekEvent = (e: CustomEvent) => {
      const timelineTime = e.detail.time;
      const audioTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );
      audio.currentTime = audioTime;
    };

    const handleUpdateEvent = (e: CustomEvent) => {
      const timelineTime = e.detail.time;
      const targetTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );

      if (Math.abs(audio.currentTime - targetTime) > 0.5) {
        audio.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      audio.playbackRate = e.detail.speed;
    };

    window.addEventListener("playback-seek", handleSeekEvent as EventListener);
    window.addEventListener(
      "playback-update",
      handleUpdateEvent as EventListener
    );
    window.addEventListener("playback-speed", handleSpeed as EventListener);

    return () => {
      window.removeEventListener(
        "playback-seek",
        handleSeekEvent as EventListener
      );
      window.removeEventListener(
        "playback-update",
        handleUpdateEvent as EventListener
      );
      window.removeEventListener(
        "playback-speed",
        handleSpeed as EventListener
      );
    };
  }, [clipStartTime, trimStart, trimEnd, clipDuration, isInClipRange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && isInClipRange) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, isInClipRange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted;
    audio.playbackRate = speed;
  }, [volume, speed, muted]);

  return <audio ref={audioRef} src={src} playsInline preload="auto" />;
}
