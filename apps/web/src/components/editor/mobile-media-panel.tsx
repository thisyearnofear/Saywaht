"use client";

import { useState, useRef, ChangeEvent } from "react";
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
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Area */}
      <div className="flex items-center justify-between border-b bg-muted/10 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Project Media
          </span>
          {mediaCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] bg-primary/10 text-primary border-none">
              {mediaCount}
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-full px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
          onClick={handleBrowseTemplates}
        >
          <Sparkles className="mr-1.5 h-3 w-3" />
          Browse Templates
        </Button>
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

  const videoItems = mediaItems.filter((m) => m.type === "video" || m.type === "image");
  const audioItems = mediaItems.filter((m) => m.type === "audio");

  const handleAddToTimeline = (item: MediaItem) => {
    addHapticFeedback("medium");
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
    
    // Show success message with guidance to close drawer
    toast.success("Added to timeline", {
      description: "Tap outside or swipe down to see your video",
      duration: 2000,
    });
    
    // Notify parent to auto-close drawer after a brief delay
    if (onMediaAdded) {
      setTimeout(() => {
        onMediaAdded();
      }, 1500);
    }
  };

  const handleRemove = (id: string) => {
    addHapticFeedback("medium");
    removeMediaItem(id);
  };

  const handleDeleteButtonClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    addHapticFeedback("light");
    handleRemove(id);
  };

  if (mediaItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
          <Video className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-black uppercase tracking-tight">Empty Media Library</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
            Start by adding your own clips or browsing our professional templates
          </p>
        </div>
        <div className="w-full max-w-[200px] space-y-3">
          <Button 
            variant="default"
            className="w-full rounded-xl h-12 text-[10px] font-black uppercase tracking-widest"
            onClick={onFileSelect} 
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Files
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollable media-panel-scroll bg-muted/5 touch-pan-y">
      <div className="p-4 space-y-6 pb-20">
        {/* Upload Trigger - Larger and more prominent */}
        <button
          onClick={onFileSelect}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 rounded-2xl h-16 border-2 border-dashed border-primary/20 bg-primary/5 text-primary text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          Upload More Media
        </button>

        {/* Video / image items - Larger cards with better spacing */}
        {videoItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground px-1">
              Visuals
            </p>
            <div className="grid grid-cols-1 gap-4">
              {videoItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/30 bg-muted aspect-video shadow-sm transition-all active:scale-[0.98]"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                      <Video className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  
                  {/* Delete button - top right, larger touch target */}
                  <button
                    className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/60 text-white/80 flex items-center justify-center backdrop-blur-sm z-10 active:bg-destructive active:text-white transition-colors"
                    onClick={(e) => handleDeleteButtonClick(e, item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-md px-3 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-[9px] font-bold truncate text-white uppercase">{item.name}</p>
                      {item.duration && (
                        <span className="text-[9px] font-black text-white/70 shrink-0">
                          {Math.floor(item.duration)}s
                        </span>
                      )}
                    </div>
                    <button
                      className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[9px] font-black text-white uppercase tracking-wide active:scale-95 shrink-0 shadow-lg"
                      onClick={(e) => { e.stopPropagation(); handleAddToTimeline(item); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio items */}
        {audioItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground px-1">
              Voice & Audio
            </p>
            <div className="space-y-2">
              {audioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 shadow-sm"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase truncate tracking-tight">{item.name}</p>
                    {item.duration && (
                      <p className="text-[9px] text-muted-foreground font-bold">
                        {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:bg-primary/20"
                      onClick={() => handleAddToTimeline(item)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      className="h-8 w-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center active:bg-destructive/20"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
