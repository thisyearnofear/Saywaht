"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Type, 
  Plus, 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Palette,
  Type as TypeIcon
} from "@/lib/icons";
import { useTextStore } from "@/stores/text-store";
import { cn } from "@/lib/utils";
import { addHapticFeedback } from "@/lib/mobile-utils";

interface MobileTextPanelProps {
  className?: string;
}

export function MobileTextPanel({ className }: MobileTextPanelProps) {
  const { textElements, addTextElement, updateTextElement, deleteTextElement } = useTextStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");

  const handleAddText = () => {
    if (!newText.trim()) return;
    
    addHapticFeedback("medium");
    addTextElement({
      content: newText,
      x: 50,
      y: 50,
      fontSize: 24,
      color: "#ffffff",
      backgroundColor: "transparent",
      textAlign: "center",
      startTime: 0,
      endTime: 5,
    });
    setNewText("");
  };

  const handleDelete = (id: string) => {
    addHapticFeedback("light");
    deleteTextElement(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const selectedElement = textElements.find(el => el.id === selectedId);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Type className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Text Overlays</h2>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full ml-auto">
            {textElements.length}
          </span>
        </div>

        {/* Quick Add */}
        <div className="flex gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter text..."
            className="flex-1 h-11"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddText();
              }
            }}
          />
          <Button 
            onClick={handleAddText}
            disabled={!newText.trim()}
            className="h-11 w-11 p-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Text Elements List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {textElements.length === 0 ? (
            <div className="text-center py-8">
              <Type className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No text overlays yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add text to create captions or titles
              </p>
            </div>
          ) : (
            textElements.map((element) => (
              <div
                key={element.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  selectedId === element.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                )}
                onClick={() => {
                  setSelectedId(element.id);
                  addHapticFeedback("light");
                }}
              >
                {/* Text Preview */}
                <div className="flex items-start gap-3">
                  <div 
                    className="flex-1 min-w-0 p-2 rounded bg-black/5"
                    style={{
                      fontSize: Math.min(element.fontSize, 16),
                      color: element.color,
                      textAlign: element.textAlign as "left" | "center" | "right",
                    }}
                  >
                    <p className="truncate">{element.content || "Empty text"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(element.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quick Controls */}
                {selectedId === element.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    {/* Text Content */}
                    <Textarea
                      value={element.content}
                      onChange={(e) =>
                        updateTextElement(element.id, { content: e.target.value })
                      }
                      placeholder="Edit text..."
                      className="min-h-[60px] resize-none"
                    />

                    {/* Alignment */}
                    <div className="flex gap-1">
                      <Button
                        variant={element.textAlign === "left" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() =>
                          updateTextElement(element.id, { textAlign: "left" })
                        }
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={element.textAlign === "center" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() =>
                          updateTextElement(element.id, { textAlign: "center" })
                        }
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={element.textAlign === "right" ? "secondary" : "ghost"}
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() =>
                          updateTextElement(element.id, { textAlign: "right" })
                        }
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Font Size */}
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Size</span>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={element.fontSize}
                        onChange={(e) =>
                          updateTextElement(element.id, {
                            fontSize: parseInt(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-xs w-8 text-right">{element.fontSize}</span>
                    </div>

                    {/* Color */}
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Color</span>
                      <div className="flex gap-1 flex-wrap">
                        {["#ffffff", "#000000", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"].map(
                          (color) => (
                            <button
                              key={color}
                              className={cn(
                                "w-6 h-6 rounded-full border-2",
                                element.color === color
                                  ? "border-primary"
                                  : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() =>
                                updateTextElement(element.id, { color })
                              }
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Start:</span>
                      <Input
                        type="number"
                        value={element.startTime.toFixed(1)}
                        onChange={(e) =>
                          updateTextElement(element.id, {
                            startTime: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 h-8 text-xs"
                        step="0.1"
                      />
                      <span>s</span>
                      <span className="ml-2">End:</span>
                      <Input
                        type="number"
                        value={element.endTime.toFixed(1)}
                        onChange={(e) =>
                          updateTextElement(element.id, {
                            endTime: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 h-8 text-xs"
                        step="0.1"
                      />
                      <span>s</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Help Text */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Tap a text element to edit its properties
        </p>
      </div>
    </div>
  );
}
