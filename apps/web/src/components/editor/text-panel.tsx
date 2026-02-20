"use client";

import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { useTextStore, DEFAULT_TEXT_PROPERTIES } from "@/stores/text-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import {
  CAPTION_POSITION_Y,
  generateCaptionsFromTimeline,
  updateCaptionGroupStyle,
} from "@/lib/transcription/caption-pipeline";
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

export function TextPanel() {
  const {
    addTextElement,
    updateTextElement,
    textElements,
    selectText,
    selectedTextId,
    getCaptionGroupIds,
    getCaptionElements,
    deleteCaptionGroup,
    updateCaptionGroup,
  } = useTextStore();
  const { currentTime, duration } = usePlaybackStore();
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaItems = useMediaStore((s) => s.mediaItems);

  // Auto-caption state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeCaptionGroupId, setActiveCaptionGroupId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] =
    useState<TranscriptionLanguage>("en");
  const [captionPosition, setCaptionPosition] =
    useState<CaptionPosition>("bottom");
  const captionGroupIds = getCaptionGroupIds();
  const resolvedGroupId =
    activeCaptionGroupId || captionGroupIds[captionGroupIds.length - 1] || null;

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
    setStatusMessage("Preparing audio...");

    try {
      const result = await generateCaptionsFromTimeline(tracks, mediaItems, {
        addTextElement,
        language: selectedLanguage,
        position: captionPosition,
        cancelPrevious: true,
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

      setActiveCaptionGroupId(result.groupId);
      setStatusMessage("Done!");
      setProgress(100);
      toast.success(`Generated ${result.count} caption(s)`);
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
      if (!resolvedGroupId) return;
      updateCaptionGroup(resolvedGroupId, { y: CAPTION_POSITION_Y[pos] });
    },
    [captionPosition, resolvedGroupId, updateCaptionGroup]
  );

  const handleClearCaptions = useCallback(() => {
    if (!resolvedGroupId) return;
    deleteCaptionGroup(resolvedGroupId);
    setActiveCaptionGroupId(null);
    setStatusMessage("");
    setProgress(0);
    toast.success("Captions cleared");
  }, [resolvedGroupId, deleteCaptionGroup]);

  const handleApplyCaptionStyle = useCallback(() => {
    if (!resolvedGroupId) return;
    updateCaptionGroupStyle(
      getCaptionElements(resolvedGroupId).map((item) => item.id),
      { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },
      updateTextElement
    );
    toast.success("Caption style updated");
  }, [resolvedGroupId, getCaptionElements, updateTextElement]);

  const captionElements = resolvedGroupId ? getCaptionElements(resolvedGroupId) : [];

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
            {captionGroupIds.length > 0 && (
              <select
                value={resolvedGroupId || ""}
                onChange={(e) => setActiveCaptionGroupId(e.target.value || null)}
                className="h-9 px-2 rounded-md border border-input bg-background text-xs"
              >
                {captionGroupIds.map((id) => (
                  <option key={id} value={id}>
                    Group {id.slice(0, 8)}
                  </option>
                ))}
              </select>
            )}
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
                  onClick={handleApplyCaptionStyle}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  Style All
                </Button>
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
