"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Music,
  Volume2,
  Upload,
  Play,
  Pause,
  Download,
} from "@/lib/icons";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMobileContext } from "@/contexts/mobile-context";
import { MobileRecordingInterface } from "./mobile-recording-interface";
import { cn } from "@/lib/utils";
import { addHapticFeedback } from "@/lib/mobile-utils";

interface MobileAudioPanelProps {
  className?: string;
}

export function MobileAudioPanel({ className }: MobileAudioPanelProps) {
  const { orientation } = useMobileContext();
  const { mediaItems, addMediaItem } = useMediaStore();
  const { addClipToTrack } = useTimelineStore();
  const [showMobileRecording, setShowMobileRecording] = useState(false);

  // Filter for audio files only
  const audioFiles = mediaItems.filter(
    (item) => item.type === "audio" || item.file?.type?.startsWith("audio/")
  );

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Handle audio upload logic
      console.log("Audio files uploaded:", files);
    }
  };

  const handleVoiceoverRecord = () => {
    addHapticFeedback("medium");
    setShowMobileRecording(true);
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    // Create a new audio media item
    const audioFile = new File([audioBlob], `voiceover-${Date.now()}.webm`, {
      type: "audio/webm",
    });

    const audioItem = {
      id: `audio-${Date.now()}`,
      name: `Voiceover ${new Date().toLocaleTimeString()}`,
      type: "audio" as const,
      file: audioFile,
      url: URL.createObjectURL(audioFile),
      duration: 0, // Will be calculated when loaded
      thumbnailUrl: "",
      aspectRatio: 1, // Audio files don't have aspect ratio, but required by MediaItem type
      isLocal: true,
    };

    // Add to media store
    addMediaItem(audioItem);

    // Add to timeline
    addClipToTrack("voiceover-track", {
      mediaId: audioItem.id,
      name: audioItem.name,
      startTime: 0,
      duration: audioItem.duration || 10, // Default duration
      trimStart: 0,
      trimEnd: 0,
    });
  };

  const handleMusicLibrary = () => {
    addHapticFeedback("light");
    // Handle music library access
    console.log("Open music library");
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header - Consistent with other panels */}
      <div className="p-4 border-b border-border/50 bg-muted/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Volume2 className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Audio Tracks</h2>
          <span className="ml-auto text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {audioFiles.length} TOTAL
          </span>
        </div>

        {/* Primary Record Action - Standout UI */}
        <Button
          className="h-16 w-full bg-red-500 hover:bg-red-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-red-500/20 border-none transition-all active:scale-[0.98] touch-manipulation mb-4"
          onClick={handleVoiceoverRecord}
        >
          <div className="relative mr-3">
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
            <Mic className="h-6 w-6 relative z-10" />
          </div>
          Record Voiceover
        </Button>

        {/* Secondary Actions - More compact and touch-friendly */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="h-12 rounded-xl bg-muted/50 border-none font-bold text-xs flex items-center justify-center gap-2 touch-manipulation"
            onClick={handleMusicLibrary}
          >
            <Music className="h-4 w-4 text-primary" />
            Stock Music
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-xl bg-muted/50 border-none font-bold text-xs flex items-center justify-center gap-2 touch-manipulation"
            onClick={() => document.getElementById("audio-upload")?.click()}
          >
            <Upload className="h-4 w-4 text-primary" />
            Import Audio
          </Button>
        </div>
      </div>

      {/* Audio Files List - Improved visual hierarchy */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {audioFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Volume2 className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No audio tracks yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1 px-8">
                Record your voice or import background music to bring your story to life.
              </p>
            </div>
          ) : (
            audioFiles.map((audio, index) => (
              <AudioFileCard key={index} audio={audio} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Hidden file input */}
      <input
        id="audio-upload"
        type="file"
        accept="audio/*"
        multiple
        onChange={handleAudioUpload}
        className="hidden"
      />

      {/* Mobile Recording Interface */}
      <MobileRecordingInterface
        isOpen={showMobileRecording}
        onClose={() => setShowMobileRecording(false)}
        onComplete={handleRecordingComplete}
      />
      
      {/* Footer Instructions */}
      <div className="p-3 bg-muted/10 text-center">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          Tap record to start voiceover
        </p>
      </div>
    </div>
  );
}

interface AudioFileCardProps {
  audio: any; // Replace with proper type
}

function AudioFileCard({ audio }: AudioFileCardProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>("00:00");
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    addHapticFeedback("light");
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const minutes = Math.floor(audioRef.current.duration / 60);
      const seconds = Math.floor(audioRef.current.duration % 60);
      setDuration(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }
  };

  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm active:bg-muted/50 transition-all">
      <Button
        variant="secondary"
        size="icon"
        className="h-12 w-12 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 shrink-0 border-none"
        onClick={handlePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 fill-primary" />
        ) : (
          <Play className="h-5 w-5 fill-primary ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm truncate">
          {audio.name || "Untitled Audio"}
        </h3>
        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
          {duration} •{" "}
          {audio.size ? `${Math.round(audio.size / 1024)}KB` : "0KB"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground/40 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            addHapticFeedback("light");
            console.log("Download audio:", audio);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <audio
        ref={audioRef}
        src={audio.url}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
