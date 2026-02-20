"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  Volume2,
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
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Filter for audio files only
  const audioFiles = mediaItems.filter(
    (item) => item.type === "audio" || item.file?.type?.startsWith("audio/")
  );

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
      loading: "AI transcribing...",
      success: (result) => `Captioned!`,
      error: (err) => `Failed: ${err.message}`,
    });

    try {
      const result = await captionPromise;
      onCaptionsGenerated?.({ groupId: result.groupId, count: result.count });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRecordingComplete = (
    audioBlob: Blob, 
    options: { duration: number; trimStart: number; trimEnd: number }
  ) => {
    const audioFile = new File([audioBlob], `voiceover-${Date.now()}.webm`, {
      type: "audio/webm",
    });

    const audioItem = {
      id: `audio-${Date.now()}`,
      name: `Voiceover ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      type: "audio" as const,
      file: audioFile,
      url: URL.createObjectURL(audioFile),
      duration: options.duration,
      aspectRatio: 1,
      isLocal: true,
    };

    addMediaItem(audioItem);

    const existingAudioTrack = tracks.find((t) => t.type === "audio");
    const trackId = existingAudioTrack?.id ?? addTrack("audio");

    addClipToTrack(trackId, {
      mediaId: audioItem.id,
      name: audioItem.name,
      startTime: 0,
      duration: options.duration,
      trimStart: options.trimStart,
      trimEnd: options.trimEnd,
    });
    
    toast.success("Added to project");
    generateCaptions(audioBlob);
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
              if (onRecordingStateChange) onRecordingStateChange("idle");
            }}
            onComplete={handleRecordingComplete}
            autoStart={autoStartRecording}
            onRecordingStateChange={onRecordingStateChange}
          />
        ) : (
          <Button
            variant="destructive"
            className="h-10 w-full rounded-lg border-none text-[11px] font-black uppercase tracking-[0.14em]"
            onClick={handleVoiceoverRecord}
            disabled={isTranscribing}
          >
            <Mic className="mr-2 h-4 w-4" />
            {isTranscribing ? "Transcribing..." : "Record Voiceover"}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2.5">
          {audioFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-muted/30">
                <Volume2 className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground/60">No voiceovers yet</p>
            </div>
          ) : (
            audioFiles.map((audio) => (
              <AudioFileCard key={audio.id} audio={audio} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function AudioFileCard({ audio }: { audio: any }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    addHapticFeedback("light");
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm active:bg-muted/50 transition-all">
      <Button
        variant="secondary"
        size="icon"
        className="h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0 border-none"
        onClick={handlePlayPause}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-primary" /> : <Play className="h-4 w-4 fill-primary ml-0.5" />}
      </Button>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[11px] truncate uppercase tracking-tight">
          {audio.name}
        </h3>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground/40"
        onClick={(e) => {
          e.stopPropagation();
          addHapticFeedback("light");
        }}
      >
        <Download className="h-4 w-4" />
      </Button>

      <audio
        ref={audioRef}
        src={audio.url}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
