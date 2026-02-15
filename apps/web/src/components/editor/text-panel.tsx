"use client";

import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { useTextStore, DEFAULT_TEXT_PROPERTIES } from "@/stores/text-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { transcriptionService } from "@/services/transcription/service";
import { buildCaptionChunks } from "@/lib/transcription/caption";
import {
  extractAudioFromTimeline,
  decodeAudioToFloat32,
} from "@/lib/media/audio";
import {
  Type,
  Plus,
  Loader2,
  Trash2,
  Play,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "@/lib/icons";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/constants/transcription-constants";
import type { TranscriptionLanguage } from "@/constants/transcription-constants";

// Text style presets
const TEXT_PRESETS = [
  {
    name: "Title",
    properties: {
      fontSize: 64,
      fontWeight: "bold" as const,
      textAlign: "center" as const,
    },
  },
  {
    name: "Subtitle",
    properties: {
      fontSize: 40,
      fontWeight: "normal" as const,
      textAlign: "center" as const,
    },
  },
  {
    name: "Caption",
    properties: {
      fontSize: 28,
      fontWeight: "normal" as const,
      textAlign: "center" as const,
      y: 0.85,
    },
  },
] as const;

type CaptionPosition = "top" | "bottom";
const POSITION_Y: Record<CaptionPosition, number> = { top: 0.12, bottom: 0.85 };

export function TextPanel() {
  const {
    addTextElement,
    deleteTextElement,
    updateTextElement,
    textElements,
    selectText,
    selectedTextId,
  } = useTextStore();
  const { currentTime, duration } = usePlaybackStore();
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaItems = useMediaStore((s) => s.mediaItems);

  // Auto-caption state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [captionIds, setCaptionIds] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] =
    useState<TranscriptionLanguage>("en");
  const [captionPosition, setCaptionPosition] =
    useState<CaptionPosition>("bottom");

  // Manual text
  const handleAddText = (presetIndex?: number) => {
    const preset = presetIndex !== undefined ? TEXT_PRESETS[presetIndex] : null;
    const textDuration = Math.min(5, duration - currentTime);
    if (textDuration <= 0) {
      toast.error("No time left on timeline");
      return;
    }
    const textElement = {
      ...DEFAULT_TEXT_PROPERTIES,
      ...(preset?.properties || {}),
      content: preset ? preset.name : "Double-click to edit",
      startTime: currentTime,
      endTime: currentTime + textDuration,
    };
    addTextElement(textElement);
    toast.success("Text added to timeline");
  };

  // Auto-captions
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Extracting audio...");

    try {
      const blobs = await extractAudioFromTimeline(tracks, mediaItems);
      if (blobs.length === 0) {
        toast.error("No audio or video clips found on the timeline");
        setIsGenerating(false);
        setStatusMessage("");
        return;
      }

      setStatusMessage("Decoding audio...");
      const { samples } = await decodeAudioToFloat32(blobs[0]);

      setStatusMessage("Loading model...");
      const result = await transcriptionService.transcribe({
        audioData: samples,
        language: selectedLanguage,
        onProgress: (info) => {
          if (typeof info.progress === "number") {
            setProgress(Math.round(info.progress));
            setStatusMessage(
              `Loading model (${Math.round(info.progress)}%)...`
            );
          } else {
            setStatusMessage(info.status || "Loading model...");
          }
        },
      });

      setStatusMessage("Building captions...");
      const chunks = buildCaptionChunks(result.segments);

      if (chunks.length === 0) {
        toast.error("No speech detected in the audio");
        setIsGenerating(false);
        setStatusMessage("");
        return;
      }

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

  const handleTogglePosition = useCallback(
    (pos: CaptionPosition) => {
      if (pos === captionPosition) return;
      setCaptionPosition(pos);
      for (const id of captionIds) {
        updateTextElement(id, { y: POSITION_Y[pos] });
      }
    },
    [captionPosition, captionIds, updateTextElement]
  );

  const handleClearCaptions = useCallback(() => {
    for (const id of captionIds) {
      deleteTextElement(id);
    }
    setCaptionIds([]);
    setStatusMessage("");
    setProgress(0);
    toast.success("Captions cleared");
  }, [captionIds, deleteTextElement]);

  const captionElements = textElements.filter((t) => captionIds.includes(t.id));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-muted/5">
        <div className="flex items-center gap-2 mb-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Text & Captions</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Add text overlays or auto-generate captions
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Auto Captions */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            Auto Captions
          </div>

          <div className="flex gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) =>
                setSelectedLanguage(e.target.value as TranscriptionLanguage)
              }
              disabled={isGenerating}
              className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            <Button
              variant={captionPosition === "top" ? "secondary" : "outline"}
              size="sm"
              className="h-9 px-2"
              onClick={() => handleTogglePosition("top")}
              disabled={isGenerating}
              title="Position captions at top"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant={captionPosition === "bottom" ? "secondary" : "outline"}
              size="sm"
              className="h-9 px-2"
              onClick={() => handleTogglePosition("bottom")}
              disabled={isGenerating}
              title="Position captions at bottom"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            variant="outline"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Generate Captions"}
          </Button>

          {/* Progress */}
          {statusMessage && (
            <div className="space-y-1.5">
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

          {/* Caption list */}
          {captionElements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {captionElements.length} captions
                </span>
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
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {captionElements.map((caption) => (
                  <button
                    key={caption.id}
                    onClick={() => setCurrentTime(caption.startTime)}
                    className="w-full p-1.5 rounded border bg-card text-xs flex items-center gap-2 transition-colors hover:bg-accent/50"
                  >
                    <Play className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-left">
                      {caption.content.substring(0, 25)}
                      {caption.content.length > 25 && "..."}
                    </span>
                    <span className="text-muted-foreground">
                      {caption.startTime.toFixed(1)}s
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Manual Text */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Manual Text
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => handleAddText()}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Basic Text
            </Button>
            {TEXT_PRESETS.map((preset, index) => (
              <Button
                key={preset.name}
                onClick={() => handleAddText(index)}
                variant="outline"
                className="w-full justify-start"
              >
                <Type className="h-4 w-4 mr-2" />
                <span>{preset.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {preset.properties.fontSize}px
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* All Text Layers */}
        {textElements.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Text Layers ({textElements.length})
            </div>
            <div className="space-y-1">
              {textElements.map((text) => (
                <button
                  key={text.id}
                  onClick={() => selectText(text.id)}
                  className={`w-full p-2 rounded border text-xs flex items-center gap-2 transition-colors hover:bg-accent/50 ${
                    selectedTextId === text.id
                      ? "bg-accent border-primary"
                      : "bg-card"
                  }`}
                >
                  <Type className="h-3 w-3 flex-shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {text.content.substring(0, 20)}
                    {text.content.length > 20 && "..."}
                  </span>
                  <span className="text-muted-foreground">
                    {text.startTime.toFixed(1)}s
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {textElements.length === 0 && !isGenerating && !statusMessage && (
          <div className="text-center py-6 text-muted-foreground">
            <Type className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No text layers yet</p>
            <p className="text-xs mt-1">
              Generate captions or add text manually
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
