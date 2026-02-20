"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Type,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type as TypeIcon,
  Clock,
  ChevronRight,
  X,
  Loader2,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "@/lib/icons";
import { useTextStore } from "@/stores/text-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { cn, formatTime } from "@/lib/utils";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/constants/transcription-constants";
import type { TranscriptionLanguage } from "@/constants/transcription-constants";
import {
  CAPTION_POSITION_Y,
  type CaptionPosition,
  generateCaptionsFromTimeline,
  updateCaptionGroupStyle,
} from "@/lib/transcription/caption-pipeline";

interface MobileTextPanelProps {
  className?: string;
  preferredCaptionGroupId?: string | null;
}

export function MobileTextPanel({ className, preferredCaptionGroupId = null }: MobileTextPanelProps) {
  const {
    textElements,
    addTextElement,
    updateTextElement,
    deleteTextElement,
    getCaptionGroupIds,
    getCaptionElements,
    deleteCaptionGroup,
    updateCaptionGroup,
    selectedTextId,
  } = useTextStore();
  const { duration, currentTime } = usePlaybackStore();
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaItems = useMediaStore((s) => s.mediaItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<TranscriptionLanguage>("en");
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>("bottom");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionStatus, setCaptionStatus] = useState("");
  const [captionProgress, setCaptionProgress] = useState(0);
  const [activeCaptionGroupId, setActiveCaptionGroupId] = useState<string | null>(null);

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
    setEditingId(id);
  };

  const handleDelete = (id: string) => {
    addHapticFeedback("medium");
    deleteTextElement(id);
    setEditingId(null);
  };

  const editingElement = textElements.find((el) => el.id === editingId);
  const swatchColors = ["#ffffff", "#000000", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"];
  const captionGroupIds = getCaptionGroupIds();
  const resolvedCaptionGroupId = useMemo(
    () => activeCaptionGroupId || captionGroupIds[captionGroupIds.length - 1] || null,
    [activeCaptionGroupId, captionGroupIds]
  );
  const captionElements = resolvedCaptionGroupId ? getCaptionElements(resolvedCaptionGroupId) : [];
  const captionGroupMeta = useMemo(() => {
    return captionGroupIds.map((groupId) => {
      const elements = getCaptionElements(groupId);
      const first = elements[0];
      const generatedAt = first?.captionGeneratedAt
        ? new Date(first.captionGeneratedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : null;
      return {
        groupId,
        count: elements.length,
        source: first?.captionSource || "timeline",
        generatedAt,
      };
    });
  }, [captionGroupIds, getCaptionElements]);

  useEffect(() => {
    if (!preferredCaptionGroupId) return;
    setActiveCaptionGroupId(preferredCaptionGroupId);
  }, [preferredCaptionGroupId]);

  useEffect(() => {
    if (!selectedTextId) return;
    setEditingId(selectedTextId);
  }, [selectedTextId]);

  const handleGenerateCaptions = useCallback(async () => {
    setIsGeneratingCaptions(true);
    setCaptionStatus("Preparing audio...");
    setCaptionProgress(0);

    try {
      const result = await generateCaptionsFromTimeline(tracks, mediaItems, {
        addTextElement,
        language: selectedLanguage,
        position: captionPosition,
        cancelPrevious: true,
        onProgress: (info) => {
          if (typeof info.progress === "number") {
            setCaptionProgress(Math.round(info.progress));
          }
          setCaptionStatus(info.status || "Transcribing...");
        },
      });

      setActiveCaptionGroupId(result.groupId);
      setCaptionStatus("Done");
      setCaptionProgress(100);
      toast.success(`Generated ${result.count} captions`);
    } catch (err) {
      setCaptionStatus("");
      toast.error(err instanceof Error ? err.message : "Caption generation failed");
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [tracks, mediaItems, addTextElement, selectedLanguage, captionPosition]);

  const handleClearCaptions = useCallback(() => {
    if (!resolvedCaptionGroupId) return;
    deleteCaptionGroup(resolvedCaptionGroupId);
    setActiveCaptionGroupId(null);
    setCaptionStatus("");
    setCaptionProgress(0);
    toast.success("Captions cleared");
  }, [resolvedCaptionGroupId, deleteCaptionGroup]);

  const handleToggleCaptionPosition = useCallback(
    (position: CaptionPosition) => {
      setCaptionPosition(position);
      if (!resolvedCaptionGroupId) return;
      updateCaptionGroup(resolvedCaptionGroupId, { y: CAPTION_POSITION_Y[position] });
    },
    [resolvedCaptionGroupId, updateCaptionGroup]
  );

  const handleApplyCaptionStyle = useCallback(() => {
    if (!resolvedCaptionGroupId) return;
    const ids = getCaptionElements(resolvedCaptionGroupId).map((item) => item.id);
    updateCaptionGroupStyle(ids, { fontSize: 30, fontWeight: "bold", color: "#FFFFFF" }, updateTextElement);
    toast.success("Caption style updated");
  }, [resolvedCaptionGroupId, getCaptionElements, updateTextElement]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="border-b border-border/50 bg-muted/5 p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Type className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider">Text Overlays</h2>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {textElements.length} TOTAL
          </span>
        </div>

        <div className="flex gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type something..."
            className="h-10 rounded-xl border-none bg-muted/50 pl-3 focus-visible:ring-1 focus-visible:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddText();
              }
            }}
          />
          <Button
            onClick={handleAddText}
            disabled={!newText.trim()}
            className="h-10 w-10 rounded-xl shadow-lg transition-all active:scale-90"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background/60 p-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Captions
            </span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedLanguage}
                onValueChange={(val) => setSelectedLanguage(val as TranscriptionLanguage)}
                disabled={isGeneratingCaptions}
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={captionPosition === "top" ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleToggleCaptionPosition("top")}
              disabled={isGeneratingCaptions}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={captionPosition === "bottom" ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleToggleCaptionPosition("bottom")}
              disabled={isGeneratingCaptions}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            onClick={handleGenerateCaptions}
            disabled={isGeneratingCaptions}
            variant="outline"
            className="h-8 w-full text-[10px] font-bold uppercase tracking-[0.08em]"
          >
            {isGeneratingCaptions ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {captionElements.length > 0 ? "Regenerate Captions" : "Generate Captions"}
          </Button>

          {captionStatus && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{captionStatus}</span>
                {isGeneratingCaptions && <span>{captionProgress}%</span>}
              </div>
              {isGeneratingCaptions && (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${captionProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {captionGroupIds.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={resolvedCaptionGroupId || undefined}
                    onValueChange={(val) => setActiveCaptionGroupId(val || null)}
                  >
                    <SelectTrigger className="h-8 text-[10px]">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {captionGroupIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          Group {id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px]"
                  onClick={handleApplyCaptionStyle}
                >
                  Style
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] text-destructive hover:text-destructive"
                  onClick={handleClearCaptions}
                >
                  Clear
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {captionGroupMeta.map((group) => (
                  <button
                    key={group.groupId}
                    type="button"
                    onClick={() => setActiveCaptionGroupId(group.groupId)}
                    className={cn(
                      "rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] transition-colors",
                      group.groupId === resolvedCaptionGroupId
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                    aria-label={`Caption group ${group.groupId.slice(0, 8)}`}
                  >
                    {group.source === "voiceover" ? "Voiceover" : "Timeline"} • {group.count}
                    {group.generatedAt ? ` • ${group.generatedAt}` : ""}
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground">
                Caption groups show source and generation time.
              </div>
            </div>
          )}
        </div>
      </div>

      {editingElement && (
        <div className="space-y-3 border-b border-border/50 bg-muted/5 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Editing Selected Text
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(editingElement.id)}
                aria-label="Delete text"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setEditingId(null)}
                aria-label="Done editing"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Textarea
            value={editingElement.content}
            onChange={(e) => updateTextElement(editingElement.id, { content: e.target.value })}
            placeholder="Enter your message..."
            className="min-h-[70px] rounded-xl border-none bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/30"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Align
              </label>
              <div className="flex rounded-lg bg-muted/30 p-1">
                {[
                  { val: "left" as const, icon: AlignLeft },
                  { val: "center" as const, icon: AlignCenter },
                  { val: "right" as const, icon: AlignRight },
                ].map(({ val, icon: Icon }) => (
                  <Button
                    key={val}
                    variant={editingElement.textAlign === val ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 flex-1 rounded-md"
                    onClick={() => updateTextElement(editingElement.id, { textAlign: val })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Size {editingElement.fontSize}
              </label>
              <div className="flex h-8 items-center gap-2">
                <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Slider
                  min={12}
                  max={72}
                  step={1}
                  value={[editingElement.fontSize]}
                  onValueChange={([val]) => updateTextElement(editingElement.id, { fontSize: val })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Color
            </label>
            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-2">
              {swatchColors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform active:scale-90",
                    editingElement.color === color ? "scale-105 border-primary shadow-md" : "border-white/10"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    addHapticFeedback("light");
                    updateTextElement(editingElement.id, { color });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              <span>Timing</span>
              <span className="normal-case tracking-normal text-primary">
                {formatTime(editingElement.startTime)} - {formatTime(editingElement.endTime)}
              </span>
            </div>
            <div className="space-y-3 rounded-xl bg-muted/30 p-2.5">
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
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-dashed text-[9px] font-bold"
                  onClick={() => updateTextElement(editingElement.id, { startTime: currentTime })}
                >
                  <Clock className="mr-1.5 h-3 w-3" />
                  Start @ Playhead
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-dashed text-[9px] font-bold"
                  onClick={() => updateTextElement(editingElement.id, { endTime: currentTime })}
                >
                  <Clock className="mr-1.5 h-3 w-3" />
                  End @ Playhead
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2.5 p-3">
          {textElements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
                <Type className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">No text overlays</p>
              <p className="mt-1 px-6 text-[11px] text-muted-foreground/60">
                Add text to create captions, titles or subtitles for your video.
              </p>
              <div className="mt-3 flex w-full gap-2 px-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 text-[10px]"
                  onClick={handleGenerateCaptions}
                  disabled={isGeneratingCaptions}
                >
                  Generate Captions
                </Button>
                <Button
                  size="sm"
                  className="h-8 flex-1 text-[10px]"
                  onClick={() => {
                    addHapticFeedback("light");
                    const id = addTextElement({
                      content: "New text",
                      x: 0.5,
                      y: 0.5,
                      fontSize: 24,
                      fontFamily: "Inter",
                      color: "#ffffff",
                      textAlign: "center",
                      startTime: currentTime,
                      endTime: Math.min(currentTime + 3, duration),
                    });
                    setEditingId(id);
                  }}
                >
                  Add Text
                </Button>
              </div>
            </div>
          ) : (
            textElements.map((element) => (
              <button
                key={element.id}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border p-3 shadow-sm transition-all active:bg-muted/50",
                  editingId === element.id ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"
                )}
                onClick={() => {
                  setEditingId(element.id);
                  addHapticFeedback("light");
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50"
                  style={{
                    backgroundColor: element.color === "#ffffff" ? "#000000" : `${element.color}20`,
                  }}
                >
                  <span style={{ color: element.color }} className="text-sm font-bold">
                    T
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate pr-2 text-xs font-bold">{element.content || "Empty text"}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                    {formatTime(element.startTime)} — {formatTime(element.endTime)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-active:translate-x-1" />
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="bg-muted/10 p-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Tap text to edit inline
        </p>
      </div>
    </div>
  );
}
