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
import { useMissionStore } from "@/services/mission-service";

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
  const { addXp } = useMissionStore();
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
    addXp(25); // Reward for recording
    generateCaptions(audioBlob);
  };

  const handleRecordingStateChange = (state: MobileRecorderState) => {
    setRecorderState(state);
    onRecordingStateChange?.(state);
  };

  return (
    <div className={cn("flex flex-col h-full bg-transparent relative", className)}>
      <div className="border-b border-white/5 bg-white/[0.02] p-4 shrink-0 transition-all">
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
              className="h-12 w-full rounded-2xl bg-red-500 hover:bg-red-600 text-white border-none shadow-[0_4px_14px_rgba(239,68,68,0.2)] text-[11px] font-black uppercase tracking-[0.14em] transition-all active:scale-[0.98]"
              onClick={handleVoiceoverRecord}
              disabled={isTranscribing}
            >
              <Mic className="mr-2 h-4 w-4" />
              {isTranscribing ? "AI is Transcribing..." : "Record Voiceover"}
            </Button>
            
            {hasVideoWithAudio && audioFiles.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-3 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                    <Volume2 className="h-3 w-3" /> Background Mix
                  </span>
                  <span className="text-[9px] font-black text-primary">{Math.round(originalVolume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} max={1} step={0.05} 
                  value={originalVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {recorderState !== "recording" && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {audioFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03] border border-white/5">
                  <Volume2 className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">No voiceovers yet</p>
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
    <div className="w-full flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm transition-all active:bg-white/[0.06] group">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-xl bg-primary/20 text-primary shrink-0 border border-primary/10 transition-all group-active:scale-95"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-primary" /> : <Play className="h-4 w-4 fill-primary ml-0.5" />}
        </Button>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-black text-[10px] truncate uppercase tracking-wider text-white/80">
            {audio.name}
          </h3>
          <p className="text-[9px] font-bold text-white/30">{Math.round(audio.duration || 0)}s</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-white/20 hover:text-white hover:bg-white/5 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            addHapticFeedback("light");
          }}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {/* Decorative Waveform */}
      <div className="h-5 w-full flex items-center justify-between gap-0.5 opacity-20 mt-1">
         {Array.from({ length: 45 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                isPlaying ? "bg-primary" : "bg-white/40"
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
