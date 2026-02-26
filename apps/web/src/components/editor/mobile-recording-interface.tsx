"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  RotateCcw,
  Check,
  X,
  Play,
  Pause as PauseIcon,
  Scissors,
  Plus,
} from "@/lib/icons";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";
import {
  requestMicrophoneAccess,
  RecordingCountdown,
} from "@/lib/audio-recording";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { motion, AnimatePresence } from "motion/react";
import { addHapticFeedback } from "@/lib/mobile-utils";

export type MobileRecorderState = "idle" | "recording" | "completed";

interface MobileRecordingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (audioBlob: Blob, result: { duration: number; trimStart: number; trimEnd: number; startTime: number }) => void;
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
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Get playback controls and state
  const {
    isPlaying: isVideoPlaying,
    play: playVideo,
    pause: pauseVideo,
    seek: seekVideo,
    duration: videoDuration,
  } = usePlaybackStore();

  const [recordingState, setRecordingState] = useState<MobileRecorderState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isReviewPlaying, setIsReviewPlaying] = useState(false);
  
  // Advanced Sync/Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0); 
  const [startTime, setStartTime] = useState(0); // Offset on project timeline

  // Explicitly set to 10s to ensure no confusion with 15s templates
  const MAX_RECORDING_DURATION = 10;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // NEW: Cleanup audio blob URL on unmount
      if (reviewAudioRef.current) {
        const audioSrc = reviewAudioRef.current.src;
        if (audioSrc && audioSrc.startsWith('blob:')) {
          URL.revokeObjectURL(audioSrc);
        }
        reviewAudioRef.current.pause();
        reviewAudioRef.current = null;
      }
    };
  }, []);

  // Compute countdown state
  const countdownState = {
    remaining: Math.max(0, MAX_RECORDING_DURATION - recordingTime),
    isWarning: recordingTime >= MAX_RECORDING_DURATION * 0.7 && recordingTime < MAX_RECORDING_DURATION * 0.9,
    isCritical: recordingTime >= MAX_RECORDING_DURATION * 0.9,
  };

  useEffect(() => {
    onRecordingStateChange?.(recordingState);
  }, [recordingState, onRecordingStateChange]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Explicitly clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      pauseVideo();
      addHapticFeedback("medium");
    }
  }, [pauseVideo]);

  // Keep a stable ref so the interval timer always has the latest stopRecording
  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  // NEW: Prevent closing while recording
  const handleClose = useCallback(() => {
    if (recordingState === "recording") {
      toast.error("Stop recording first", {
        description: "Tap the red button to stop recording before closing"
      });
      addHapticFeedback("heavy");
      return;
    }
    onClose();
  }, [recordingState, onClose]);

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
      
      // Stop animating if completed
      if (mediaRecorderRef.current?.state === "inactive") {
        return;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContext.close();
    };
  }, [recordingState]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await requestMicrophoneAccess();
      visualizeAudio(stream);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setRecordingState("completed");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setRecordingTime(0);
      setTrimStart(0);
      setTrimEnd(0);
      setStartTime(0);
      
      // Sync video playback exactly with recording
      seekVideo(0); 
      setTimeout(() => playVideo(), 50); // Small buffer for sync

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_DURATION) stopRecordingRef.current();
          return newTime;
        });
      }, 1000);

      addHapticFeedback("heavy");
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, [visualizeAudio, playVideo, seekVideo, MAX_RECORDING_DURATION]);

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
    if (timerRef.current) clearInterval(timerRef.current);
    
    // NEW: Cleanup audio blob URL
    if (reviewAudioRef.current) {
      const audioSrc = reviewAudioRef.current.src;
      if (audioSrc && audioSrc.startsWith('blob:')) {
        URL.revokeObjectURL(audioSrc);
      }
      reviewAudioRef.current.pause();
      reviewAudioRef.current = null;
    }
    
    setRecordingState("idle");
    setRecordingTime(0);
    setAudioBlob(null);
    setIsReviewPlaying(false);
    seekVideo(0);
    addHapticFeedback("medium");
  };

  const toggleReviewPlayback = () => {
    if (!audioBlob) return;
    
    if (!reviewAudioRef.current) {
      reviewAudioRef.current = new Audio(URL.createObjectURL(audioBlob));
      reviewAudioRef.current.onended = () => setIsReviewPlaying(false);
    }

    if (isReviewPlaying) {
      reviewAudioRef.current.pause();
      pauseVideo();
      setIsReviewPlaying(false);
    } else {
      const actualVideoStart = startTime + trimStart;
      seekVideo(actualVideoStart);
      playVideo();
      reviewAudioRef.current.currentTime = trimStart;
      reviewAudioRef.current.play();
      setIsReviewPlaying(true);
    }
    addHapticFeedback("light");
  };

  const acceptRecording = () => {
    if (audioBlob) {
      onComplete(audioBlob, { 
        duration: recordingTime, 
        trimStart: trimStart, 
        trimEnd: trimEnd,
        startTime: startTime
      });
      
      // NEW: Cleanup audio blob URL after accepting
      if (reviewAudioRef.current) {
        const audioSrc = reviewAudioRef.current.src;
        if (audioSrc && audioSrc.startsWith('blob:')) {
          URL.revokeObjectURL(audioSrc);
        }
      }
      
      onClose();
      addHapticFeedback("heavy");
    }
  };

  if (!isOpen) return null;

  const isRecording = recordingState === "recording";
  const isCompleted = recordingState === "completed";

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-background/95 shadow-2xl flex flex-col items-center overflow-hidden transition-all duration-500",
        isRecording ? "p-3 gap-2 border-red-500/30" : "p-5 gap-6 border-border/50"
      )}
    >
      <AnimatePresence mode="wait">
        {!isRecording && (
          <motion.div 
            key="header"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full flex items-center justify-between px-1"
          >
            <div className={cn(
                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                isCompleted ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
              )}>
              {isCompleted ? "✓ Recorded • Review & Sync" : "🎙 Ready • 10s Max"}
            </div>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content Area (Waveform or Trim/Sync) */}
      <div className={cn(
        "w-full bg-muted/10 rounded-xl overflow-hidden relative border border-border/20 transition-all duration-500",
        isRecording ? "h-8" : "h-32"
      )}>
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div 
              key="trim-sync-ui"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 p-4 flex flex-col justify-center gap-4 bg-primary/[0.02]"
            >
              <div className="space-y-3">
                {/* Visual Timeline Overlay */}
                <div className="relative h-10 bg-muted/40 rounded-lg overflow-hidden border border-white/5">
                  {/* Visual Audio Representation (Placeholder bars) */}
                  <div className="absolute inset-0 flex items-center justify-around px-2 opacity-10">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="w-0.5 bg-foreground" style={{ height: `${20 + Math.random() * 60}%` }} />
                    ))}
                  </div>

                  {/* Visual Trim Region */}
                  <div 
                    className="absolute inset-y-0 bg-primary/20 border-x-2 border-primary/50"
                    style={{
                      left: `${(trimStart / recordingTime) * 100}%`,
                      right: `${(trimEnd / recordingTime) * 100}%`
                    }}
                  />
                  
                  {/* Playhead for Review */}
                  {isReviewPlaying && (
                    <motion.div 
                      className="absolute inset-y-0 w-0.5 bg-white z-10 shadow-[0_0_8px_white]"
                      animate={{ left: `${(reviewAudioRef.current?.currentTime || 0) / recordingTime * 100}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  )}
                </div>

                {/* Sync & Trim Controls */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase">
                        <span className="flex items-center gap-1"><Scissors className="h-2 w-2" /> Start Trim</span>
                        <span className="text-primary">{trimStart.toFixed(1)}s</span>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={Math.max(0, recordingTime - 0.5)} 
                        step={0.1}
                        value={trimStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTrimStart(val);
                          if (reviewAudioRef.current) reviewAudioRef.current.currentTime = val;
                          seekVideo(startTime + val);
                        }}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase">
                        <span className="flex items-center gap-1">Sync Start</span>
                        <span className="text-primary">{startTime.toFixed(1)}s</span>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={Math.max(0, videoDuration - 1)} 
                        step={0.1}
                        value={startTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setStartTime(val);
                          seekVideo(val + trimStart);
                        }}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <canvas ref={canvasRef} width={300} height={80} className="w-full h-full" />
          )}
        </AnimatePresence>
      </div>

      {/* Controls Area */}
      <div className={cn(
        "flex items-center gap-8 transition-all duration-500",
        isRecording ? "scale-90" : "scale-100"
      )}>
        {isCompleted && (
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleReviewPlayback} 
            className="h-12 w-12 rounded-full border-primary/20 bg-primary/5 text-primary shadow-lg"
          >
            {isReviewPlaying ? <PauseIcon className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
        )}

        <div className="relative">
          {/* Countdown Ring */}
          {isRecording && (
            <svg className="absolute -inset-2 w-20 h-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-primary/10"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="226.2"
                animate={{ strokeDashoffset: (recordingTime / MAX_RECORDING_DURATION) * 226.2 }}
                transition={{ duration: 1, ease: "linear" }}
                className="text-primary"
              />
            </svg>
          )}

          <Button
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full transition-all shadow-xl flex items-center justify-center z-10",
              !isRecording && !isCompleted && "bg-red-500 hover:bg-red-600 shadow-red-500/20",
              isRecording && "bg-red-600 hover:bg-red-700 ring-offset-4 ring-offset-background ring-4 ring-red-500/30",
              isCompleted && "bg-green-500 hover:bg-green-600 shadow-green-500/20"
            )}
            onClick={
              !isRecording && !isCompleted
                ? startRecording
                : isRecording
                  ? stopRecording
                  : acceptRecording
            }
          >
            {!isRecording && !isCompleted && <Mic className="h-7 w-7" />}
            {isRecording && <Square className="h-6 w-6 fill-white" />}
            {isCompleted && <Check className="h-7 w-7" />}
          </Button>

          {/* Mini Timer Overlay when recording */}
          {isRecording && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl px-2 py-0.5 rounded-full border border-white/10 shadow-2xl">
              <span className={cn(
                "text-[10px] font-black tabular-nums",
                countdownState.isCritical ? "text-red-500" : "text-white"
              )}>
                {RecordingCountdown.formatCountdownTime(countdownState.remaining)}
              </span>
            </div>
          )}
        </div>

        {isCompleted && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={retakeRecording} 
            className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {!isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-center"
          >
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              {isCompleted ? "Step 3: Save to Project" : "Tap to Start • 10s Max"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
