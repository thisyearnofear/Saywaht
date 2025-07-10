"use client";

import { useState, useEffect, useRef } from "@/lib/hooks-provider";
import { Button } from "../ui/button";
import { Mic, Square, Save, Trash2, AlertCircle } from "@/lib/icons-provider";
import { useMediaStore } from "../../stores/media-store";
import { usePlaybackStore } from "../../stores/playback-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function VoiceoverRecorder() {
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "previewing"
  >("idle");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [audioFormat, setAudioFormat] = useState<string>("audio/webm");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordingTimeRef = useRef<number>(0); // Track actual recording time

  const { addMediaItem, mediaItems } = useMediaStore();
  const { isPlaying, play, pause, currentTime } = usePlaybackStore();
  const hasVideo = mediaItems.some((item) => item.type === "video");

  // Detect the best supported audio format - prioritize formats with reliable duration metadata
  const detectAudioFormat = () => {
    const formats = [
      "audio/wav", // Most reliable for duration metadata, universal compatibility
      "audio/mp4", // Good compatibility, especially iOS Safari
      "audio/webm", // Chrome/Firefox but can have metadata issues
      "audio/ogg", // Firefox/Chrome, less reliable metadata
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        console.log(
          `🎵 Selected audio format: ${format} (duration metadata reliability priority)`
        );
        return format;
      }
    }
    console.warn("⚠️ Using fallback audio format - may have metadata issues");
    return "audio/webm"; // Fallback
  };

  useEffect(() => {
    // Set the best supported audio format
    const bestFormat = detectAudioFormat();
    setAudioFormat(bestFormat);
    console.log("🎵 Using audio format:", bestFormat);

    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioURL]);

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      setError(
        "Microphone access denied. Please enable it in your browser settings."
      );
      toast.error(
        "Microphone access denied. Please enable it in your browser settings."
      );
      return null;
    }
  };

  const startRecording = async () => {
    setError(null);
    const stream = await requestMicrophoneAccess();
    if (!stream) return;

    if (!isPlaying) {
      play();
    }

    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: audioFormat,
      });
      recordedBlobRef.current = audioBlob;
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      setRecordingState("previewing");
      if (isPlaying) {
        pause();
      }
      if (timerRef.current) clearInterval(timerRef.current);

      // Use timer-based duration as primary method (most reliable for recordings)
      const timerDuration = Math.max(recordingTimeRef.current, 0.5);
      console.log("⏱️ Timer-based duration:", timerDuration, "seconds");
      console.log("⏱️ Recording time state:", recordingTime, "seconds");
      console.log(
        "⏱️ Recording time ref:",
        recordingTimeRef.current,
        "seconds"
      );
      console.log(
        "📊 Audio blob size:",
        (audioBlob.size / 1024).toFixed(1),
        "KB"
      );

      // Set timer duration immediately as the primary duration
      setRecordedDuration(timerDuration);

      // Add delay before attempting to read metadata (allows blob finalization)
      setTimeout(() => {
        console.log(
          "🔍 Attempting metadata extraction after finalization delay..."
        );

        const audio = new Audio();
        let durationCheckTimeout: NodeJS.Timeout;

        const finalizeDuration = (duration: number, source: string) => {
          console.log(`🎵 Final duration: ${duration}s (${source})`);
          setRecordedDuration(duration);
          if (durationCheckTimeout) clearTimeout(durationCheckTimeout);
        };

        // Set timeout to prevent hanging on metadata loading
        durationCheckTimeout = setTimeout(() => {
          console.log(
            "⏰ Metadata extraction timed out, keeping timer duration"
          );
        }, 3000);

        audio.addEventListener("loadedmetadata", () => {
          const actualDuration = audio.duration;
          console.log("🎵 Raw metadata duration:", actualDuration);

          // Validate duration with comprehensive checks
          const isValidDuration =
            actualDuration &&
            !isNaN(actualDuration) &&
            isFinite(actualDuration) &&
            actualDuration > 0 &&
            actualDuration < 7200; // Max 2 hours sanity check

          if (isValidDuration) {
            // Use actual duration if it's reasonable compared to timer
            const timeDiff = Math.abs(actualDuration - timerDuration);
            const percentDiff =
              timeDiff / Math.max(timerDuration, actualDuration);

            if (percentDiff < 0.3 || timeDiff < 3) {
              // More lenient thresholds
              finalizeDuration(actualDuration, "metadata (validated)");
            } else {
              console.log(
                `⚠️ Metadata duration (${actualDuration}s) vs timer (${timerDuration}s) - using timer for consistency`
              );
            }
          } else {
            console.log(
              `❌ Invalid metadata duration: ${actualDuration} (${typeof actualDuration})`
            );
          }
        });

        audio.addEventListener("error", (e) => {
          console.warn("⚠️ Audio metadata loading failed:", e);
        });

        audio.addEventListener("canplay", () => {
          console.log("▶️ Audio can play - blob is valid");
        });

        // Load the audio with error handling
        try {
          audio.src = url;
          audio.load();
        } catch (e) {
          console.warn("⚠️ Could not load audio for metadata extraction:", e);
        }
      }, 250); // 250ms delay to allow blob finalization
    };

    mediaRecorderRef.current.onerror = () => {
      const errorMessage = "An error occurred during recording.";
      setError(errorMessage);
      toast.error(errorMessage);
      setRecordingState("idle");
      setRecordingTime(0);
      recordingTimeRef.current = 0; // Reset ref
      setRecordedDuration(0);
      recordedBlobRef.current = null;
    };

    mediaRecorderRef.current.start();
    setRecordingState("recording");
    setRecordingTime(0);
    recordingTimeRef.current = 0; // Reset ref
    timerRef.current = setInterval(() => {
      setRecordingTime((prev: number) => {
        const newTime = prev + 1;
        recordingTimeRef.current = newTime; // Update ref
        return newTime;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
    }
  };

  const saveRecording = async () => {
    if (audioURL && recordedBlobRef.current) {
      // Use the timer-based duration directly - it's the most reliable
      const finalDuration = Math.max(recordedDuration, 0.5); // Minimum 0.5 seconds

      console.log("💾 Saving audio with timer-based duration:", finalDuration);

      // Create a new blob URL that won't be revoked
      const newBlob = recordedBlobRef.current;
      const newUrl = URL.createObjectURL(newBlob);

      // Get file extension based on format
      const getFileExtension = (format: string) => {
        if (format.includes("mp4")) return "m4a"; // Use m4a for MP4 audio
        if (format.includes("wav")) return "wav";
        if (format.includes("ogg")) return "ogg";
        return "webm"; // fallback
      };

      const extension = getFileExtension(audioFormat);
      const audioFile = new File(
        [newBlob],
        `voiceover-${Date.now()}.${extension}`,
        {
          type: audioFormat,
        }
      );

      addMediaItem({
        name: audioFile.name,
        type: "audio",
        file: audioFile,
        url: newUrl,
        duration: finalDuration,
        aspectRatio: 1,
      });

      // Don't revoke the new URL as it's now being used by the media item
      // Only revoke the old preview URL
      if (audioURL !== newUrl) {
        URL.revokeObjectURL(audioURL);
      }

      setRecordingState("idle");
      setAudioURL(null);
      setRecordingTime(0);
      recordingTimeRef.current = 0; // Reset ref
      setRecordedDuration(0);
      recordedBlobRef.current = null;
      toast.success("Voiceover saved to library.");
    }
  };

  const discardRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }
    setRecordingState("idle");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {recordingState === "idle" && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Button
            onClick={startRecording}
            size="lg"
            className={cn("h-16 w-16 rounded-full", !hasVideo && "opacity-50")}
            disabled={!hasVideo}
            title={
              !hasVideo ? "Please upload a video first" : "Start Recording"
            }
          >
            <Mic className="h-6 w-6" />
          </Button>
          {!hasVideo && (
            <p className="text-xs text-muted-foreground text-center">
              Upload a video first to record voiceover
            </p>
          )}
        </div>
      )}

      {recordingState === "recording" && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="relative h-16 w-16 rounded-full"
            >
              <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <Square className="h-6 w-6" />
            </Button>
          </div>
          <p className="font-mono text-lg text-muted-foreground">
            {formatTime(recordingTime)}
          </p>
          <p className="text-xs text-muted-foreground">Recording...</p>
        </div>
      )}

      {recordingState === "previewing" && audioURL && (
        <div className="space-y-3">
          <audio controls src={audioURL} className="w-full h-10" />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={saveRecording} size="sm">
              <Save className="mr-2 h-3 w-3" />
              Save
            </Button>
            <Button onClick={discardRecording} variant="outline" size="sm">
              <Trash2 className="mr-2 h-3 w-3" />
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
