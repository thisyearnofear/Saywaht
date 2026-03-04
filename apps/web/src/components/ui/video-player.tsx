"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTemplateStore } from "@/stores/template-store";
import { useLazyVideoLoading } from "@/hooks/use-lazy-video-loading";
import { cn } from "@/lib/utils";
import { Loader2 } from "@/lib/icons";

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
  clipId?: string;
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
  clipId,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const isUnmountingRef = useRef(false); // NEW: Track unmounting state
  const { isPlaying, currentTime, volume, speed, muted, setStalled } = usePlaybackStore();
  
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Refs to read latest values in effects without triggering re-runs
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const muteStateRef = useRef(muteAudio || muted);
  muteStateRef.current = muteAudio || muted;
  const retryCountRef = useRef(0);

  // Calculate effective speed (per-clip override or global)
  const effectiveSpeed = clipSpeed ?? speed;
  const finalSpeed = clipReversed ? -Math.abs(effectiveSpeed) : effectiveSpeed;

  // Calculate if we're within this clip's timeline range
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange = currentTime >= clipStartTime && currentTime < clipEndTime;

  // NEW: Lazy loading - only load video when it's about to be visible
  const shouldLoadVideo = useLazyVideoLoading(
    clipStartTime,
    clipEndTime,
    currentTime,
    3 // Start loading 3 seconds before clip
  );

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const armLoadTimeout = useCallback(() => {
    clearLoadTimeout();
    loadTimeoutRef.current = window.setTimeout(() => {
      if ((videoRef.current?.readyState ?? 0) < 2 && !isUnmountingRef.current) {
        setHasError(true);
        setErrorMessage("Video load timed out");
        setStalled(false);
      }
    }, 8000);
  }, [clearLoadTimeout, setStalled]);

  // NEW: Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      const video = videoRef.current;
      
      if (video) {
        // Pause and clear source to stop loading
        video.pause();
        video.src = '';
        video.load();
      }
      
      clearLoadTimeout();
      setStalled(false);
    };
  }, [clearLoadTimeout, setStalled]);

  // Handle video ready and stalled states
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isUnmountingRef.current) return;

    const handleCanPlay = () => {
      if (isUnmountingRef.current) return;
      
      clearLoadTimeout();
      setIsVideoReady(true);
      setHasError(false);
      setErrorMessage("");
      
      // NEW: Notify playback store that this video is ready
      usePlaybackStore.getState().incrementVideoReady();

      // Update per-clip loading status
      if (clipId) {
        useTemplateStore.getState().setClipLoadingStatus(clipId, 'ready');
      }
      
      if (isPlaying && isInClipRange) {
        setStalled(false);
      }
    };

    const handleWaiting = () => {
      if (isUnmountingRef.current) return;
      
      if (isPlaying && isInClipRange) {
        setStalled(true);
      }
    };

    const handlePlaying = () => {
      if (isUnmountingRef.current) return;
      setStalled(false);
    };

    const handleLoadStart = () => {
      if (isUnmountingRef.current) return;
      
      setIsVideoReady(false);
      setHasError(false);
      setErrorMessage("");
      if (isPlaying && isInClipRange) {
        setStalled(true);
      }
      armLoadTimeout();
    };

    const handleError = (e: Event) => {
      if (isUnmountingRef.current) return;
      
      clearLoadTimeout();
      const mediaError = (e.currentTarget as HTMLVideoElement | null)?.error;
      const msg = mediaError?.message || "Failed to load video";
      console.error("[VideoPlayer] error:", msg, { code: mediaError?.code, src });

      // Auto-retry once before surfacing the error
      if (retryCountRef.current < 1) {
        retryCountRef.current += 1;
        videoRef.current?.load();
        return;
      }

      setIsVideoReady(false);
      setHasError(true);
      setStalled(false);
      setErrorMessage(msg);

      // Update per-clip loading status
      if (clipId) {
        useTemplateStore.getState().setClipLoadingStatus(clipId, 'error');
      }
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
    isUnmountingRef.current = false; // Reset unmounting flag
    retryCountRef.current = 0;
    setIsVideoReady(false);
    setHasError(false);
    setErrorMessage("");
    setStalled(false);
    
    // NEW: Reset ready count when source changes (new template loaded)
    usePlaybackStore.getState().resetVideoReady();
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
          currentTimeRef.current - clipStartTime + trimStart
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
    // NOTE: currentTime intentionally excluded — ongoing sync is handled by the
    // playback-update event (with 0.15s tolerance).  Including it here caused
    // the effect to re-run every animation frame, force-seeking the video ~60fps
    // and preventing smooth playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipStartTime, trimStart, trimEnd, clipDuration]);

  // Sync playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isUnmountingRef.current) return;

    if (isPlaying && isInClipRange) {
      // Sync muted state BEFORE play() so WebView autoplay policy sees the
      // correct value at evaluation time (avoids muted→unmuted race).
      video.muted = muteStateRef.current;
      
      // Only attempt play if video is ready
      if (video.readyState >= 2) {
        video.play().catch((err) => {
          console.warn("[VideoPlayer] Play failed:", err);
          // Don't set stalled on play failure - it might be a policy issue
        });
      } else {
        const onCanPlay = () => {
          if (isPlaying && isInClipRange && !isUnmountingRef.current) {
            video.muted = muteStateRef.current;
            video.play().catch((err) => {
              console.warn("[VideoPlayer] Play failed on canplay:", err);
            });
          }
        };
        video.addEventListener('canplay', onCanPlay, { once: true });
        return () => video.removeEventListener('canplay', onCanPlay);
      }
    } else {
      video.pause();
      // Clear stalled state when pausing
      setStalled(false);
    }
  }, [isPlaying, isInClipRange, setStalled]);

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
      {/* Loading Overlay — hides unready video, error state shows retry hint */}
      {(!isVideoReady || hasError) && src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 transition-opacity duration-500">
          {hasError ? (
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                {errorMessage || "Failed to load video"}
              </p>
              <button
                onClick={() => {
                  retryCountRef.current = 0;
                  setHasError(false);
                  setErrorMessage("");
                  setIsVideoReady(false);
                  videoRef.current?.load();
                }}
                className="text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
              >
                Tap to retry
              </button>
            </div>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          )}
        </div>
      )}

      <video
        ref={videoRef}
        src={shouldLoadVideo ? src : undefined}
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
        style={{ 
          pointerEvents: "none", 
          willChange: "auto",
          ...(cssFilter ? { filter: cssFilter } : {}) 
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
