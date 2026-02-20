"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
  muteAudio?: boolean; // New prop to mute video audio when separated
  clipSpeed?: number; // Per-clip speed override
  clipReversed?: boolean; // Per-clip reversal
  objectFit?: "contain" | "cover"; // Display mode for the video
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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const { isPlaying, currentTime, volume, speed, muted } = usePlaybackStore();
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Calculate effective speed (per-clip override or global)
  const effectiveSpeed = clipSpeed ?? speed;
  const finalSpeed = clipReversed ? -Math.abs(effectiveSpeed) : effectiveSpeed;

  // Calculate if we're within this clip's timeline range
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange =
    currentTime >= clipStartTime && currentTime < clipEndTime;

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
      }
    }, 8000);
  }, [clearLoadTimeout]);

  // Handle video ready state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      clearLoadTimeout();
      setIsVideoReady(true);
      setHasError(false);
      setErrorMessage("");
      if (process.env.NODE_ENV === "development") {
        console.log("Video ready:", src);
      }
    };

    const handleLoadStart = () => {
      setIsVideoReady(false);
      setHasError(false);
      setErrorMessage("");
      armLoadTimeout();
      if (process.env.NODE_ENV === "development") {
        console.log("Video loading:", src);
      }
    };

    const handleError = (e: Event) => {
      clearLoadTimeout();
      setIsVideoReady(false);
      setHasError(true);
      const mediaError = (e.currentTarget as HTMLVideoElement | null)?.error;
      setErrorMessage(mediaError?.message || "Failed to load video");
      console.error("Video error:", e, "src:", src);
    };

    const handleStalled = () => {
      if ((videoRef.current?.readyState ?? 0) < 2) {
        setHasError(true);
        setErrorMessage("Video stalled while loading");
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('error', handleError);
    video.addEventListener('stalled', handleStalled);

    // Check if video is already ready
    if (video.readyState >= 2) {
      clearLoadTimeout();
      setIsVideoReady(true);
      setHasError(false);
      setErrorMessage("");
    } else {
      armLoadTimeout();
    }

    return () => {
      clearLoadTimeout();
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('error', handleError);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [src, armLoadTimeout, clearLoadTimeout]);

  useEffect(() => {
    // Hard reset visual state on source changes.
    setIsVideoReady(false);
    setHasError(false);
    setErrorMessage("");
  }, [src]);

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

      // Reduce threshold for more precise seeking
      if (Math.abs(video.currentTime - targetTime) > 0.1) {
        video.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      video.playbackRate = e.detail.speed;
    };

    // Sync initial time
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
  }, [clipStartTime, trimStart, trimEnd, clipDuration, currentTime]);

  // Sync playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && isInClipRange) {
      // Ensure video is ready before playing
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        video.play().catch((error) => {
          console.warn("Video play failed:", error);
        });
      } else {
        // Wait for video to be ready
        const onCanPlay = () => {
          if (isPlaying && isInClipRange) {
            video.play().catch((error) => {
              console.warn("Video play failed after canplay:", error);
            });
          }
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

    video.volume = muteAudio ? 0 : volume;
    video.muted = muteAudio || muted;
    video.playbackRate = finalSpeed;
  }, [volume, speed, muted, muteAudio, finalSpeed]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Loading indicator when video is not ready */}
      {!isVideoReady && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <div className="text-white text-xs font-bold uppercase tracking-widest animate-pulse">Loading...</div>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="text-red-500 text-2xl">⚠️</div>
            <div className="text-white text-xs font-bold uppercase tracking-widest">Playback Error</div>
            {errorMessage && <div className="text-white/60 text-[10px] truncate max-w-[200px]">{errorMessage}</div>}
            <button
              onClick={() => {
                setHasError(false);
                setIsVideoReady(false);
                setErrorMessage("");
                if (videoRef.current) {
                  armLoadTimeout();
                  videoRef.current.load();
                }
              }}
              className="mt-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={`w-full h-full ${objectFit === "contain" ? "object-contain" : "object-cover"} ${className} ${!isVideoReady ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
        playsInline
        muted // Always start muted to allow autoplay on mobile
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        style={{ pointerEvents: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onError={(e) => {
          console.error("Video error event:", e, "src:", src);
          setHasError(true);
          const videoElement = e.currentTarget as HTMLVideoElement;
          setErrorMessage(videoElement.error?.message || "Failed to load video");
          setIsVideoReady(false);
        }}
        onLoadStart={() => {
          setIsVideoReady(false);
          setHasError(false);
          setErrorMessage("");
          armLoadTimeout();
        }}
        onCanPlay={() => {
          clearLoadTimeout();
          setIsVideoReady(true);
          setHasError(false);
          setErrorMessage("");
        }}
        onCanPlayThrough={() => {
          clearLoadTimeout();
          setIsVideoReady(true);
          setHasError(false);
          setErrorMessage("");
        }}
        onPlaying={() => {
          clearLoadTimeout();
          setIsVideoReady(true);
          setHasError(false);
          setErrorMessage("");
        }}
        onStalled={() => {
          if (!isVideoReady) {
            setHasError(true);
            setErrorMessage("Video stalled while loading");
          }
        }}
      />
    </div>
  );
}
