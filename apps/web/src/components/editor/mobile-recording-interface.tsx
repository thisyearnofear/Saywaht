"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  RotateCcw,
  Check,
  X,
} from "@/lib/icons";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";
import {
  requestMicrophoneAccess,
  RecordingCountdown,
} from "@/lib/audio-recording";

export type MobileRecorderState = "idle" | "recording" | "completed";

interface MobileRecordingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (audioBlob: Blob) => void;
  autoStart?: boolean;
  onRecordingStateChange?: (state: MobileRecorderState) => void;
}

export function MobileRecordingInterface({
  isOpen,
  onClose,
  onComplete,
  autoStart = false,
  onRecordingStateChange,
}: MobileRecordingInterfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get playback controls and state
  const {
    isPlaying,
    play,
    pause,
    seek,
  } = usePlaybackStore();

  const [recordingState, setRecordingState] = useState<MobileRecorderState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Constants
  const MAX_RECORDING_DURATION = 15;

  // Compute countdown state based on recording time
  const countdownState = {
    remaining: Math.max(0, MAX_RECORDING_DURATION - recordingTime),
    isWarning: recordingTime >= MAX_RECORDING_DURATION * 0.7 && recordingTime < MAX_RECORDING_DURATION * 0.9,
    isCritical: recordingTime >= MAX_RECORDING_DURATION * 0.9,
  };

  useEffect(() => {
    onRecordingStateChange?.(recordingState);
  }, [recordingState, onRecordingStateChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      pause();
    }
  }, [recordingState, pause]);

  const visualizeAudio = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // Smaller for minimal visualizer
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Simple centered bars
      const barWidth = (canvas.width / bufferLength) * 0.8;
      let x = (canvas.width - (bufferLength * (barWidth + 1))) / 2;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        ctx.fillStyle = recordingState === "recording" ? "#ef4444" : "#3b82f6";
        ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [recordingState]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await requestMicrophoneAccess();

      // Start visualization
      visualizeAudio(stream);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setRecordingState("completed");

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setRecordingTime(0);

      // Start timer to track recording time
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_DURATION) {
            // Auto-stop when time limit reached
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      // Start video playback
      if (!isPlaying) {
        play();
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, [visualizeAudio, stopRecording, isPlaying, play]);

  useEffect(() => {
    if (!isOpen) {
      setRecordingState("idle");
      setRecordingTime(0);
      setAudioBlob(null);
      return;
    }

    if (autoStart && recordingState === "idle") {
      void startRecording();
    }
  }, [isOpen, autoStart, recordingState, startRecording]);

  const retakeRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingState("idle");
    setRecordingTime(0);
    setAudioBlob(null);
    seek(0);
  };

  const acceptRecording = () => {
    if (audioBlob) {
      onComplete(audioBlob);
      onClose();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-4 shadow-sm flex flex-col items-center gap-4">
      {/* Top Row: Timer and Close */}
      <div className="w-full flex items-center justify-between">
         <div className={cn(
             "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest transition-colors",
             recordingState === "recording" ? "bg-red-500 text-white animate-pulse" : "bg-muted text-muted-foreground"
           )}>
           {recordingState === "recording" 
             ? RecordingCountdown.formatCountdownTime(countdownState.remaining) 
             : "Ready"}
         </div>
         
         <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={onClose}>
           <X className="h-4 w-4" />
         </Button>
      </div>

      {/* Waveform - Clean, no text */}
      <div className="w-full h-12 bg-muted/20 rounded-lg overflow-hidden relative border border-border/30">
         <canvas ref={canvasRef} width={300} height={48} className="w-full h-full" />
      </div>

      {/* Controls - Centered and Big */}
      <div className="flex items-center gap-6">
         {recordingState === "completed" && (
           <Button variant="ghost" size="icon" onClick={retakeRecording} className="h-10 w-10 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-5 w-5" />
           </Button>
         )}

         <Button
           size="lg"
           className={cn(
             "h-16 w-16 rounded-full transition-all shadow-lg scale-100 active:scale-95 flex items-center justify-center",
             recordingState === "idle" && "bg-red-500 hover:bg-red-600 shadow-red-500/20",
             recordingState === "recording" && "bg-red-600 hover:bg-red-700 ring-4 ring-red-500/30",
             recordingState === "completed" && "bg-green-500 hover:bg-green-600 shadow-green-500/20"
           )}
           onClick={
             recordingState === "idle"
               ? startRecording
               : recordingState === "recording"
                 ? stopRecording
                 : acceptRecording
           }
         >
           {recordingState === "idle" && <Mic className="h-7 w-7" />}
           {recordingState === "recording" && <Square className="h-6 w-6 fill-white" />}
           {recordingState === "completed" && <Check className="h-7 w-7" />}
         </Button>
      </div>
    </div>
  );
}
