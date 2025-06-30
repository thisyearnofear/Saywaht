"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Mic, Square, Save, Trash2, X } from "lucide-react";
import { useMediaStore } from "../../stores/media-store";
import { usePlaybackStore } from "../../stores/playback-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { toast } from "sonner";

export function VoiceoverRecorder() {
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "previewing"
  >("idle");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { addMediaItem, mediaItems } = useMediaStore();
  const { isPlaying, play, pause, currentTime } = usePlaybackStore();
  const hasVideo = mediaItems.some((item) => item.type === "video");

  useEffect(() => {
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

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      setRecordingState("previewing");
      if (isPlaying) {
        pause();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    };

    mediaRecorderRef.current.onerror = () => {
      const errorMessage = "An error occurred during recording.";
      setError(errorMessage);
      toast.error(errorMessage);
      setRecordingState("idle");
    };

    mediaRecorderRef.current.start();
    setRecordingState("recording");
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const saveRecording = () => {
    if (audioURL) {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const audioFile = new File([audioBlob], `voiceover-${Date.now()}.wav`, {
        type: "audio/wav",
      });
      addMediaItem({
        name: audioFile.name,
        type: "audio",
        file: audioFile,
        url: audioURL,
        duration: recordingTime,
        aspectRatio: 1,
      });
      // The URL will be revoked when the component unmounts or the media item is deleted.
      setRecordingState("idle");
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
    <Card className="w-full max-w-sm border-border/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Record Voiceover
        </CardTitle>
        <Button variant="text" size="icon" className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {recordingState === "idle" && (
          <div className="flex flex-col items-center justify-center space-y-6 pt-4">
            <Button
              onClick={startRecording}
              size="lg"
              className="h-20 w-20 rounded-full"
              disabled={!hasVideo}
              title={
                !hasVideo ? "Please upload a video first" : "Start Recording"
              }
            >
              <Mic className="h-8 w-8" />
            </Button>
          </div>
        )}

        {recordingState === "recording" && (
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="relative h-20 w-20 rounded-full"
            >
              <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <Square className="h-8 w-8" />
            </Button>
            <p className="font-mono text-lg text-muted-foreground">
              {formatTime(recordingTime)}
            </p>
          </div>
        )}

        {recordingState === "previewing" && audioURL && (
          <div className="space-y-4 pt-2">
            <audio controls src={audioURL} className="w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={saveRecording}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button onClick={discardRecording} variant="outline">
                <Trash2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
