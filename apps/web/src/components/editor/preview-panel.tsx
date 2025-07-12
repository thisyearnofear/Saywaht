"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { VideoPlayer } from "@/components/ui/video-player";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "@/lib/icons-provider";
import Image from "next/image";
import { useState, useRef } from "@/lib/hooks-provider";

// Debug flag - set to false to hide active clips info
const SHOW_DEBUG_INFO = process.env.NODE_ENV === "development";

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { isPlaying, toggle, currentTime, muted, toggleMute, volume } =
    usePlaybackStore();
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1920 }); // Default to 9:16 Portrait for mobile-first
  const [showDebug, setShowDebug] = useState(SHOW_DEBUG_INFO);
  const previewRef = useRef<HTMLDivElement>(null);

  // Get active clips at current time
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

  const activeClips = getActiveClips();
  const aspectRatio = canvasSize.width / canvasSize.height;

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

      // If video is on a video track, show video (mute audio if separated)
      const shouldMuteAudio = hasSeparatedAudio(clip.mediaId);
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
            style={{ objectFit: "cover" }}
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

  // Canvas presets - Portrait first for mobile-first approach
  const canvasPresets = [
    { name: "9:16 Portrait", width: 1080, height: 1920 }, // Mobile-first default
    { name: "1:1 Square", width: 1080, height: 1080 },
    { name: "16:9 HD", width: 1920, height: 1080 },
    { name: "16:9 4K", width: 3840, height: 2160 },
    { name: "4:3 Standard", width: 1440, height: 1080 },
  ];

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0">
      {/* Controls */}
      <div className="border-b p-2 flex items-center gap-2 text-xs flex-shrink-0">
        <span className="text-muted-foreground">Canvas:</span>
        <select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onChange={(e) => {
            const preset = canvasPresets.find(
              (p) => `${p.width}x${p.height}` === e.target.value
            );
            if (preset)
              setCanvasSize({ width: preset.width, height: preset.height });
          }}
          className="bg-background border rounded px-2 py-1 text-xs"
        >
          {canvasPresets.map((preset) => (
            <option
              key={preset.name}
              value={`${preset.width}x${preset.height}`}
            >
              {preset.name} ({preset.width}×{preset.height})
            </option>
          ))}
        </select>

        {/* Debug Toggle - Only show in development */}
        {SHOW_DEBUG_INFO && (
          <Button
            variant="text"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs"
          >
            Debug {showDebug ? "ON" : "OFF"}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={toggleMute}
          className="ml-auto"
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-3 w-3 mr-1" />
          ) : (
            <Volume2 className="h-3 w-3 mr-1" />
          )}
          {muted || volume === 0 ? "Unmute" : "Mute"}
        </Button>

        <Button variant="outline" size="sm" onClick={toggle}>
          {isPlaying ? (
            <Pause className="h-3 w-3 mr-1" />
          ) : (
            <Play className="h-3 w-3 mr-1" />
          )}
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-gray-900 min-h-0 min-w-0">
        <div
          ref={previewRef}
          className="relative overflow-hidden rounded-sm max-w-full max-h-full bg-black border border-gray-600"
          style={{
            aspectRatio: aspectRatio.toString(),
            width: "100%",
            height: "100%",
          }}
        >
          {activeClips.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              {tracks.length === 0
                ? "Drop media to start editing"
                : "No clips at current time"}
            </div>
          ) : (
            activeClips.map((clipData, index) => renderClip(clipData, index))
          )}
        </div>
      </div>

      {/* Debug Info Panel - Conditionally rendered */}
      {showDebug && (
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
    </div>
  );
}
