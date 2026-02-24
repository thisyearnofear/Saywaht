"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
  muteAudio?: boolean;
  clipSpeed?: number;
  clipReversed?: boolean;
  objectFit?: "contain" | "cover";
  cssFilter?: string;
  clipAudioGain?: number;
}

export function VideoPlayer({
  src,
  poster,
  className = "",
  clipStartTime,
  trimStart,
  trimEnd,
  clipDuration,
  muteAudio = false,
  clipSpeed,
  clipReversed = false,
  objectFit = "contain",
  cssFilter,
  clipAudioGain = 1,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const { isPlaying, currentTime, volume, speed, muted, setStalled } = usePlaybackStore();
  
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Calculate effective speed (per-clip override or global)
  const effectiveSpeed = clipSpeed ?? speed;
  const finalSpeed = clipReversed ? -Math.abs(effectiveSpeed) : effectiveSpeed;

  // Calculate if we're within this clip's timeline range
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange = currentTime >= clipStartTime && currentTime < clipEndTime;

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const armLoadTimeout = useCallback(() => {
    clearLoadTimeout();
    loadTimeoutRef.current = window.setTimeout(() => {
      if ((videoRef.current?.readyState ?? 0) < 2) {
        setHasError(true);
        setErrorMessage("Video load timed out");
        setStalled(false);
      }
    }, 8000);
  }, [clearLoadTimeout, setStalled]);

  // Handle video ready and stalled states
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      clearLoadTimeout();
      setIsVideoReady(true);
      setHasError(false);
      setErrorMessage("");
      if (isPlaying && isInClipRange) {
        setStalled(false);
      }
    };

    const handleWaiting = () => {
      if (isPlaying && isInClipRange) {
        setStalled(true);
      }
    };

    const handlePlaying = () => {
      setStalled(false);
    };

    const handleLoadStart = () => {
      setIsVideoReady(false);
      setHasError(false);
      setErrorMessage("");
      armLoadTimeout();
    };

    const handleError = (e: Event) => {
      clearLoadTimeout();
      setIsVideoReady(false);
      setHasError(true);
      setStalled(false);
      const mediaError = (e.currentTarget as HTMLVideoElement | null)?.error;
      setErrorMessage(mediaError?.message || "Failed to load video");
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('error', handleError);

    // Initial check
    if (video.readyState >= 2) {
      setIsVideoReady(true);
    }

    return () => {
      clearLoadTimeout();
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('error', handleError);
    };
  }, [src, isPlaying, isInClipRange, setStalled, armLoadTimeout, clearLoadTimeout]);

  useEffect(() => {
    // Hard reset on source changes.
    setIsVideoReady(false);
    setHasError(false);
    setErrorMessage("");
    setStalled(false);
  }, [src, setStalled]);

  // Sync playback events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeekEvent = (e: CustomEvent) => {
      const timelineTime = e.detail.time;
      const videoTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );
      video.currentTime = videoTime;
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

      if (Math.abs(video.currentTime - targetTime) > 0.15) {
        video.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      video.playbackRate = e.detail.speed;
    };

    if (video) {
      const initialVideoTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          currentTime - clipStartTime + trimStart
        )
      );
      video.currentTime = initialVideoTime;
    }

    window.addEventListener("playback-seek", handleSeekEvent as EventListener);
    window.addEventListener("playback-update", handleUpdateEvent as EventListener);
    window.addEventListener("playback-speed", handleSpeed as EventListener);

    return () => {
      window.removeEventListener("playback-seek", handleSeekEvent as EventListener);
      window.removeEventListener("playback-update", handleUpdateEvent as EventListener);
      window.removeEventListener("playback-speed", handleSpeed as EventListener);
    };
  }, [clipStartTime, trimStart, trimEnd, clipDuration, currentTime]);

  // Sync playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && isInClipRange) {
      if (video.readyState >= 2) {
        video.play().catch(() => {});
      } else {
        const onCanPlay = () => {
          if (isPlaying && isInClipRange) video.play().catch(() => {});
        };
        video.addEventListener('canplay', onCanPlay, { once: true });
        return () => video.removeEventListener('canplay', onCanPlay);
      }
    } else {
      video.pause();
    }
  }, [isPlaying, isInClipRange]);

  // Sync volume and speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = muteAudio ? 0 : Math.max(0, Math.min(1, volume * clipAudioGain));
    video.muted = muteAudio || muted;
    video.playbackRate = finalSpeed;
  }, [volume, speed, muted, muteAudio, finalSpeed, clipAudioGain]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {/* Branded Loading Overlay */}
      {(!isVideoReady || hasError) && src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 transition-opacity duration-500">
          <div className="relative mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white shadow-[0_0_30px_rgba(var(--primary),0.3)] animate-pulse">
              W
            </div>
            <div className="absolute -inset-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 animate-pulse">
              {hasError ? "Connection weak..." : "Preparing Clip"}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">
              {hasError ? "Retrying download" : "Optimizing for zero-lag"}
            </p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          "w-full h-full transition-opacity duration-700",
          objectFit === "contain" ? "object-contain" : "object-cover",
          className,
          !isVideoReady ? "opacity-0" : "opacity-100"
        )}
        playsInline
        muted
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        style={{ pointerEvents: "none", ...(cssFilter ? { filter: cssFilter } : {}) }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
