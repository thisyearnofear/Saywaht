"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Image as ImageIcon,
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
  // Default to "library" so new users land on discoverable content
  const [activeTab, setActiveTab] = useState<string>("library");
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          addHapticFeedback("light");
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Tab bar — 3 tabs: Library, Project, Upload */}
        <div className="flex-shrink-0 px-3 pt-3 pb-0 border-b bg-muted/10">
          <TabsList className="grid grid-cols-3 w-full h-11 p-1">
            <TabsTrigger
              value="library"
              className="flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-background h-9 px-2"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-bold">Library</span>
            </TabsTrigger>
            <TabsTrigger
              value="project"
              className="flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-background h-9 px-2"
            >
              <Video className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-bold">Project</span>
              {videoCount + imageCount + audioCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 min-w-[16px] px-1 text-[9px] shrink-0"
                >
                  {videoCount + imageCount + audioCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-background h-9 px-2"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-bold">Upload</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Library — Pexels templates */}
        <TabsContent
          value="library"
          className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <PexelsLibrary
            onAddVideo={handleAddPexelsVideo}
            onAddImage={handleAddPexelsImage}
          />
        </TabsContent>

        {/* Project — existing media items (lightweight mobile list, no desktop panel) */}
        <TabsContent
          value="project"
          className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ProjectMediaList onFileSelect={handleFileSelect} isProcessing={isProcessing} />
        </TabsContent>

        {/* Upload — add new files */}
        <TabsContent
          value="upload"
          className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <UploadTab
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
            mediaCounts={{ video: videoCount, audio: audioCount, image: imageCount }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Project Media List ─────────────────────────────────────────────────────
// A lightweight, mobile-optimised view of the current project's media.
// Replaces the full desktop <MediaPanel /> embed to avoid nested cramped tabs.

interface ProjectMediaListProps {
  onFileSelect: () => void;
  isProcessing: boolean;
}

function ProjectMediaList({ onFileSelect, isProcessing }: ProjectMediaListProps) {
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
                <div
                  key={item.id}
                  className="relative rounded-2xl overflow-hidden bg-muted border border-border/30 group"
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
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
                      onClick={() => handleAddToTimeline(item)}
                      aria-label="Add to timeline"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </button>
                    <button
                      className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center shadow-lg"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
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
                </div>
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

// ── Upload Tab ──────────────────────────────────────────────────────────────

interface UploadTabProps {
  onFileSelect: () => void;
  isProcessing: boolean;
  mediaCounts: { video: number; audio: number; image: number };
}

function UploadTab({ onFileSelect, isProcessing, mediaCounts }: UploadTabProps) {
  return (
    <ScrollArea className="flex-1 bg-muted/5">
      <div className="p-6 space-y-6">
        {/* Upload area */}
        <button
          onClick={onFileSelect}
          disabled={isProcessing}
          className={cn(
            "w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all active:scale-[0.98]",
            isProcessing
              ? "bg-muted border-muted-foreground/20 cursor-not-allowed"
              : "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
          )}
        >
          {isProcessing ? (
            <>
              <div className="h-10 w-10 mb-4 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="font-bold text-muted-foreground">Processing Files…</p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <p className="font-bold text-lg">Add Media</p>
              <p className="text-xs text-muted-foreground mt-1 px-10 text-center">
                Upload videos, photos, or audio from your device
              </p>
            </>
          )}
        </button>

        {/* Project asset counts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Project Assets
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-bold border-muted-foreground/20"
            >
              {mediaCounts.video + mediaCounts.audio + mediaCounts.image} TOTAL
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Videos",
                count: mediaCounts.video,
                icon: Video,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                label: "Audio",
                count: mediaCounts.audio,
                icon: Music,
                color: "text-green-500",
                bg: "bg-green-500/10",
              },
              {
                label: "Images",
                count: mediaCounts.image,
                icon: ImageIcon,
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-card border border-border/50 p-4 rounded-2xl flex flex-col items-center text-center shadow-sm"
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center mb-2",
                    item.bg
                  )}
                >
                  <item.icon className={cn("h-5 w-5", item.color)} />
                </div>
                <div className="text-lg font-black tabular-nums">{item.count}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/80">
              Quick Tips
            </h4>
          </div>
          <ul className="space-y-3">
            {[
              "Keep videos under 60 seconds for best social results",
              "Record voiceover while watching your preview",
              "Add text overlays for better accessibility",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-black text-primary">
                  {i + 1}
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                  {tip}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
