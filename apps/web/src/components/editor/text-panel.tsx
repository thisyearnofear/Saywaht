"use client";

import { Button } from "../ui/button";
import { useTextStore, DEFAULT_TEXT_PROPERTIES } from "@/stores/text-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { Type, Plus } from "@/lib/icons";
import { toast } from "sonner";

/**
 * Text Panel - Simple text creation interface
 * 
 * Following Core Principles:
 * - Minimal: Essential features only
 * - Clean: Clear presets and actions
 * - Mobile-first: Touch-optimized buttons
 */

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
      y: 0.85, // Near bottom
    },
  },
] as const;

export function TextPanel() {
  const { addTextElement, textElements } = useTextStore();
  const { currentTime, duration } = usePlaybackStore();

  const handleAddText = (presetIndex?: number) => {
    const preset = presetIndex !== undefined ? TEXT_PRESETS[presetIndex] : null;
    
    // Calculate text duration (5 seconds or remaining time)
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

    const id = addTextElement(textElement);
    toast.success("Text added to timeline");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-muted/5">
        <div className="flex items-center gap-2 mb-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Add Text</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Add text overlays to your video
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Quick Add */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Quick Add
          </div>
          <Button
            onClick={() => handleAddText()}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Basic Text
          </Button>
        </div>

        {/* Presets */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Text Presets
          </div>
          <div className="space-y-2">
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

        {/* Text List */}
        {textElements.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Text Layers ({textElements.length})
            </div>
            <div className="space-y-1">
              {textElements.map((text) => (
                <div
                  key={text.id}
                  className="p-2 rounded border bg-card text-xs flex items-center gap-2"
                >
                  <Type className="h-3 w-3 flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {text.content.substring(0, 20)}
                    {text.content.length > 20 && "..."}
                  </span>
                  <span className="text-muted-foreground">
                    {text.startTime.toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {textElements.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No text layers yet</p>
            <p className="text-xs mt-1">Add text to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
