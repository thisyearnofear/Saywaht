"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  Type, 
  Plus, 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Palette,
  Type as TypeIcon,
  Clock,
  Check,
  ChevronRight
} from "@/lib/icons";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { useTextStore } from "@/stores/text-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { formatTime } from "@/lib/utils";

interface MobileTextPanelProps {
  className?: string;
}

export function MobileTextPanel({ className }: MobileTextPanelProps) {
  const { textElements, addTextElement, updateTextElement, deleteTextElement } = useTextStore();
  const { duration, currentTime } = usePlaybackStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");

  const handleAddText = () => {
    if (!newText.trim()) return;
    
    addHapticFeedback("medium");
    const id = addTextElement({
      content: newText,
      x: 0.5,
      y: 0.5,
      fontSize: 24,
      fontFamily: "Inter",
      color: "#ffffff",
      textAlign: "center",
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, duration),
    });
    setNewText("");
    // Automatically open editor for the new element
    setEditingId(id);
  };

  const handleDelete = (id: string) => {
    addHapticFeedback("medium");
    deleteTextElement(id);
    setEditingId(null);
  };

  const editingElement = textElements.find(el => el.id === editingId);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header with Quick Add */}
      <div className="p-4 border-b border-border/50 bg-muted/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Type className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Text Overlays</h2>
          <span className="ml-auto text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {textElements.length} TOTAL
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Type something..."
              className="h-12 pl-4 pr-10 rounded-2xl bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddText();
                }
              }}
            />
          </div>
          <Button 
            onClick={handleAddText}
            disabled={!newText.trim()}
            className="h-12 w-12 rounded-2xl shadow-lg transition-all active:scale-90"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Text Elements List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {textElements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Type className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No text overlays</p>
              <p className="text-xs text-muted-foreground/60 mt-1 px-8">
                Add text to create captions, titles or subtitles for your video.
              </p>
            </div>
          ) : (
            textElements.map((element) => (
              <button
                key={element.id}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm active:bg-muted/50 transition-all group"
                onClick={() => {
                  setEditingId(element.id);
                  addHapticFeedback("light");
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-border/50"
                  style={{ backgroundColor: element.color === "#ffffff" ? "#000000" : element.color + "20" }}
                >
                  <span style={{ color: element.color }} className="font-bold text-lg">T</span>
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-sm truncate pr-2">
                    {element.content || "Empty text"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {formatTime(element.startTime)} — {formatTime(element.endTime)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-active:translate-x-1 transition-transform" />
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dedicated Editor Drawer */}
      <Drawer open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DrawerContent className="max-h-[85vh] p-0">
          {editingElement && (
            <div className="flex flex-col h-full">
              <DrawerHeader className="border-b border-border/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <DrawerTitle className="text-lg font-bold">Edit Text</DrawerTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={() => handleDelete(editingElement.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </DrawerHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-8 pb-10">
                  {/* Text Content */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Content</label>
                    <Textarea
                      value={editingElement.content}
                      onChange={(e) =>
                        updateTextElement(editingElement.id, { content: e.target.value })
                      }
                      placeholder="Enter your message..."
                      className="min-h-[100px] text-lg rounded-2xl bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                  </div>

                  {/* Styling Options */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Alignment */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alignment</label>
                      <div className="flex bg-muted/30 p-1 rounded-xl">
                        {[
                          { val: "left" as const, icon: AlignLeft },
                          { val: "center" as const, icon: AlignCenter },
                          { val: "right" as const, icon: AlignRight }
                        ].map(({ val, icon: Icon }) => (
                          <Button
                            key={val}
                            variant={editingElement.textAlign === val ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "flex-1 h-10 rounded-lg",
                              editingElement.textAlign === val && "shadow-sm bg-background"
                            )}
                            onClick={() =>
                              updateTextElement(editingElement.id, { textAlign: val })
                            }
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Size: {editingElement.fontSize}px</label>
                      <div className="flex items-center h-10 gap-3">
                        <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Slider
                          min={12}
                          max={72}
                          step={1}
                          value={[editingElement.fontSize]}
                          onValueChange={([val]) =>
                            updateTextElement(editingElement.id, { fontSize: val })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color</label>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{editingElement.color}</span>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 p-3 rounded-2xl">
                      {["#ffffff", "#000000", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"].map(
                        (color) => (
                          <button
                            key={color}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-transform active:scale-90",
                              editingElement.color === color
                                ? "border-primary scale-110 shadow-md"
                                : "border-white/10"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              addHapticFeedback("light");
                              updateTextElement(editingElement.id, { color });
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Timing - Pro Style */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timing (Duration)</label>
                    <div className="bg-muted/30 p-4 rounded-2xl space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">START</span>
                          <span className="text-primary">{formatTime(editingElement.startTime)}</span>
                        </div>
                        <Slider
                          min={0}
                          max={duration}
                          step={0.1}
                          value={[editingElement.startTime]}
                          onValueChange={([val]) => {
                            const newStart = Math.min(val, editingElement.endTime - 0.1);
                            updateTextElement(editingElement.id, { startTime: newStart });
                          }}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">END</span>
                          <span className="text-primary">{formatTime(editingElement.endTime)}</span>
                        </div>
                        <Slider
                          min={0}
                          max={duration}
                          step={0.1}
                          value={[editingElement.endTime]}
                          onValueChange={([val]) => {
                            const newEnd = Math.max(val, editingElement.startTime + 0.1);
                            updateTextElement(editingElement.id, { endTime: newEnd });
                          }}
                        />
                      </div>
                      
                      {/* Current Time Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 text-[10px] font-bold rounded-xl border-dashed"
                          onClick={() => updateTextElement(editingElement.id, { startTime: currentTime })}
                        >
                          <Clock className="h-3 w-3 mr-2" />
                          START AT PLAYHEAD
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 text-[10px] font-bold rounded-xl border-dashed"
                          onClick={() => updateTextElement(editingElement.id, { endTime: currentTime })}
                        >
                          <Clock className="h-3 w-3 mr-2" />
                          END AT PLAYHEAD
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DrawerFooter className="px-6 py-6 border-t border-border/50">
                <DrawerClose asChild>
                  <Button className="h-14 w-full rounded-2xl text-base font-bold shadow-xl">
                    <Check className="h-5 w-5 mr-2" />
                    Done Editing
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Footer Instructions */}
      <div className="p-3 bg-muted/10 text-center">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          Tap elements to customize
        </p>
      </div>
    </div>
  );
}
