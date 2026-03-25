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
  const [recorderState, setRecorderState] = useState<MobileRecorderState>("idle");
  const [originalVolume, setOriginalVolume] = useState(1);

  // Filter for audio files only
  const audioFiles = mediaItems.filter(
    (item) => item.type === "audio" || item.file?.type?.startsWith("audio/")
  );

  const videoTracks = tracks.filter((t) => t.type === "video");
  const hasVideoWithAudio = videoTracks.some(t => t.clips.some(c => (c.audioGain ?? 1) > 0));

  const handleVolumeChange = (newVolume: number) => {
    setOriginalVolume(newVolume);
    // Apply this volume to all video clips as audioGain
    videoTracks.forEach(track => {
      track.clips.forEach(clip => {
        useTimelineStore.getState().updateClipAudioGain(track.id, clip.id, newVolume);
      });
    });
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
    options: { duration: number; trimStart: number; trimEnd: number; startTime: number }
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
      startTime: options.startTime, // Use the synced start time
      duration: options.duration,
      trimStart: options.trimStart,
      trimEnd: options.trimEnd,
    });
    
    toast.success("Added to project");
    generateCaptions(audioBlob);
  };

  const handleRecordingStateChange = (state: MobileRecorderState) => {
    setRecorderState(state);
    onRecordingStateChange?.(state);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background relative", className)}>
      <div className="border-b border-border/50 bg-muted/5 p-4 shrink-0 transition-all">
        {showMobileRecording ? (
          <MobileRecordingInterface
            isOpen={showMobileRecording}
            onClose={() => {
              setShowMobileRecording(false);
              setAutoStartRecording(false);
              handleRecordingStateChange("idle");
            }}
            onComplete={handleRecordingComplete}
            autoStart={autoStartRecording}
            onRecordingStateChange={handleRecordingStateChange}
          />
        ) : (
          <div className="space-y-4">
            <Button
              variant="default"
              className="h-12 w-full rounded-2xl bg-red-500 hover:bg-red-600 text-white border-none shadow-[0_4px_14px_rgba(239,68,68,0.3)] text-[12px] font-black uppercase tracking-[0.14em] transition-all active:scale-[0.98]"
              onClick={handleVoiceoverRecord}
              disabled={isTranscribing}
            >
              <Mic className="mr-2 h-5 w-5" />
              {isTranscribing ? "AI is Transcribing..." : "Record Voiceover"}
            </Button>
            
            {hasVideoWithAudio && audioFiles.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" /> Background Mix
                  </span>
                  <span className="text-[10px] font-black text-primary">{Math.round(originalVolume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} max={1} step={0.05} 
                  value={originalVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {recorderState !== "recording" && (
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
      )}
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
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-card border border-border/50 shadow-sm transition-all active:bg-muted/50 group">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0 border-none transition-all group-active:scale-95"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-primary" /> : <Play className="h-4 w-4 fill-primary ml-0.5" />}
        </Button>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-bold text-[11px] truncate uppercase tracking-tight text-foreground/90">
            {audio.name}
          </h3>
          <p className="text-[9px] font-medium text-muted-foreground/60">{Math.round(audio.duration || 0)}s</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-white/5 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            addHapticFeedback("light");
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Decorative Waveform */}
      <div className="h-4 w-full flex items-center justify-between gap-0.5 opacity-30 mt-1 pl-13">
         {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-1 rounded-full transition-all duration-200",
                isPlaying ? "bg-primary" : "bg-muted-foreground"
              )} 
              style={{ height: `${20 + Math.random() * 80}%` }}
            />
         ))}
      </div>

      <audio
        ref={audioRef}
        src={audio.url}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
