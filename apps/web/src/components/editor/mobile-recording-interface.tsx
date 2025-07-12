"use client";

import { useState, useRef, useEffect, useCallback } from "@/lib/hooks-provider";
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
} from "@/lib/icons-provider";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "completed"
  >("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentHint, setCurrentHint] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState(0);

  const { mediaItems } = useMediaStore();
  const { currentTime, duration, isPlaying, play, pause, seek } =
    usePlaybackStore();

  // Get the primary video for recording
  const primaryVideo = mediaItems.find((item) => item.type === "video");

  // Enhanced recording hints based on video progress and content
  const getRecordingHint = useCallback(
    (progress: number) => {
      // Get hints based on video name/type for more specific guidance
      const videoName = primaryVideo?.name?.toLowerCase() || "";

      if (progress < 0.1) {
        if (videoName.includes("tiger"))
          return "Introduce the tiger's personality!";
        if (videoName.includes("penguin"))
          return "What are these penguins thinking?";
        if (videoName.includes("cat"))
          return "Catch this sneaky cat in action!";
        if (videoName.includes("dog"))
          return "What's going through this dog's mind?";
        return "Perfect time to start your commentary!";
      }

      if (progress < 0.3) {
        if (videoName.includes("tiger"))
          return "The tiger is pacing - what's it thinking?";
        if (videoName.includes("penguin"))
          return "Look at that waddle! Add some personality";
        return "Keep going, you're doing great!";
      }

      if (progress < 0.7) {
        if (videoName.includes("tiger"))
          return "Perfect moment for dramatic commentary";
        if (videoName.includes("penguin"))
          return "These penguins are up to something...";
        return "Add your personality to this moment";
      }

      if (progress < 0.9) {
        return "Almost there, finish strong!";
      }

      return "Great job! Wrap up your thoughts";
    },
    [primaryVideo?.name]
  );

  // Visual scene markers for better timing
  const getSceneMarkers = () => {
    const videoName = primaryVideo?.name?.toLowerCase() || "";
    const markers = [];

    if (videoName.includes("tiger")) {
      markers.push(
        { time: 0.2, label: "Tiger starts pacing", color: "bg-yellow-400" },
        { time: 0.5, label: "Turn around", color: "bg-blue-400" },
        { time: 0.8, label: "Intense stare", color: "bg-red-400" }
      );
    } else if (videoName.includes("penguin")) {
      markers.push(
        { time: 0.15, label: "Waddle begins", color: "bg-blue-400" },
        { time: 0.4, label: "Group movement", color: "bg-green-400" },
        { time: 0.7, label: "Cute moment", color: "bg-pink-400" }
      );
    } else {
      // Generic markers
      markers.push(
        { time: 0.25, label: "Key moment", color: "bg-blue-400" },
        { time: 0.5, label: "Mid-point", color: "bg-green-400" },
        { time: 0.75, label: "Climax", color: "bg-red-400" }
      );
    }

    return markers;
  };

  const sceneMarkers = getSceneMarkers();

  // Update hint based on video progress
  useEffect(() => {
    if (duration > 0) {
      const progress = currentTime / duration;
      setCurrentHint(getRecordingHint(progress));
    }
  }, [currentTime, duration, getRecordingHint]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState === "recording") {
      interval = setInterval(() => {
        setRecordingTime((prev: number) => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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

      // Start video playback
      if (!isPlaying) {
        play();
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
      pause();
    }
  };

  const retakeRecording = () => {
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
              <div className="text-white text-xl font-mono font-bold">
                {formatTime(recordingTime)}
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
            <div className="bg-black/50 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-green-400 rounded-full transition-all duration-100 ${
                      audioLevel * 20 > i ? "h-6" : "h-1"
                    }`}
                  />
                ))}
              </div>
              <div className="text-center text-white text-xs mt-2">
                Audio Level: {Math.round(audioLevel * 100)}%
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
        <div className="mt-4 text-center">
          {recordingState === "idle" && (
            <p className="text-white/80 text-sm">
              Tap the red button to start recording your voiceover
            </p>
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
