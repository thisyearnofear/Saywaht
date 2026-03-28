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
import { trackEditorEvent } from "@/lib/analytics";

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
      trackEditorEvent("media_added", { count: items.length });
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
    <div className={cn("flex flex-col h-full bg-transparent no-scrollbar", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Library
          </span>
          {mediaCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-black bg-primary/20 text-primary border-none">
              {mediaCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-white/5 text-primary"
              onClick={handleFileSelect}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-4 text-[9px] font-black uppercase tracking-widest text-primary bg-white/5 hover:bg-white/10"
              onClick={handleBrowseTemplates}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
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
      <div className="h-full flex flex-col p-6 gap-8">
        <div className="flex flex-col items-center justify-center text-center gap-6 pt-4">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
            <Video className="h-10 w-10 text-white/10" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Media Library</p>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] leading-relaxed max-w-[200px]">
              Upload your first video or image to get started
            </p>
          </div>
          <Button
            className="w-full max-w-[200px] h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20"
            onClick={onFileSelect}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Add Files
          </Button>
        </div>

        {/* Trending Prompt */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Trending Now
            </span>
          </div>

          <button
            onClick={async () => {
              addHapticFeedback("heavy");
              toast.info("Loading trending clip...");
              // In production, this would fetch a real trending CID
              const trendingItem: MediaItem = {
                id: 'trending-clip-1',
                name: 'Farcaster Viral Moment',
                type: 'video',
                url: 'https://persidian.com/api/proxy/video/sample-trending.mp4',
                thumbnailUrl: 'https://persidian.com/api/proxy/image/sample-trending-thumb.jpg',
                aspectRatio: 16/9,
                isGrove: true,
                duration: 15
              };
              useMediaStore.getState().addMediaItem(trendingItem);

              const trackId = tracks.find(t => t.type === 'video')?.id ?? addTrack('video');
              addClipToTrack(trackId, {
                mediaId: trendingItem.id,
                name: trendingItem.name,
                duration: 15,
                startTime: 0,
                trimStart: 0,
                trimEnd: 0
              });

              toast.success("Added trending clip! Ready to record.");
              if (onMediaAdded) onMediaAdded();
            }}
            className="w-full aspect-video rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden group active:scale-[0.98] transition-all"
          >
            <div className="absolute inset-0 bg-[url('https://persidian.com/api/proxy/image/sample-trending-thumb.jpg')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/40 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 fill-primary text-primary ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-4 left-5 right-4 text-left">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Daily Prompt: Viral Moment</p>
              <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-wider">Tap to start coining commentary</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-transparent">
      {/* Search & Tabs */}
      <div className="px-5 pt-5 pb-2 space-y-4 shrink-0">
        <div className="relative">
           <input
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Search items..."
             className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white/[0.05] border border-white/5 text-[11px] font-medium text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/30 outline-none transition-all"
           />
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
              <Upload className="h-4 w-4" />
           </div>
        </div>

        <div className="flex gap-6 border-b border-white/5">
          {[
            { id: "all", label: "All", count: mediaItems.length },
            { id: "visuals", label: "Visuals", count: videoItems.length },
            { id: "audio", label: "Audio", count: audioItems.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { addHapticFeedback('light'); setActiveTab(tab.id as any); }}
              className={cn(
                  "flex items-center gap-2 pb-3 border-b-2 transition-all",
                  activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-white/30"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
              <span className="text-[9px] font-bold opacity-30">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 scrollable pb-24 touch-pan-y no-scrollbar">
        {filteredItems.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No matches found</p>
           </div>
        ) : (
          <div className={cn(
            "grid gap-3",
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
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      isSelected ? "border-primary/50 bg-primary/10" : "border-white/5 bg-white/[0.03]"
                    )}
                  >
                    <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary text-white" : "bg-white/5 text-white/30"
                    )}>
                        {isSelected ? <span className="text-[11px] font-black">{selectedIndex + 1}</span> : <Music className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase truncate text-white/80">{item.name}</p>
                    </div>
                    <button onClick={(e) => handleDelete(e, item.id)} className="text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={cn(
                    "relative aspect-[9/16] rounded-2xl border-2 transition-all overflow-hidden bg-white/[0.03] group active:scale-95 shadow-sm",
                    isSelected ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "border-transparent"
                  )}
                >
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                      <Video className="h-8 w-8 text-white/10" />
                    </div>
                  )}

                  {/* Selection Badge */}
                  <div className={cn(
                    "absolute top-3 left-3 h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black transition-all",
                    isSelected ? "bg-primary text-white scale-110 shadow-lg" : "bg-black/40 text-transparent border-white/10"
                  )}>
                    {isSelected && (selectedIndex + 1)}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-3 right-3 h-7 w-7 rounded-full bg-black/60 text-white/60 items-center justify-center hidden group-hover:flex backdrop-blur-md shadow-lg border border-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                     <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">{item.name}</p>
                     <p className="text-[9px] text-white/40 font-bold mt-0.5">{Math.round(item.duration || 0)}s</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-6 inset-x-6 z-20">
             <Button
               onClick={handleBatchAdd}
               className="w-full h-14 rounded-2xl shadow-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-between px-6 transition-all active:scale-95 border-none"
             >
                <div className="flex flex-col items-start leading-tight">
                    <span>Add to Timeline</span>
                    <span className="text-[9px] opacity-70 font-bold">Ordered sequence</span>
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-[14px] font-black">
                   {selectedIds.length}
                </div>
             </Button>
        </div>
      )}
    </div>
  );
}
