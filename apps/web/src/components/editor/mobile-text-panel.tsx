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
import type { CaptionPosition } from "@/lib/transcription/caption-pipeline";
import { useCaptionsFlow } from "@/hooks/use-captions-flow";

const TEXT_STYLE_PRESETS = [
  { id: 'vhs', name: 'VHS', color: '#FFFFFF', backgroundColor: '#00000080', fontSize: 24, fontWeight: 'bold', fontFamily: 'Courier New', textShadow: '2px 2px #FF00FF' },
  { id: 'neon', name: 'Neon', color: '#00FFFF', fontSize: 28, fontWeight: 'black', fontFamily: 'Inter', textShadow: '0 0 10px #00FFFF' },
  { id: 'cinema', name: 'Cinema', color: '#FDE047', fontSize: 22, fontWeight: 'medium', fontFamily: 'Georgia', textShadow: '1px 1px 2px #000000' },
  { id: 'modern', name: 'Modern', color: '#FFFFFF', fontSize: 32, fontWeight: 'black', fontFamily: 'Inter', textAlign: 'center' },
  { id: 'bold', name: 'Bold', color: '#EF4444', fontSize: 36, fontWeight: 'black', fontFamily: 'Inter' },
];

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
  const [viewMode, setViewMode] = useState<"list" | "tools">("tools");
  const [isStyling, setIsStyling] = useState(false);

  const handleAddText = () => {
    if (!newText.trim()) return;

    addHapticFeedback("medium");
    const effectiveDuration = duration > 0 ? duration : 10;
    const id = addTextElement({
      content: newText,
      x: 0.5,
      y: 0.5,
      fontSize: 32,
      fontFamily: "Inter",
      color: "#ffffff",
      textAlign: "center",
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, effectiveDuration),
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
  const {
    selectedLanguage,
    setSelectedLanguage,
    captionPosition,
    isGeneratingCaptions,
    captionStatus,
    captionProgress,
    activeCaptionGroupId,
    setActiveCaptionGroupId,
    captionGroupIds,
    captionGroupMeta,
    resolvedCaptionGroupId,
    captionElements,
    hasCaptions,
    captionReadinessLabel,
    generateCaptions,
    clearResolvedCaptionGroup,
    toggleCaptionPosition,
    applyStyleToResolvedGroup,
  } = useCaptionsFlow({
    tracks,
    mediaItems,
    addTextElement,
    updateTextElement,
    getCaptionGroupIds,
    getCaptionElements,
    deleteCaptionGroup,
    updateCaptionGroup,
    preferredCaptionGroupId,
  });

  useEffect(() => {
    if (!selectedTextId) return;
    setEditingId(selectedTextId);
  }, [selectedTextId]);

  const handleGenerateCaptions = useCallback(async () => {
    try {
      const result = await generateCaptions();

      setActiveCaptionGroupId(result.groupId);
      toast.success(`Generated ${result.count} captions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Caption generation failed");
    }
  }, [generateCaptions, setActiveCaptionGroupId]);

  const handleClearCaptions = useCallback(() => {
    clearResolvedCaptionGroup();
    toast.success("Captions cleared");
  }, [clearResolvedCaptionGroup]);

  const handleApplyPreset = useCallback((preset: typeof TEXT_STYLE_PRESETS[0]) => {
    if (!resolvedCaptionGroupId) return;
    addHapticFeedback('medium');
    const updates = { 
        fontSize: preset.fontSize, 
        color: preset.color, 
        fontWeight: preset.fontWeight as any,
        fontFamily: preset.fontFamily,
        textAlign: preset.textAlign as any
    };
    const applied = applyStyleToResolvedGroup(updates);
    if (!applied) return;
    toast.success(`Applied ${preset.name} style to captions`);
  }, [resolvedCaptionGroupId, applyStyleToResolvedGroup]);

  const handleSmartStyle = useCallback(async () => {
    if (!resolvedCaptionGroupId) return;
    const elements = getCaptionElements(resolvedCaptionGroupId);
    if (elements.length === 0) return;

    setIsStyling(true);
    addHapticFeedback("heavy");
    
    try {
      const fullText = elements.map(el => el.content).join(" ");
      const response = await fetch("/api/ai/smart-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) throw new Error("Failed to get smart style");
      
      const { style } = await response.json();
      const applied = applyStyleToResolvedGroup(style);
      if (!applied) {
        throw new Error("No active caption group");
      }
      toast.success("AI applied a smart style based on your content!");
    } catch (error) {
      console.error("Smart styling failed:", error);
      toast.error("Could not generate smart style");
    } finally {
      setIsStyling(false);
    }
  }, [resolvedCaptionGroupId, getCaptionElements, applyStyleToResolvedGroup]);


  return (
    <div className={cn("flex flex-col h-full bg-transparent", className)}>
      <div className="border-b border-white/5 bg-white/[0.02] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
              <Type className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Text</h2>
          </div>
          
          <div className="flex items-center bg-white/[0.05] p-1 rounded-full border border-white/5">
            <button
               onClick={() => { addHapticFeedback('light'); setViewMode('tools'); }}
               className={cn(
                 "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all",
                 viewMode === 'tools' ? "bg-white text-black shadow-lg" : "text-white/40"
               )}
            >
              Tools
            </button>
            <button
               onClick={() => { addHapticFeedback('light'); setViewMode('list'); }}
               className={cn(
                 "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all",
                 viewMode === 'list' ? "bg-white text-black shadow-lg" : "text-white/40"
               )}
            >
              List
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type something..."
            className="h-11 rounded-2xl border-none bg-white/[0.05] pl-4 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddText();
              }
            }}
          />
          <Button
            onClick={handleAddText}
            disabled={!newText.trim()}
            className="h-11 w-11 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-90"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Auto Captions
            </span>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
            {captionReadinessLabel}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedLanguage}
                onValueChange={(val) => setSelectedLanguage(val as TranscriptionLanguage)}
                disabled={isGeneratingCaptions}
              >
                <SelectTrigger className="h-9 text-[11px] bg-white/5 border-none rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10">
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
              className={cn("h-9 w-9 rounded-xl border-white/5 bg-white/5", captionPosition === "top" && "bg-primary text-white border-none")}
              onClick={() => toggleCaptionPosition("top")}
              disabled={isGeneratingCaptions}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant={captionPosition === "bottom" ? "secondary" : "outline"}
              size="icon"
              className={cn("h-9 w-9 rounded-xl border-white/5 bg-white/5", captionPosition === "bottom" && "bg-primary text-white border-none")}
              onClick={() => toggleCaptionPosition("bottom")}
              disabled={isGeneratingCaptions}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleGenerateCaptions}
            disabled={isGeneratingCaptions}
            className="h-10 w-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 rounded-xl"
          >
            {isGeneratingCaptions ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {hasCaptions ? "Regenerate" : "Generate"}
          </Button>

          {captionStatus && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/30">
                <span>{captionStatus}</span>
                {isGeneratingCaptions && <span>{captionProgress}%</span>}
              </div>
              {isGeneratingCaptions && (
                <div className="h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${captionProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {captionGroupIds.length > 0 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={resolvedCaptionGroupId || undefined}
                    onValueChange={(val) => setActiveCaptionGroupId(val || null)}
                  >
                    <SelectTrigger className="h-9 text-[10px] bg-white/5 border-none rounded-xl">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/10">
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
                  className="h-9 px-4 text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 rounded-xl"
                  onClick={handleClearCaptions}
                >
                  Clear
                </Button>
              </div>

              {/* Styles Ribbon */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollable no-scrollbar">
                 <button
                    onClick={handleSmartStyle}
                    disabled={isStyling}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-xl border border-primary/20 bg-primary/10 text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95 shadow-sm flex items-center gap-2 text-primary",
                      isStyling && "animate-pulse"
                    )}
                 >
                    {isStyling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Smart AI Style
                 </button>
                 {TEXT_STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="flex-shrink-0 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 shadow-sm"
                      style={{ color: preset.color }}
                    >
                      {preset.name}
                    </button>
                 ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {captionGroupMeta.map((group) => (
                  <button
                    key={group.groupId}
                    type="button"
                    onClick={() => setActiveCaptionGroupId(group.groupId)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all",
                      group.groupId === resolvedCaptionGroupId
                        ? "border-primary/50 bg-primary/20 text-primary shadow-lg"
                        : "border-white/5 bg-white/5 text-white/30"
                    )}
                    aria-label={`Caption group ${group.groupId.slice(0, 8)}`}
                  >
                    {group.source === "voiceover" ? "Voice" : "Video"} • {group.count}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingElement && viewMode === "tools" && (
        <div className="space-y-4 border-b border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Style Editor
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
                onClick={() => handleDelete(editingElement.id)}
                aria-label="Delete text"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-white/5"
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
            placeholder="Enter message..."
            className="min-h-[80px] rounded-2xl border-none bg-white/[0.05] p-4 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all resize-none"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                Alignment
              </label>
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/5">
                {[
                  { val: "left" as const, icon: AlignLeft },
                  { val: "center" as const, icon: AlignCenter },
                  { val: "right" as const, icon: AlignRight },
                ].map(({ val, icon: Icon }) => (
                  <Button
                    key={val}
                    variant={editingElement.textAlign === val ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("h-9 flex-1 rounded-lg transition-all", editingElement.textAlign === val ? "bg-white text-black shadow-lg" : "text-white/40")}
                    onClick={() => updateTextElement(editingElement.id, { textAlign: val })}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                Size {editingElement.fontSize}
              </label>
              <div className="flex h-11 items-center gap-3 px-1">
                <TypeIcon className="h-4 w-4 shrink-0 text-white/20" />
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

          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
              Color Palette
            </label>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3 border border-white/5 overflow-x-auto no-scrollbar gap-3">
              {swatchColors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all active:scale-90 flex-shrink-0",
                    editingElement.color === color ? "scale-110 border-white shadow-[0_0_10px_white]" : "border-white/10"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
              <span>Timing</span>
              <span className="text-primary">
                {formatTime(editingElement.startTime)} — {formatTime(editingElement.endTime)}
              </span>
            </div>
            <div className="space-y-5 rounded-2xl bg-white/5 p-4 border border-white/5">
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
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-5">
          {viewMode === "list" && captionElements.length > 0 ? (
            <div className="space-y-3">
               {captionElements.map((element) => (
                  <div 
                    key={element.id}
                    className="flex flex-col gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.03] active:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-primary tabular-nums uppercase tracking-widest">
                         {formatTime(element.startTime)}
                       </span>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-8 w-8 rounded-full text-white/20 hover:text-red-400"
                         onClick={() => deleteTextElement(element.id)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                    <Textarea
                      value={element.content}
                      onChange={(e) => updateTextElement(element.id, { content: e.target.value })}
                      onFocus={() => {
                        addHapticFeedback('light');
                        usePlaybackStore.getState().seek(element.startTime);
                      }}
                      className="min-h-[50px] text-xs border-none bg-white/5 p-3 rounded-xl resize-none text-white/80"
                    />
                  </div>
               ))}
            </div>
          ) : textElements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.03] border border-white/5">
                <Type className="h-7 w-7 text-white/10" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white/80">No text yet</p>
              <p className="mt-2 px-8 text-[10px] text-white/30 uppercase tracking-widest leading-relaxed">
                Add manual text or generate captions from your audio.
              </p>
            </div>
          ) : (
            textElements
              .filter(el => viewMode === 'list' || !el.isAutoCaption)
              .map((element) => (
              <button
                key={element.id}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-2xl border p-4 transition-all active:scale-[0.98]",
                  editingId === element.id ? "border-primary/30 bg-primary/10 shadow-lg shadow-primary/10" : "border-white/5 bg-white/[0.03]"
                )}
                onClick={() => {
                  setEditingId(element.id);
                  addHapticFeedback("light");
                  usePlaybackStore.getState().seek(element.startTime);
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
                  style={{
                    backgroundColor: element.color === "#ffffff" ? "#000000" : `${element.color}20`,
                  }}
                >
                  <span style={{ color: element.color }} className="text-[14px] font-black">
                    T
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate pr-4 text-[11px] font-black uppercase text-white/80">{element.content || "Untitled"}</p>
                  <p className="mt-1 text-[9px] font-bold text-white/30 tracking-widest">
                    {formatTime(element.startTime)} — {formatTime(element.endTime)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-white/10 transition-all group-active:translate-x-1" />
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
