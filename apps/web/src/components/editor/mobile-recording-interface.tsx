"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
} from "@/lib/icons";
import { useMediaStore } from "@/stores/media-store";
import type { MediaItem } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";
import {
  requestMicrophoneAccess,
  RecordingCountdown,
} from "@/lib/audio-recording";

// Helper to get primary video from media store
const getPrimaryVideo = (mediaItems: MediaItem[]): MediaItem | null => {
  const video = mediaItems.find((item) => item.type === "video");
  return video || null;
};

interface MobileRecordingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (audioBlob: Blob) => void;
}

export function MobileRecordingInterface({
  isOpen,
  onClose,
  onComplete,
}: MobileRecordingInterfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get playback controls and state
  const {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek,
  } = usePlaybackStore();

  // Get media items to access primary video
  const { mediaItems } = useMediaStore();
  const primaryVideo = getPrimaryVideo(mediaItems);

  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "completed"
  >("idle");
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
  const MAX_RECORDING_DURATION = 10;

  // Compute countdown state based on recording time
  const countdownState = {
    remaining: Math.max(0, MAX_RECORDING_DURATION - recordingTime),
    isWarning: recordingTime >= MAX_RECORDING_DURATION * 0.7 && recordingTime < MAX_RECORDING_DURATION * 0.9,
    isCritical: recordingTime >= MAX_RECORDING_DURATION * 0.9,
  };

  // Compute scene markers based on video duration
  const sceneMarkers = useMemo(() => {
    if (!duration) return [];
    const markers = [];
    const markerCount = Math.min(5, Math.floor(duration / 10));
    for (let i = 0; i <= markerCount; i++) {
      const time = (i / markerCount) * 100;
      const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"];
      markers.push({
        time: time / 100,
        color: colors[i % colors.length],
        label: `Scene ${i + 1}`,
      });
    }
    return markers;
  }, [duration]);

  // Update current hint as recording progresses
  useEffect(() => {
    if (recordingState === "recording") {
      if (recordingTime < 2) setCurrentHint("Start speaking clearly...");
      else if (recordingTime < 5) setCurrentHint("Great! Keep going...");
      else if (recordingTime < 8) setCurrentHint("Almost there...");
      else setCurrentHint("Finish up!");
    }
  }, [recordingTime, recordingState]);

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
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
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

  const startRecording = async () => {
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
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen || !primaryVideo) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Background */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={primaryVideo.url}
          muted
          playsInline
        />

        {/* Top Overlay - Progress and Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between text-white mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            <div className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Progress Bar with Scene Markers */}
          <div className="relative">
            <Progress
              value={(currentTime / duration) * 100}
              className="h-2 bg-white/20"
            />

            {/* Scene markers */}
            {sceneMarkers.map((marker, index) => (
              <div
                key={index}
                className={`absolute top-0 w-1 h-6 ${marker.color} rounded-full transform -translate-x-0.5`}
                style={{ left: `${marker.time * 100}%` }}
                title={marker.label}
              />
            ))}
          </div>
        </div>

        {/* Center - Recording Status */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {recordingState === "recording" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/30 flex items-center justify-center mb-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-red-500" />
              </div>

              {/* Countdown Timer */}
              <div
                className={cn(
                  "text-3xl font-mono font-bold mb-2 transition-colors duration-200",
                  countdownState.isCritical && "text-red-400 animate-pulse",
                  countdownState.isWarning && "text-orange-400",
                  !countdownState.isWarning &&
                    !countdownState.isCritical &&
                    "text-white"
                )}
              >
                {RecordingCountdown.formatCountdownTime(
                  countdownState.remaining
                )}
              </div>

              {/* Progress Ring */}
              <div className="relative w-16 h-16 mb-2">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={
                      countdownState.isCritical
                        ? "#ef4444"
                        : countdownState.isWarning
                          ? "#f97316"
                          : "#3b82f6"
                    }
                    strokeWidth="2"
                    strokeDasharray={`${((MAX_RECORDING_DURATION - countdownState.remaining) / MAX_RECORDING_DURATION) * 100}, 100`}
                  />
                </svg>
              </div>

              <div className="text-white text-sm">
                {countdownState.isCritical && "⏰ Time's up!"}
                {countdownState.isWarning && "⚠️ Almost out of time"}
                {!countdownState.isWarning &&
                  !countdownState.isCritical &&
                  "Recording..."}
              </div>
            </div>
          )}

          {recordingState === "completed" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/30 flex items-center justify-center mb-4">
                <Check className="w-12 h-12 text-green-500" />
              </div>
              <div className="text-white text-lg font-semibold">
                Recording Complete!
              </div>
            </div>
          )}
        </div>

        {/* Recording Hint */}
        {recordingState === "recording" && currentHint && (
          <div className="absolute top-24 left-4 right-4">
            <div className="bg-black/70 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">
                  {currentHint}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Audio Level Visualization */}
        {recordingState === "recording" && (
          <div className="absolute bottom-32 left-4 right-4">
            <div className="bg-black/50 rounded-xl p-4 backdrop-blur-md border border-white/10">
              <canvas 
                ref={canvasRef} 
                width={300} 
                height={60} 
                className="w-full h-16"
              />
              <div className="text-center text-white/60 text-[10px] font-black uppercase tracking-widest mt-2">
                Live Waveform
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center justify-center space-x-8">
          {/* Retake Button */}
          {recordingState === "completed" && (
            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-16 h-16 border-white/30 hover:bg-white/10"
              onClick={retakeRecording}
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </Button>
          )}

          {/* Main Action Button */}
          <Button
            size="lg"
            className={cn(
              "rounded-full w-20 h-20 transition-all",
              recordingState === "idle" && "bg-red-500 hover:bg-red-600",
              recordingState === "recording" && "bg-red-600 hover:bg-red-700",
              recordingState === "completed" &&
                "bg-green-500 hover:bg-green-600"
            )}
            onClick={
              recordingState === "idle"
                ? startRecording
                : recordingState === "recording"
                  ? stopRecording
                  : acceptRecording
            }
          >
            {recordingState === "idle" && <Mic className="w-8 h-8" />}
            {recordingState === "recording" && <Square className="w-8 h-8" />}
            {recordingState === "completed" && <Check className="w-8 h-8" />}
          </Button>

          {/* Spacer for symmetry when no retake button */}
          {recordingState !== "completed" && <div className="w-16" />}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center space-y-1">
          {recordingState === "idle" && (
            <>
              <p className="text-white/80 text-sm">
                Tap the red button to start recording your voiceover
              </p>
              <p className="text-white/60 text-xs">⏱️ Maximum 10 seconds</p>
            </>
          )}
          {recordingState === "recording" && (
            <p className="text-white/80 text-sm">
              Watch the video and add your commentary!
            </p>
          )}
          {recordingState === "completed" && (
            <p className="text-white/80 text-sm">
              Happy with your recording? Tap ✓ to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
