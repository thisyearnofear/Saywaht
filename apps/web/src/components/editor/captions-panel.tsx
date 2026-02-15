"use client";

import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { useTextStore } from "@/stores/text-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { transcriptionService } from "@/services/transcription/service";
import { buildCaptionChunks } from "@/lib/transcription/caption";
import {
  extractAudioFromTimeline,
  decodeAudioToFloat32,
} from "@/lib/media/audio";
import { Type, Loader2, Trash2, Play, ChevronUp, ChevronDown } from "@/lib/icons";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/constants/transcription-constants";
import type { TranscriptionLanguage } from "@/constants/transcription-constants";

type CaptionPosition = "top" | "bottom";
const POSITION_Y: Record<CaptionPosition, number> = { top: 0.12, bottom: 0.85 };

export function CaptionsPanel() {
  const { addTextElement, deleteTextElement, updateTextElement, textElements } = useTextStore();
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaItems = useMediaStore((s) => s.mediaItems);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [captionIds, setCaptionIds] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] =
    useState<TranscriptionLanguage>("en");
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>("bottom");

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Extracting audio...");

    try {
      // Step 1: Extract audio blobs from timeline
      const blobs = await extractAudioFromTimeline(tracks, mediaItems);
      if (blobs.length === 0) {
        toast.error("No audio or video clips found on the timeline");
        setIsGenerating(false);
        setStatusMessage("");
        return;
      }

      // Step 2: Decode first audio blob to Float32 (mono)
      setStatusMessage("Decoding audio...");
      const { samples } = await decodeAudioToFloat32(blobs[0]);

      // Step 3: Transcribe via worker
      setStatusMessage("Loading model...");
      const result = await transcriptionService.transcribe({
        audioData: samples,
        language: selectedLanguage,
        onProgress: (info) => {
          if (typeof info.progress === "number") {
            setProgress(Math.round(info.progress));
            setStatusMessage(`Loading model (${Math.round(info.progress)}%)...`);
          } else {
            setStatusMessage(info.status || "Loading model...");
          }
        },
      });

      // Step 4: Build caption chunks from transcription segments
      setStatusMessage("Building captions...");
      const chunks = buildCaptionChunks(result.segments);

      if (chunks.length === 0) {
        toast.error("No speech detected in the audio");
        setIsGenerating(false);
        setStatusMessage("");
        return;
      }

      // Step 5: Add each caption chunk as a TextElement
      const newIds: string[] = [];
      for (const chunk of chunks) {
        const id = addTextElement({
          content: chunk.text,
          fontSize: 28,
          fontWeight: "bold",
          color: "#FFFFFF",
          textAlign: "center",
          x: 0.5,
          y: POSITION_Y[captionPosition],
          opacity: 1,
          fontFamily: "Inter",
          startTime: chunk.startTime,
          endTime: chunk.startTime + chunk.duration,
        });
        newIds.push(id);
      }

      setCaptionIds((prev) => [...prev, ...newIds]);
      setStatusMessage("Done!");
      setProgress(100);
      toast.success(`Generated ${chunks.length} caption(s)`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transcription failed";
      setStatusMessage("");
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [tracks, mediaItems, selectedLanguage, captionPosition, addTextElement]);

  const handleTogglePosition = useCallback(() => {
    const newPos: CaptionPosition = captionPosition === "bottom" ? "top" : "bottom";
    setCaptionPosition(newPos);
    for (const id of captionIds) {
      updateTextElement(id, { y: POSITION_Y[newPos] });
    }
  }, [captionPosition, captionIds, updateTextElement]);

  const handleClearCaptions = useCallback(() => {
    for (const id of captionIds) {
      deleteTextElement(id);
    }
    setCaptionIds([]);
    setStatusMessage("");
    setProgress(0);
    toast.success("Captions cleared");
  }, [captionIds, deleteTextElement]);

  const handleSeekToCaption = useCallback(
    (id: string) => {
      const el = textElements.find((t) => t.id === id);
      if (el) {
        setCurrentTime(el.startTime);
      }
    },
    [textElements, setCurrentTime]
  );

  const captionElements = textElements.filter((t) => captionIds.includes(t.id));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-muted/5">
        <div className="flex items-center gap-2 mb-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Auto Captions</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Automatically generate captions from audio
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Language Selector */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Language
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) =>
              setSelectedLanguage(e.target.value as TranscriptionLanguage)
            }
            disabled={isGenerating}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Position Toggle */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Position
          </div>
          <div className="flex gap-2">
            <Button
              variant={captionPosition === "top" ? "secondary" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                if (captionPosition !== "top") handleTogglePosition();
              }}
              disabled={isGenerating}
            >
              <ChevronUp className="h-3 w-3 mr-1" />
              Top
            </Button>
            <Button
              variant={captionPosition === "bottom" ? "secondary" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                if (captionPosition !== "bottom") handleTogglePosition();
              }}
              disabled={isGenerating}
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Bottom
            </Button>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Type className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? "Generating..." : "Generate Captions"}
        </Button>

        {/* Progress */}
        {statusMessage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{statusMessage}</span>
              {isGenerating && <span>{progress}%</span>}
            </div>
            {isGenerating && (
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Caption List */}
        {captionElements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">
                Captions ({captionElements.length})
              </div>
              <Button
                onClick={handleClearCaptions}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {captionElements.map((caption) => (
                <button
                  key={caption.id}
                  onClick={() => handleSeekToCaption(caption.id)}
                  className="w-full p-2 rounded border bg-card text-xs flex items-center gap-2 transition-colors hover:bg-accent/50"
                >
                  <Play className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-left">
                    {caption.content.substring(0, 30)}
                    {caption.content.length > 30 && "..."}
                  </span>
                  <span className="text-muted-foreground">
                    {caption.startTime.toFixed(1)}s
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {captionElements.length === 0 && !isGenerating && !statusMessage && (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No captions yet</p>
            <p className="text-xs mt-1">
              Generate captions from your video audio
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
