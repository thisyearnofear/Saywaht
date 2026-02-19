"use client";

import { useState, useEffect, useRef } from "react";
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

// Debug flag - set to false to hide active clips info
const SHOW_DEBUG_INFO = true;

interface PreviewPanelProps {
  controlsVariant?: "topbar" | "overlay";
}

export function PreviewPanel({ controlsVariant = "topbar" }: PreviewPanelProps) {
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

  // Get active clips at current time with debug info
  const getActiveClips = () => {
    const activeClips: Array<{
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
            activeClips.push({ clip, track, mediaItem });

            // Debug logging for video clips
            if (mediaItem?.type === "video" && SHOW_DEBUG_INFO) {
              console.log(`Active video clip: ${clip.name}`, {
                clipStart,
                clipEnd,
                currentTime,
                videoTime: currentTime - clipStart + clip.trimStart,
                mediaUrl: mediaItem.url,
                trackType: track.type,
                isInRange: true
              });
            }
          }
        }
      });
    });

    return activeClips;
  };

  // Check if there are separated audio tracks for any video
  const hasSeparatedAudio = (videoMediaId: string) => {
    return tracks.some(
      (track) =>
        track.type === "audio" &&
        track.clips.some((clip) => clip.mediaId === videoMediaId)
    );
  };

  // Get active text elements at current time
  const getActiveTextElements = () => {
    return textElements.filter(
      (text) => currentTime >= text.startTime && currentTime < text.endTime
    );
  };

  const activeClips = getActiveClips();
  const activeTextElements = getActiveTextElements();
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

    // Test clips
    if (!mediaItem || clip.mediaId === "test") {
      return (
        <div
          key={clip.id}
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
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
          />
        );
      }

      // If video is on a video track, show video (mute audio if separated or explicitly muted)
      const shouldMuteAudio = clip.audioMuted || hasSeparatedAudio(clip.mediaId);
      return (
        <div key={clip.id} className="absolute inset-0">
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
          />
        </div>
      );
    }

    // Image clips
    if (mediaItem.type === "image") {
      return (
        <div key={clip.id} className="absolute inset-0">
          <Image
            src={mediaItem.url}
            alt={mediaItem.name}
            fill
            style={{ objectFit: videoObjectFit }}
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
        />
      );
    }

    return null;
  };

  // Render text element
  const renderTextElement = (text: any) => {
    return (
      <div
        key={text.id}
        className="absolute pointer-events-none"
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
    <div className="h-full w-full flex flex-col min-h-0 min-w-0">
      {controlsVariant === "topbar" && (
        <div className="border-b p-2 flex items-center justify-center gap-2 text-xs flex-shrink-0">
          {renderPlaybackControls()}
        </div>
      )}

      {/* Preview Area - Scrollable to prevent portrait format from dominating */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-gray-900 relative overflow-auto"
        style={{ minHeight: "300px" }}
        onPointerMove={() => controlsAreOverlay && setShowOverlayControls(true)}
        onTouchStart={() => controlsAreOverlay && setShowOverlayControls(true)}
        onClick={() => controlsAreOverlay && setShowOverlayControls(true)}
      >
        <div
          className="flex items-center justify-center flex-1"
          style={{
            zoom: previewZoom,
            transformOrigin: "center",
          }}
        >
          <div
            ref={previewRef}
            className="relative overflow-hidden rounded-sm bg-black border border-gray-600"
            style={{
              aspectRatio: aspectRatio.toString(),
              width: "auto",
              height: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              // In topbar mode (tools mode), we want it to fit the 22-32vh container
              // In overlay mode (fullscreen), we want it to fill as much as possible
              minWidth: "150px", // Reduced min size for very small panels
              minHeight: "150px",
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

        {controlsAreOverlay && (
          <div
            className={cn(
              "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-200",
              showOverlayControls
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            )}
          >
            <div className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/65 px-2 py-2 backdrop-blur-sm">
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
  );
}
