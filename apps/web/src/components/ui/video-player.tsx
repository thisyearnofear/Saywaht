"use client";

import { useRef, useEffect, useState } from "react";
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
  const { isPlaying, currentTime, volume, speed, muted } = usePlaybackStore();
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Calculate effective speed (per-clip override or global)
  const effectiveSpeed = clipSpeed ?? speed;
  const finalSpeed = clipReversed ? -Math.abs(effectiveSpeed) : effectiveSpeed;

  // Calculate if we're within this clip's timeline range
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange =
    currentTime >= clipStartTime && currentTime < clipEndTime;

  // Handle video ready state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsVideoReady(true);
      if (process.env.NODE_ENV === "development") {
        console.log("Video ready:", src);
      }
    };

    const handleLoadStart = () => {
      setIsVideoReady(false);
      if (process.env.NODE_ENV === "development") {
        console.log("Video loading:", src);
      }
    };

    const handleError = (e: Event) => {
      setIsVideoReady(false);
      console.error("Video error:", e, "src:", src);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('error', handleError);

    // Check if video is already ready
    if (video.readyState >= 2) {
      setIsVideoReady(true);
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('error', handleError);
    };
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
  }, [clipStartTime, trimStart, trimEnd, clipDuration]);

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
    <div className="relative w-full h-full">
      {/* Loading indicator when video is not ready */}
      {!isVideoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white text-sm">Loading video...</div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={`w-full h-full ${objectFit === "contain" ? "object-contain" : "object-cover"} ${className} ${!isVideoReady ? "opacity-50" : "opacity-100"} transition-opacity duration-300`}
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        style={{ pointerEvents: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onError={(e) => {
          console.error("Video error:", e, "src:", src);
          setIsVideoReady(false);
        }}
        onLoadStart={() => {
          if (process.env.NODE_ENV === "development") {
            console.log("Video loading started:", src);
          }
          setIsVideoReady(false);
        }}
        onCanPlay={() => {
          if (process.env.NODE_ENV === "development") {
            console.log("Video can play:", src);
          }
          setIsVideoReady(true);
        }}
      />
    </div>
  );
}
