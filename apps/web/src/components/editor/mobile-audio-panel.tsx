"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useTextStore } from "@/stores/text-store";
import {
  MobileRecordingInterface,
  type MobileRecorderState,
} from "./mobile-recording-interface";
import { cn } from "@/lib/utils";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";
import { generateCaptionsFromAudioBlob } from "@/lib/transcription/caption-pipeline";

interface MobileAudioPanelProps {
  className?: string;
  autoStartRecordingNonce?: number;
  onRecordingStateChange?: (state: MobileRecorderState) => void;
  onCaptionsGenerated?: (result: { groupId: string; count: number }) => void;
}

export function MobileAudioPanel({
  className,
  autoStartRecordingNonce = 0,
  onRecordingStateChange,
  onCaptionsGenerated,
}: MobileAudioPanelProps) {
  const { mediaItems, addMediaItem } = useMediaStore();
  const { tracks, addTrack, addClipToTrack } = useTimelineStore();
  const { addTextElement } = useTextStore();
  const [showMobileRecording, setShowMobileRecording] = useState(false);
  const [autoStartRecording, setAutoStartRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Filter for audio files only
  const audioFiles = mediaItems.filter(
    (item) => item.type === "audio" || item.file?.type?.startsWith("audio/")
  );

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setIsProcessing(true);
    addHapticFeedback("medium");
    try {
      const items = await processMediaFiles(files);
      items.forEach((item) => addMediaItem(item));
      toast.success(`Added ${items.length} audio file(s)`);
    } catch (error) {
      console.error("Audio processing failed:", error);
      toast.error("Failed to process audio files");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  const handleVoiceoverRecord = () => {
    addHapticFeedback("medium");
    setAutoStartRecording(false);
    setShowMobileRecording(true);
  };

  useEffect(() => {
    if (!autoStartRecordingNonce) return;
    setAutoStartRecording(true);
    setShowMobileRecording(true);
  }, [autoStartRecordingNonce]);

  const generateCaptions = async (blob: Blob) => {
    setIsTranscribing(true);

    const captionPromise = generateCaptionsFromAudioBlob(blob, {
      addTextElement,
      position: "bottom",
      language: "en",
      source: "voiceover",
      cancelPrevious: true,
    });

    toast.promise(captionPromise, {
      loading: "AI is transcribing your voiceover...",
      success: (result) => `Generated ${result.count} captions!`,
      error: (err) => `Captions failed: ${err.message}`,
    });

    try {
      const result = await captionPromise;
      onCaptionsGenerated?.({ groupId: result.groupId, count: result.count });
    } finally {
      setIsTranscribing(false);
    }
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

    // Add to the timeline
    const existingAudioTrack = tracks.find((t) => t.type === "audio");
    const trackId = existingAudioTrack?.id ?? addTrack("audio");

    addClipToTrack(trackId, {
      mediaId: audioItem.id,
      name: audioItem.name,
      startTime: 0,
      duration: audioItem.duration || 10, // Default duration
      trimStart: 0,
      trimEnd: 0,
    });
    
    toast.success("Voiceover added to timeline");

    // Automatically trigger AI captions
    generateCaptions(audioBlob);
  };

  const handleMusicLibrary = () => {
    addHapticFeedback("light");
    toast.info("Opening Stock Library...");
    window.location.href = "/templates";
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="border-b border-border/50 bg-muted/5 p-2.5 space-y-2.5">
        {showMobileRecording ? (
          <MobileRecordingInterface
            isOpen={showMobileRecording}
            onClose={() => {
              setShowMobileRecording(false);
              setAutoStartRecording(false);
            }}
            onComplete={handleRecordingComplete}
            autoStart={autoStartRecording}
            onRecordingStateChange={onRecordingStateChange}
          />
        ) : (
          <>
            <Button
              variant="destructive"
              className="h-10 w-full rounded-lg border-none text-[11px] font-black uppercase tracking-[0.14em]"
              onClick={handleVoiceoverRecord}
              disabled={isTranscribing}
            >
              <Mic className="mr-2 h-4 w-4" />
              {isTranscribing ? "Transcribing..." : "Record Voiceover"}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="h-10 rounded-lg bg-muted/50 border-none px-3 text-[11px] font-bold"
                onClick={handleMusicLibrary}
              >
                <Music className="mr-1.5 h-4 w-4 text-primary" />
                Stock
              </Button>
              <Button
                variant="secondary"
                className="h-10 rounded-lg bg-muted/50 border-none px-3 text-[11px] font-bold"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload className="mr-1.5 h-4 w-4 text-primary" />
                Import
              </Button>
            </div>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2.5">
          {audioFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-muted/30">
                <Volume2 className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">No audio clips yet</p>
              <p className="mt-1 px-6 text-[11px] text-muted-foreground/60">
                Record or import audio, then it will appear here.
              </p>
            </div>
          ) : (
            audioFiles.map((audio) => (
              <AudioFileCard key={audio.id} audio={audio} />
            ))
          )}
        </div>
      </ScrollArea>

      <input
        ref={uploadInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleAudioUpload}
        className="hidden"
      />
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
    <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm active:bg-muted/50 transition-all">
      <Button
        variant="secondary"
        size="icon"
        className="h-10 w-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shrink-0 border-none"
        onClick={handlePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-primary" />
        ) : (
          <Play className="h-4 w-4 fill-primary ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-xs truncate">
          {audio.name || "Untitled Audio"}
        </h3>
        <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
          {duration} •{" "}
          {audio.size ? `${Math.round(audio.size / 1024)}KB` : "0KB"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary"
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
