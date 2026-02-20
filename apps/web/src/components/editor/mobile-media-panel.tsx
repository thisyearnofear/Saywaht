"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { pexelsService, PexelsVideo, PexelsImage } from "@/services/pexels-service";

interface MobileMediaPanelProps {
  className?: string;
}

export function MobileMediaPanel({ className }: MobileMediaPanelProps) {
  const [viewMode, setViewMode] = useState<"project" | "library">("project");
  const { mediaItems, addMediaItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Count media by type
  const videoCount = mediaItems.filter((m) => m.type === "video").length;
  const audioCount = mediaItems.filter((m) => m.type === "audio").length;
  const imageCount = mediaItems.filter((m) => m.type === "image").length;

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

  const handleAddPexelsVideo = (video: PexelsVideo) => {
    addHapticFeedback("medium");
    const bestFile =
      video.video_files.find((f) => f.quality === "hd") || video.video_files[0];
    addMediaItem({
      name: `Pexels: ${video.user.name}`,
      type: "video",
      url: bestFile.link,
      thumbnailUrl: video.image,
      duration: video.duration,
      aspectRatio: video.width / video.height,
    });
    toast.success("Added to project");
  };

  const handleAddPexelsImage = (image: PexelsImage) => {
    addHapticFeedback("medium");
    addMediaItem({
      name: `Pexels: ${image.photographer}`,
      type: "image",
      url: image.src.large,
      aspectRatio: image.width / image.height,
    });
    toast.success("Added to project");
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

      <div className="flex items-center gap-2 border-b bg-muted/10 px-3 py-2.5">
        <Button
          onClick={handleFileSelect}
          disabled={isProcessing}
          className="h-10 rounded-lg px-3 text-[11px] font-black uppercase tracking-[0.12em]"
        >
          {isProcessing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          Add Media
        </Button>
        <div className="ml-auto flex items-center rounded-lg bg-muted/40 p-1">
          <Button
            variant={viewMode === "project" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-md px-2.5 text-[10px] font-black uppercase tracking-wider"
            onClick={() => {
              setViewMode("project");
              addHapticFeedback("light");
            }}
          >
            Project
            {videoCount + imageCount + audioCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-4 min-w-[16px] px-1 text-[9px]"
              >
                {videoCount + imageCount + audioCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={viewMode === "library" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-md px-2.5 text-[10px] font-black uppercase tracking-wider"
            onClick={() => {
              setViewMode("library");
              addHapticFeedback("light");
            }}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Library
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {viewMode === "library" ? (
          <PexelsLibrary
            onAddVideo={handleAddPexelsVideo}
            onAddImage={handleAddPexelsImage}
          />
        ) : (
          <ProjectMediaList
            onFileSelect={handleFileSelect}
            onBrowseLibrary={() => setViewMode("library")}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </div>
  );
}

// ── Project Media List ─────────────────────────────────────────────────────
// A lightweight, mobile-optimised view of the current project's media.
// Replaces the full desktop <MediaPanel /> embed to avoid nested cramped tabs.

interface ProjectMediaListProps {
  onFileSelect: () => void;
  onBrowseLibrary: () => void;
  isProcessing: boolean;
}

function ProjectMediaList({ onFileSelect, onBrowseLibrary, isProcessing }: ProjectMediaListProps) {
  const { mediaItems, removeMediaItem } = useMediaStore();
  const { addTrack, addClipToTrack, tracks } = useTimelineStore();

  const videoItems = mediaItems.filter((m) => m.type === "video" || m.type === "image");
  const audioItems = mediaItems.filter((m) => m.type === "audio");

  const handleAddToTimeline = (item: MediaItem) => {
    addHapticFeedback("medium");
    // Find or create a track of the right type
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
    toast.success(`${item.name} added to timeline`);
  };

  const handleRemove = (id: string) => {
    addHapticFeedback("medium");
    removeMediaItem(id);
  };

  if (mediaItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
          <Video className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">No media yet</p>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">
            Upload files or search the library
          </p>
        </div>
        <Button size="sm" onClick={onFileSelect} disabled={isProcessing} className="rounded-full mt-2">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Add Files
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full text-[10px] uppercase tracking-widest"
          onClick={onBrowseLibrary}
        >
          Browse Library
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-muted/5">
      <div className="p-4 space-y-5 pb-10">
        {/* Add More button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFileSelect}
          disabled={isProcessing}
          className="w-full rounded-2xl h-11 border-dashed"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add More Files
        </Button>

        {/* Video / image items */}
        {videoItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Video & Images
            </p>
            <div className="grid grid-cols-2 gap-3">
              {videoItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="relative overflow-hidden rounded-2xl border border-border/30 bg-muted text-left transition-transform active:scale-[0.98]"
                  onClick={() => handleAddToTimeline(item)}
                >
                  <div className="aspect-video">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <Video className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-primary px-2 text-[10px] font-black text-white shadow-lg">
                      <Plus className="mr-0.5 h-3.5 w-3.5" />
                      Add
                    </span>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full bg-black/65 text-white shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      aria-label="Remove"
                    >
                      <Trash2 className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-2 py-1.5 bg-background/90">
                    <p className="text-[10px] font-bold truncate">{item.name}</p>
                    {item.duration ? (
                      <p className="text-[9px] text-muted-foreground">
                        {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, "0")}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio items */}
        {audioItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Audio
            </p>
            <div className="space-y-2">
              {audioItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-green-500/10 border border-green-500/20"
                >
                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <Music className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    {item.duration ? (
                      <p className="text-[10px] text-muted-foreground">
                        {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, "0")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
                      onClick={() => handleAddToTimeline(item)}
                      aria-label="Add to timeline"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                    </button>
                    <button
                      className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Pexels Library ──────────────────────────────────────────────────────────

function PexelsLibrary({
  onAddVideo,
  onAddImage,
}: {
  onAddVideo: (video: PexelsVideo) => void;
  onAddImage: (image: PexelsImage) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"video" | "image">("video");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const searchQuery = query.trim() || "vertical aesthetic";
      const data = await pexelsService.search(searchQuery, type, 1, 15, 'portrait');
      setResults(type === "video" ? data.videos || [] : data.photos || []);
      addHapticFeedback("medium");
    } catch (error) {
      toast.error("Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-muted/5">
      <div className="p-4 border-b border-border/50 space-y-3 bg-background">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-11 rounded-2xl bg-muted/50 border-none pl-4"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 rounded-2xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>
        </form>

        {/* Video / Image toggle */}
        <div className="flex bg-muted/30 p-1 rounded-xl">
          <Button
            variant={type === "video" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest",
              type === "video" && "shadow-sm bg-background"
            )}
            onClick={() => setType("video")}
          >
            Videos
          </Button>
          <Button
            variant={type === "image" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest",
              type === "image" && "shadow-sm bg-background"
            )}
            onClick={() => setType("image")}
          >
            Images
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 gap-3 pb-10">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[9/16] rounded-2xl bg-muted animate-pulse"
              />
            ))
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.id}
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted transition-all active:scale-[0.98] shadow-sm border border-border/10"
                onClick={() =>
                  type === "video" ? onAddVideo(item) : onAddImage(item)
                }
              >
                <img
                  src={type === "video" ? item.image : item.src.large}
                  alt={type === "video" ? item.user.name : item.photographer}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-bold text-white truncate max-w-[80%] uppercase tracking-widest">
                    {type === "video" ? item.user.name : item.photographer}
                  </span>
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Plus className="h-3 w-3 text-white" />
                  </div>
                </div>
                {type === "video" && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[8px] font-bold text-white">
                    {Math.round(item.duration)}s
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                Find the perfect template
              </p>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest px-8">
                Search for high-quality background content to commentate over.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
