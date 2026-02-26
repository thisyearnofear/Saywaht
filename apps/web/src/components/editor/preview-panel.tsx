"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useEditorStore } from "@/stores/editor-store";
import { useTextStore } from "@/stores/text-store";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "../ui/video-player";
import { ImageTimelineTreatment } from "../ui/image-timeline-treatment";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "@/lib/icons";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoInitializationTest } from "./video-initialization-test";
import { PreviewErrorBoundary } from "./preview-error-boundary";

// Debug flag - set to false to hide active clips info
const SHOW_DEBUG_INFO = false;

interface PreviewPanelProps {
  controlsVariant?: "topbar" | "overlay";
  /** When true, the preview fills the entire container (no aspect-ratio constraint) */
  fillContainer?: boolean;
  onTextElementTap?: (textId: string) => void;
  showPlaybackControls?: boolean;
}

export function PreviewPanel({
  controlsVariant = "topbar",
  fillContainer = false,
  onTextElementTap,
  showPlaybackControls = true,
}: PreviewPanelProps) {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { isPlaying, toggle, currentTime, muted, toggleMute, volume } =
    usePlaybackStore();
  const { canvasSize, getAspectRatio } = useCanvasStore();
  const { videoObjectFit, toggleVideoObjectFit, previewZoom } = useEditorStore();
  const { textElements } = useTextStore();
  const [showDebug, setShowDebug] = useState(SHOW_DEBUG_INFO);
  const [showOverlayControls, setShowOverlayControls] = useState(
    controlsVariant === "overlay"
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const controlsAreOverlay = controlsVariant === "overlay";

  // Memoize active clips calculation to prevent unnecessary re-renders
  const activeClips = useMemo(() => {
    const clips: Array<{
      clip: any;
      track: any;
      mediaItem: any;
    }> = [];

    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipStart = clip.startTime;
        const clipEnd =
          clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (currentTime >= clipStart && currentTime < clipEnd) {
          const mediaItem =
            clip.mediaId === "test"
              ? { type: "test", name: clip.name, url: "", thumbnailUrl: "" }
              : mediaItems.find((item) => item.id === clip.mediaId);

          if (mediaItem || clip.mediaId === "test") {
            clips.push({ clip, track, mediaItem });
          }
        }
      });
    });

    return clips;
  }, [tracks, mediaItems, currentTime]);

  // Get active clips at current time with debug info
  const getActiveClips = () => activeClips;

  // Check if there are separated audio tracks for any video
  const hasSeparatedAudio = (videoMediaId: string) => {
    return tracks.some(
      (track) =>
        track.type === "audio" &&
        track.clips.some((clip) => clip.mediaId === videoMediaId)
    );
  };

  // Get active text elements at current time - memoized
  const activeTextElements = useMemo(() => {
    return textElements.filter(
      (text) => currentTime >= text.startTime && currentTime < text.endTime
    );
  }, [textElements, currentTime]);

  // Memoize getActiveTextElements for compatibility
  const getActiveTextElements = () => activeTextElements;

  const aspectRatio = getAspectRatio();

  // Debug logging - refined to be less noisy
  useEffect(() => {
    if (!SHOW_DEBUG_INFO) return;

    const hasClips = tracks.some(t => t.clips.length > 0);
    if (hasClips && activeClips.length === 0) {
      // Small timeout to avoid logging during rapid state changes (like seeking)
      const timer = setTimeout(() => {
        console.log("🎬 No active clips at current time. Debug info:", {
          currentTime,
          tracksCount: tracks.length,
          totalClips: tracks.reduce((sum, track) => sum + track.clips.length, 0),
          firstTrackClips: tracks[0]?.clips.slice(0, 3).map(clip => ({
            name: clip.name,
            startTime: clip.startTime,
            endTime: clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd),
          }))
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentTime, tracks, activeClips.length]);

  // Auto-hide floating controls while video is playing.
  useEffect(() => {
    if (!controlsAreOverlay) return;

    if (!isPlaying) {
      setShowOverlayControls(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowOverlayControls(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [controlsAreOverlay, isPlaying, currentTime]);

  // Render a clip
  const renderClip = (clipData: any, index: number) => {
    const { clip, track, mediaItem } = clipData;
    const brightness = clip.brightness ?? 1;
    const contrast = clip.contrast ?? 1;
    const saturation = clip.saturation ?? 1;
    const cssFilter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    const clipAudioGain = clip.audioGain ?? 1;
    
    // NEW: Calculate z-index based on track order (video tracks on top, audio below)
    const baseZIndex = track.type === "video" ? 10 : 5;
    const clipZIndex = baseZIndex + index;

    // Test clips
    if (!mediaItem || clip.mediaId === "test") {
      return (
        <div
          key={clip.id}
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
          style={{ zIndex: clipZIndex }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🎬</div>
            <p className="text-xs text-white">{clip.name}</p>
          </div>
        </div>
      );
    }

    // Handle video clips based on track type
    if (mediaItem.type === "video") {
      // If video is on an audio track, only play audio (no visual)
      if (track.type === "audio") {
        return (
          <AudioPlayer
            key={clip.id}
            src={mediaItem.url}
            clipStartTime={clip.startTime}
            trimStart={clip.trimStart}
            trimEnd={clip.trimEnd}
            clipDuration={clip.duration}
            clipAudioGain={clipAudioGain}
          />
        );
      }

      // If video is on a video track, show video (mute audio if separated or explicitly muted)
      const shouldMuteAudio = clip.audioMuted || hasSeparatedAudio(clip.mediaId);
      return (
        <div key={clip.id} className="absolute inset-0" style={{ zIndex: clipZIndex }}>
          <VideoPlayer
            src={mediaItem.url}
            poster={mediaItem.thumbnailUrl}
            clipStartTime={clip.startTime}
            trimStart={clip.trimStart}
            trimEnd={clip.trimEnd}
            clipDuration={clip.duration}
            muteAudio={shouldMuteAudio}
            clipSpeed={clip.speed}
            clipReversed={clip.reversed}
            objectFit={videoObjectFit}
            cssFilter={cssFilter}
            clipAudioGain={clipAudioGain}
          />
        </div>
      );
    }

    // Image clips
    if (mediaItem.type === "image") {
      return (
        <div key={clip.id} className="absolute inset-0" style={{ zIndex: clipZIndex }}>
          <Image
            src={mediaItem.url}
            alt={mediaItem.name}
            fill
            style={{ objectFit: videoObjectFit, filter: cssFilter }}
            draggable={false}
          />
        </div>
      );
    }

    // Audio clips (visual representation)
    if (mediaItem.type === "audio") {
      return (
        <AudioPlayer
          key={clip.id}
          src={mediaItem.url}
          clipStartTime={clip.startTime}
          trimStart={clip.trimStart}
          trimEnd={clip.trimEnd}
          clipDuration={clip.duration}
          clipAudioGain={clipAudioGain}
        />
      );
    }

    return null;
  };

  // Render text element
  const renderTextElement = (text: any) => {
    const isEditing = text.id === useTextStore.getState().selectedTextId;
    
    return (
      <div
        key={text.id}
        className={cn(
          "absolute cursor-move select-none touch-none",
          onTextElementTap ? "pointer-events-auto" : "pointer-events-none",
          isEditing && "ring-2 ring-primary ring-offset-2 ring-offset-black rounded-sm"
        )}
        style={{
          left: `${text.x * 100}%`,
          top: `${text.y * 100}%`,
          transform: "translate(-50%, -50%)",
          fontSize: `${text.fontSize}px`,
          fontFamily: text.fontFamily,
          color: text.color,
          fontWeight: text.fontWeight || "normal",
          textAlign: text.textAlign || "center",
          opacity: text.opacity || 1,
          whiteSpace: "pre-wrap",
          maxWidth: "90%",
          textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
          zIndex: 50,
        }}
        onPointerDown={(e) => {
          if (!onTextElementTap) return;
          e.stopPropagation();
          const target = e.currentTarget;
          const rect = previewRef.current?.getBoundingClientRect();
          if (!rect) return;

          const handlePointerMove = (moveEvent: PointerEvent) => {
            const x = (moveEvent.clientX - rect.left) / rect.width;
            const y = (moveEvent.clientY - rect.top) / rect.height;
            useTextStore.getState().updateTextElement(text.id, { 
              x: Math.max(0, Math.min(1, x)), 
              y: Math.max(0, Math.min(1, y)) 
            });
          };

          const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            onTextElementTap(text.id); // Also select it
          };

          window.addEventListener('pointermove', handlePointerMove);
          window.addEventListener('pointerup', handlePointerUp);
        }}
      >
        {text.content}
      </div>
    );
  };

  const renderPlaybackControls = () => (
    <>
      {SHOW_DEBUG_INFO && controlsVariant === "topbar" && (
        <>
          <Button
            variant="text"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs"
          >
            Debug {showDebug ? "ON" : "OFF"}
          </Button>
          <Button
            variant="text"
            size="sm"
            onClick={() => {
              console.log("Debug videos - feature not yet implemented");
            }}
            className="text-xs"
          >
            Debug Videos
          </Button>
        </>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={controlsAreOverlay ? "secondary" : "outline"}
              size="sm"
              onClick={toggleVideoObjectFit}
              className="transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {videoObjectFit === "contain" ? (
                <Maximize2 className="h-3 w-3 mr-1 transition-transform duration-200" />
              ) : (
                <Minimize2 className="h-3 w-3 mr-1 transition-transform duration-200" />
              )}
              {videoObjectFit === "contain" ? "Fit" : "Fill"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {videoObjectFit === "contain"
                ? "Switch to Fill (crop to fit frame)"
                : "Switch to Fit (show full video)"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        variant={controlsAreOverlay ? "secondary" : "outline"}
        size="sm"
        onClick={toggleMute}
        className="transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-3 w-3 mr-1 transition-transform duration-200" />
        ) : (
          <Volume2 className="h-3 w-3 mr-1 transition-transform duration-200" />
        )}
        {muted || volume === 0 ? "Unmute" : "Mute"}
      </Button>

      <Button
        variant={controlsAreOverlay ? "secondary" : "outline"}
        size="sm"
        onClick={toggle}
        className="transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3 mr-1 transition-transform duration-200" />
        ) : (
          <Play className="h-3 w-3 mr-1 transition-transform duration-200" />
        )}
        {isPlaying ? "Pause" : "Play"}
      </Button>
    </>
  );

  return (
    <PreviewErrorBoundary>
      <div className="h-full w-full flex flex-col min-h-0 min-w-0">
        {controlsVariant === "topbar" && showPlaybackControls && (
          <div className="border-b p-2 flex items-center justify-center gap-2 text-xs flex-shrink-0">
            {renderPlaybackControls()}
          </div>
        )}

      {/* Preview Area - Edge-to-edge in overlay mode */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center bg-black relative overflow-hidden",
          !controlsAreOverlay ? "p-2 sm:p-4 bg-gray-900" : "p-0",
          fillContainer && "h-full"
        )}
        style={fillContainer ? undefined : { minHeight: "300px" }}
        onPointerMove={() => (controlsAreOverlay || showOverlayControls) && setShowOverlayControls(true)}
        onTouchStart={() => (controlsAreOverlay || showOverlayControls) && setShowOverlayControls(true)}
        onClick={() => (controlsAreOverlay || showOverlayControls) && setShowOverlayControls(true)}
      >
        <div
          className={cn("flex items-center justify-center flex-1", fillContainer && "w-full h-full")}
          style={{
            zoom: previewZoom,
            transformOrigin: "center",
          }}
        >
          <div
            ref={previewRef}
            className={cn(
              "relative overflow-hidden bg-black transition-all duration-500",
              !controlsAreOverlay ? "rounded-sm border border-gray-600" : "border-none shadow-2xl",
              fillContainer && "!w-full !h-full"
            )}
            style={fillContainer ? {
              width: "100%",
              height: "100%",
            } : {
              aspectRatio: aspectRatio.toString(),
              width: "auto",
              height: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              minWidth: "100px",
              minHeight: "100px",
            }}
          >
            {activeClips.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/50">
                {tracks.length === 0
                  ? "Drop media to start editing"
                  : "No clips at current time"}
              </div>
            ) : (
              <>
                {/* Black background layer to prevent transparency glitches */}
                <div className="absolute inset-0 bg-black" style={{ zIndex: 0 }} />
                
                {/* Debug info for active clips */}
                {SHOW_DEBUG_INFO && (
                  <div className="absolute top-2 left-2 z-20 bg-black/80 text-white text-xs p-2 rounded">
                    Active: {activeClips.length} clips at {currentTime.toFixed(2)}s
                  </div>
                )}
                {activeClips.map((clipData, index) => renderClip(clipData, index))}
              </>
            )}
            {/* Text elements layer - always render on top */}
            {activeTextElements.map((text) => renderTextElement(text))}
          </div>
        </div>

        {/* Floating controls — restored for both overlay and legacy topbar modes */}
        {showPlaybackControls && (controlsAreOverlay || controlsVariant === "topbar") && (
          <div
            className={cn(
              "absolute bottom-8 left-1/2 -translate-x-1/2 z-20 transition-all duration-300",
              showOverlayControls
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <div className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/60 px-2 py-2 backdrop-blur-xl shadow-2xl">
              {renderPlaybackControls()}
            </div>
          </div>
        )}

        {/* Debug Info Panel - Conditionally rendered */}
        {showDebug && controlsVariant === "topbar" && (
          <div className="border-t bg-background p-2 flex-shrink-0">
            <div className="text-xs font-medium mb-1">
              Debug: Active Clips ({activeClips.length})
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {activeClips.map((clipData, index) => (
                <div
                  key={clipData.clip.id}
                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs whitespace-nowrap"
                >
                  <span className="w-4 h-4 bg-primary/20 rounded text-center text-xs leading-4">
                    {index + 1}
                  </span>
                  <span>{clipData.clip.name}</span>
                  <span className="text-muted-foreground">
                    ({clipData.mediaItem?.type || "test"})
                  </span>
                </div>
              ))}
              {activeClips.length === 0 && (
                <span className="text-muted-foreground">No active clips</span>
              )}
            </div>
          </div>
        )}

        {/* Video Initialization Test - Development only */}
        {SHOW_DEBUG_INFO && <VideoInitializationTest />}
      </div>
    </div>
    </PreviewErrorBoundary>
  );
}
