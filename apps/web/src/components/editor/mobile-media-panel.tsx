"use client";

import { useState, useRef, useCallback, useMemo, ChangeEvent } from "react";
import { useSmartNavigation } from "@/hooks/use-smart-navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaStore, MediaItem } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { cn } from "@/lib/utils";
import {
  Upload,
  Music,
  Video,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
} from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";

interface MobileMediaPanelProps {
  className?: string;
  onMediaAdded?: () => void;
}

export function MobileMediaPanel({ className, onMediaAdded }: MobileMediaPanelProps) {
  const { navigateToTemplates } = useSmartNavigation();
  const { mediaItems, addMediaItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Count media by type
  const mediaCount = mediaItems.length;

  const handleFileSelect = () => {
    addHapticFeedback("light");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsProcessing(true);
    try {
      const items = await processMediaFiles(files);
      items.forEach((item) => addMediaItem(item));
      toast.success(`Added ${items.length} file(s)`);
      addHapticFeedback("medium");
    } catch (error) {
      console.error("File processing failed:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleBrowseTemplates = () => {
    addHapticFeedback("medium");
    navigateToTemplates();
  };

  return (
    <div className={cn("flex flex-col h-full bg-background no-scrollbar", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Area */}
      <div className="flex items-center justify-between border-b bg-muted/5 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            Project Media
          </span>
          {mediaCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-black bg-primary/10 text-primary border-none">
              {mediaCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-primary"
              onClick={handleFileSelect}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
              onClick={handleBrowseTemplates}
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              Templates
            </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ProjectMediaList
          onFileSelect={handleFileSelect}
          isProcessing={isProcessing}
          onMediaAdded={onMediaAdded}
        />
      </div>
    </div>
  );
}

// ── Project Media List ─────────────────────────────────────────────────────

interface ProjectMediaListProps {
  onFileSelect: () => void;
  isProcessing: boolean;
  onMediaAdded?: () => void;
}

function ProjectMediaList({ onFileSelect, isProcessing, onMediaAdded }: ProjectMediaListProps) {
  const { mediaItems, removeMediaItem } = useMediaStore();
  const { addTrack, addClipToTrack, tracks } = useTimelineStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "visuals" | "audio">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    let items = mediaItems;
    if (searchQuery) {
      items = items.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (activeTab === "visuals") {
      items = items.filter(m => m.type === "video" || m.type === "image");
    } else if (activeTab === "audio") {
      items = items.filter(m => m.type === "audio");
    }
    return items;
  }, [mediaItems, searchQuery, activeTab]);

  const videoItems = mediaItems.filter((m) => m.type === "video" || m.type === "image");
  const audioItems = mediaItems.filter((m) => m.type === "audio");

  const toggleSelect = (id: string) => {
    addHapticFeedback("light");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchAdd = () => {
    if (selectedIds.length === 0) return;
    addHapticFeedback("heavy");
    
    selectedIds.forEach((id) => {
      const item = mediaItems.find((m) => m.id === id);
      if (!item) return;
      
      const trackType = item.type === "audio" ? "audio" : "video";
      let targetTrack = tracks.find((t) => t.type === trackType);
      let trackId = targetTrack?.id;
      if (!trackId) {
        trackId = addTrack(trackType);
      }
      addClipToTrack(trackId, {
        mediaId: item.id,
        name: item.name,
        duration: item.duration || 5,
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
      });
    });

    toast.success(`Added ${selectedIds.length} items to timeline`);
    setSelectedIds([]);
    if (onMediaAdded) onMediaAdded();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    addHapticFeedback("medium");
    removeMediaItem(id);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  if (mediaItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
          <Video className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-black uppercase tracking-tight">Media Library</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
            Upload your first video or image to get started
          </p>
        </div>
        <Button 
          className="w-full max-w-[200px] h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          onClick={onFileSelect} 
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Add Files
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-muted/2">
      {/* Search & Tabs */}
      <div className="px-4 pt-4 pb-2 space-y-3 bg-muted/5 shrink-0">
        <div className="relative">
           <input 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Search items..."
             className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/40 border-none text-[11px] font-medium focus:ring-1 focus:ring-primary/30 outline-none"
           />
           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
              <Upload className="h-4 w-4" /> {/* Replace with Search icon if available, but Upload is okay here as placeholder or use generic */}
           </div>
        </div>

        <div className="flex gap-4 border-b border-border/10">
          {[
            { id: "all", label: "All", count: mediaItems.length },
            { id: "visuals", label: "Visuals", count: videoItems.length },
            { id: "audio", label: "Audio", count: audioItems.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { addHapticFeedback('light'); setActiveTab(tab.id as any); }}
              className={cn(
                  "flex items-center gap-1.5 pb-2 border-b-2 transition-all",
                  activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
              <span className="text-[9px] font-bold opacity-40">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollable pb-24 touch-pan-y">
        {filteredItems.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No matches found</p>
           </div>
        ) : (
          <div className={cn(
            "grid gap-2",
            activeTab === "audio" ? "grid-cols-1" : "grid-cols-2"
          )}>
            {filteredItems.map((item: MediaItem) => {
              const selectedIndex = selectedIds.indexOf(item.id);
              const isSelected = selectedIndex !== -1;
              const isAudio = item.type === "audio";
              
              if (isAudio) {
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]",
                      isSelected ? "border-primary bg-primary/5" : "border-border/50 bg-card"
                    )}
                  >
                    <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                        {isSelected ? <span className="text-[10px] font-black">{selectedIndex + 1}</span> : <Music className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                    </div>
                    <button onClick={(e) => handleDelete(e, item.id)} className="text-muted-foreground/30">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={cn(
                    "relative aspect-[9/16] rounded-2xl border-2 transition-all overflow-hidden bg-muted group active:scale-95 shadow-sm",
                    isSelected ? "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-transparent"
                  )}
                >
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/40">
                      <Video className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Selection Badge */}
                  <div className={cn(
                    "absolute top-2 left-2 h-6 w-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black transition-all",
                    isSelected ? "bg-primary text-white scale-110" : "bg-black/20 text-transparent"
                  )}>
                    {isSelected && (selectedIndex + 1)}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/40 text-white/60 items-center justify-center hidden group-hover:flex backdrop-blur-sm shadow-lg"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                     <p className="text-[9px] font-bold text-white truncate">{item.name}</p>
                     <p className="text-[8px] text-white/60 font-black">{Math.round(item.duration || 0)}s</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-4 inset-x-4 z-20">
             <Button
               onClick={handleBatchAdd}
               className="w-full h-14 rounded-2xl shadow-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-between px-6 transition-all active:scale-95"
             >
                <div className="flex flex-col items-start leading-tight">
                    <span>Add to Timeline</span>
                    <span className="text-[8px] opacity-70">Ordered sequence</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-[12px]">
                   {selectedIds.length}
                </div>
             </Button>
        </div>
      )}
    </div>
  );
}
