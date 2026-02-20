"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  RotateCcw,
  Check,
  X,
  Sparkles,
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
  const [currentHint, setCurrentHint] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState(0);

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

  // Update current hint as recording progresses
  useEffect(() => {
    if (recordingState === "recording") {
      if (recordingTime < 2) setCurrentHint("Start speaking clearly...");
      else if (recordingTime < 5) setCurrentHint("Great! Keep going...");
      else if (recordingTime < 8) setCurrentHint("Almost there...");
      else setCurrentHint("Finish up!");
    }
  }, [recordingTime, recordingState]);

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
    analyser.fftSize = 128; // Smaller for mobile performance
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

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Dynamic gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "#3b82f6"); // Blue
        gradient.addColorStop(1, "#ef4444"); // Red

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      // Update audio level state for simpler visualizer
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setAudioLevel(average / 255);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, []);

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
        setAudioLevel(0);

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
      setCurrentHint("");
      setAudioLevel(0);
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
    <div className="rounded-xl border border-red-500/20 bg-background/95 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              recordingState === "recording" ? "bg-red-500 animate-pulse" : "bg-muted-foreground/40"
            )}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            Voiceover
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
              countdownState.isCritical
                ? "bg-red-500/15 text-red-500"
                : countdownState.isWarning
                  ? "bg-orange-500/15 text-orange-500"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {RecordingCountdown.formatCountdownTime(countdownState.remaining)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onClose}
          disabled={recordingState === "recording"}
          aria-label="Close recording"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {recordingState === "recording" && currentHint && (
        <div className="mb-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[11px] font-medium">{currentHint}</span>
          </div>
        </div>
      )}

      <div className="mb-3 rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <canvas
          ref={canvasRef}
          width={300}
          height={48}
          className="h-12 w-full"
        />
        <div className="mt-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
          <span>Live Waveform</span>
          <span>{Math.round(audioLevel * 100)}%</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        {recordingState === "completed" && (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={retakeRecording}
            aria-label="Retake recording"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full transition-colors",
            recordingState === "idle" && "bg-red-500 hover:bg-red-600",
            recordingState === "recording" && "bg-red-600 hover:bg-red-700",
            recordingState === "completed" && "bg-green-600 hover:bg-green-700"
          )}
          onClick={
            recordingState === "idle"
              ? startRecording
              : recordingState === "recording"
                ? stopRecording
                : acceptRecording
          }
          aria-label={
            recordingState === "idle"
              ? "Start recording"
              : recordingState === "recording"
                ? "Stop recording"
                : "Accept recording"
          }
        >
          {recordingState === "idle" && <Mic className="h-6 w-6" />}
          {recordingState === "recording" && <Square className="h-6 w-6" />}
          {recordingState === "completed" && <Check className="h-6 w-6" />}
        </Button>
      </div>

      <div className="mt-2 text-center text-[11px] text-muted-foreground">
        {recordingState === "idle" && "Tap to start recording in place"}
        {recordingState === "recording" && "Recording while preview keeps playing"}
        {recordingState === "completed" && "Tap check to keep, or retake"}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/80">
        <Sparkles className="h-3.5 w-3.5" />
        AI captions enabled
      </div>
    </div>
  );
}
