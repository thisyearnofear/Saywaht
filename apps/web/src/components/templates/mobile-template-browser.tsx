"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/stores/template-store";
import { Template } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverVideoPreview } from "./hover-video-preview";
import { ChevronRight, Loader2, Sparkles, Video as VideoIcon, Search } from "lucide-react";
import { resolveIpfsUrl, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { pexelsService, PexelsVideo } from "@/services/pexels-service";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { Input } from "@/components/ui/input";
import { useVideoPreloader } from "@/hooks/use-video-preloader";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useCanvasStore, canvasPresets } from "@/stores/canvas-store";
import { useSceneStore } from "@/stores/scene-store";
import { addHapticFeedback } from "@/lib/mobile-utils";

// Helper to construct Pexels image URL
const pexelsImg = (id: string | number) => 
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

const STOCK_CATEGORIES = [
  { 
    name: "Animals", 
    query: "animals vertical", 
    images: [
      pexelsImg(247502),
      pexelsImg(1108099),
      pexelsImg(2295744),
      pexelsImg(145939)
    ]
  },
  { 
    name: "AI", 
    query: "artificial intelligence vertical", 
    images: [
      pexelsImg(8386440),
      pexelsImg(8386434),
      pexelsImg(2599244)
    ]
  },
  { 
    name: "Nature", 
    query: "nature vertical", 
    images: [
      pexelsImg(3225517),
      pexelsImg(3408744),
      pexelsImg(2662116),
      pexelsImg(1761279)
    ]
  },
  { 
    name: "Drone", 
    query: "drone vertical", 
    images: [
      pexelsImg(1906658),
      pexelsImg(1680140),
      pexelsImg(2559941),
      pexelsImg(691668)
    ]
  },
  { 
    name: "Meme", 
    query: "funny animals vertical", 
    images: [
      pexelsImg(1741205),
      pexelsImg(2061057),
      pexelsImg(1472999),
      pexelsImg(3687770)
    ]
  },
  { 
    name: "Mood", 
    query: "cinematic mood vertical", 
    images: [
      pexelsImg(1252890),
      pexelsImg(2387793),
      pexelsImg(1666021),
      pexelsImg(2662116)
    ]
  },
];

function RotatingCategoryCard({ 
  category, 
  index, 
  onClick 
}: { 
  category: typeof STOCK_CATEGORIES[0]; 
  index: number; 
  onClick: () => void 
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Stagger the rotation slightly so they don't all flip at once
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % category.images.length);
    }, 4000 + (index * 500)); 

    return () => clearInterval(interval);
  }, [category.images.length, index]);

  const currentImage = category.images[currentImageIndex];
  const hasError = failedImages[currentImage];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => {
        onClick();
        addHapticFeedback("medium");
      }}
      className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/5 active:scale-95 transition-transform"
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
              <VideoIcon className="h-7 w-7 text-white/70" />
            </div>
          ) : (
            <img
              src={currentImage}
              alt={category.name}
              className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-500"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, [currentImage]: true }))
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
        <span className="text-sm font-black italic uppercase tracking-widest text-white drop-shadow-lg">
          {category.name}
        </span>
      </div>
    </motion.button>
  );
}

export function MobileTemplateBrowser() {
  const { categories, isLoading, selectTemplate, applySelectedTemplate, clearSelectedTemplate } = useTemplateStore();
  const [mainTab, setMainTab] = useState<"packs" | "stock">("stock");
  
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [isApplying, setIsApplying] = useState<string | null>(null);

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // Pexels state
  const [searchQuery, setSearchQuery] = useState("");
  const [pexelsResults, setPexelsResults] = useState<PexelsVideo[]>([]);
  const [isPexelsLoading, setIsPexelsLoading] = useState(false);

  const router = useRouter();

  const allTemplates = useMemo(() => {
    return categories.flatMap(c => c.templates.map(t => ({ ...t, categoryName: c.name })));
  }, [categories]);

  // PREPERFORMANCE: Preload the first few template videos
  const templateUrls = useMemo(() =>
    allTemplates.map(t => resolveIpfsUrl(t.thumbnailUrl || "")),
    [allTemplates]);

  const stockUrls = useMemo(() =>
    pexelsResults.map(v => v.video_files.find(f => f.quality === 'sd')?.link || v.video_files[0].link),
    [pexelsResults]);

  useVideoPreloader(mainTab === 'packs' ? templateUrls : stockUrls);

  const filteredTemplates = useMemo(() => {
    const templates = activeCategoryId
      ? categories.find(c => c.id === activeCategoryId)?.templates.map(t => ({ ...t, categoryName: categories.find(c => c.id === activeCategoryId)?.name })) || []
      : allTemplates;

    // On mobile, only show portrait or square templates to avoid massive black spacing
    return templates.filter(t => t.aspectRatio !== 'landscape');
  }, [activeCategoryId, allTemplates, categories]);

  // Handle Pexels search
  useEffect(() => {
    if (mainTab !== 'stock') return;

    const timer = setTimeout(async () => {
      // Don't auto-fetch if we are in Discovery mode (empty search)
      if (!searchQuery) {
        setIsPexelsLoading(false);
        setPexelsResults([]);
        return;
      }

      setIsPexelsLoading(true);
      try {
        const response = await pexelsService.search(searchQuery, 'video', 1, 12, 'portrait');
        setPexelsResults(response.videos || []);
      } catch (err) {
        console.error("Pexels load failed:", err);
      } finally {
        setIsPexelsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, mainTab]);

  const handleUsePexelsVideo = async (video: PexelsVideo) => {
    // 1. Validation
    const bestFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
    
    if (!bestFile || !bestFile.link) {
      toast.error("Video format not supported");
      return;
    }

    const { addMediaItem, clearAllMedia } = useMediaStore.getState();
    const { createNewProject } = useProjectStore.getState();
    const { addTrack, addClipToTrack, setTracks } = useTimelineStore.getState();
    const { setCurrentTime, pause } = usePlaybackStore.getState();

    const mediaId = `pexels-${video.id}`;
    setIsApplying(mediaId); // Show loading state

    const loadingToast = toast.loading("Preparing video...", {
      description: "Setting up your project"
    });

    try {
      // Stream directly from Pexels CDN - no download needed
      const streamUrl = bestFile.link;

      // Initialize project
      createNewProject(`Pexels: ${video.user.name}`);
      clearAllMedia();
      setTracks([]);

      // Add the media item with streaming URL
      addMediaItem({
        id: mediaId,
        name: `Stock: ${video.user.name}`,
        type: "video",
        url: streamUrl, // Stream from Pexels CDN
        thumbnailUrl: video.image,
        duration: Math.min(video.duration, 10),
        aspectRatio: video.width / video.height,
        isLocal: false, // Streaming from CDN
      });

      // Create track and clip
      const trackId = addTrack("video");
      addClipToTrack(trackId, {
        mediaId: mediaId,
        name: `Stock: ${video.user.name}`,
        duration: Math.min(video.duration, 10),
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
      });

      // Canvas and Scene initialization
      const videoAspectRatio = video.width / video.height;
      const { setCanvasPreset } = useCanvasStore.getState();
      const preset = canvasPresets.reduce((prev, curr) => {
        return (Math.abs(curr.aspectRatio - videoAspectRatio) < Math.abs(prev.aspectRatio - videoAspectRatio) ? curr : prev);
      });
      setCanvasPreset(preset);

      const { initializeScenes } = useSceneStore.getState();
      const updatedProject = useProjectStore.getState().activeProject;
      if (updatedProject) {
        initializeScenes(updatedProject.scenes || [], updatedProject.currentSceneId);
      }

      setCurrentTime(0);
      // Sync duration so playback works immediately in the editor
      const totalDuration = useTimelineStore.getState().getTotalDuration();
      if (totalDuration > 0) {
        usePlaybackStore.getState().setDuration(totalDuration);
      }

      toast.dismiss(loadingToast);
      toast.success("Ready to edit!");
      router.push("/editor");

    } catch (err) {
      console.error("Failed to load Pexels video:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to load clip. Please check your connection.");
    } finally {
      setIsApplying(null);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    setIsApplying(template.id);
    try {
      await selectTemplate(template.id);
      const success = await applySelectedTemplate();
      if (success) {
        clearSelectedTemplate();
        router.push("/editor");
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
      toast.error("Failed to load template");
    } finally {
      setIsApplying(null);
    }
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Loading Creative Library
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Dual Main Tabs - PRECONFIGURE vs STOCK */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-white/5 pt-4">
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/5 h-10 w-10 shrink-0"
              onClick={() => router.back()}
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>

            <div className="flex-1 grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                onClick={() => {
                  setMainTab("packs");
                  addHapticFeedback("light");
                }}
                className={cn(
                  "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mainTab === "packs" ? "bg-white text-black shadow-lg" : "text-muted-foreground"
                )}
              >
                Packs
              </button>
              <button
                onClick={() => {
                  setMainTab("stock");
                  addHapticFeedback("light");
                }}
                className={cn(
                  "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mainTab === "stock" ? "bg-white text-black shadow-lg" : "text-muted-foreground"
                )}
              >
                Global
              </button>
            </div>
          </div>

          {/* Sub-navigation based on main tab */}
          <AnimatePresence mode="wait">
            {mainTab === "packs" ? (
              <motion.div
                key="pack-filters"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex gap-2 overflow-x-auto hide-scrollbar"
              >
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategoryId(category.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border",
                      activeCategoryId === category.id
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-white/5 border-transparent text-muted-foreground"
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="stock-search"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3"
              >
                {searchQuery ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        addHapticFeedback("light");
                      }}
                      className="h-10 w-10 shrink-0 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-white"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        className="bg-white/5 border-white/10 rounded-xl pl-10 h-10 text-xs text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search stock..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
                      Discovery
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Pick a mood to start exploring
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-4 py-6 pb-32">
        {mainTab === 'packs' ? (
          <div className="space-y-10">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                >
                  {/* Template Card */}
                  <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all active:scale-[0.98]">
                    {/* Visual Preview Section */}
                    <div className="aspect-[4/5] relative overflow-hidden bg-black/40">
                      <HoverVideoPreview
                        videoSrc={resolveIpfsUrl(template.thumbnailUrl || "")}
                        alt={template.name}
                        className="w-full h-full"
                      />

                      {/* Badges Overlay */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <Badge className="bg-black/60 backdrop-blur-xl border-white/10 text-[9px] font-black uppercase tracking-widest py-1 px-2.5">
                          {template.categoryName || "Premium"}
                        </Badge>
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="p-6 pt-5 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                          {template.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          size="lg"
                          className="flex-1 h-14 rounded-xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-xs"
                          onClick={() => handleUseTemplate(template)}
                          disabled={isApplying !== null}
                        >
                          {isApplying === template.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : "Use template"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState onReset={() => setActiveCategoryId("")} />
            )}
          </div>
        ) : (
          /* STOCK LIBRARY VIEW */
          <div className="space-y-6">
            {!searchQuery ? (
              /* DISCOVERY GRID */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-4"
              >
                {STOCK_CATEGORIES.map((cat, i) => (
                  <RotatingCategoryCard
                    key={cat.name}
                    category={cat}
                    index={i}
                    onClick={() => setSearchQuery(cat.query)}
                  />
                ))}
              </motion.div>
            ) : (
              /* SEARCH RESULTS GRID */
              <div className="grid grid-cols-2 gap-3">
                {pexelsResults.map((video) => (
                  <div
                    key={video.id}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-white/5 border border-white/5 group"
                    onClick={() => handleUsePexelsVideo(video)}
                  >
                    <HoverVideoPreview
                      videoSrc={video.video_files.find(f => f.quality === 'sd')?.link || video.video_files[0].link}
                      alt={video.user.name}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] font-bold text-white uppercase tracking-tighter truncate">
                        {video.user.name}
                      </p>
                    </div>
                  </div>
                ))}
                {isPexelsLoading && (
                  <div className="col-span-2 flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {pexelsResults.length === 0 && !isPexelsLoading && (
                  <div className="col-span-2 py-20 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      No results for &quot;{searchQuery}&quot;
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary"
                      onClick={() => setSearchQuery("")}
                    >
                      Back to Discovery
                    </Button>
                  </div>
                )}
              </div>
            )}
            <p className="px-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Stock media by{" "}
              <a
                href="https://www.pexels.com/license/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Pexels
              </a>
              {" "}and free to use under their license.
            </p>
          </div>
        )}
      </div>

      {/* Fixed Navigation Hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/80">
            Scroll to Explore
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs px-10">
        No templates found in this category
      </p>
      <Button variant="link" onClick={onReset}>
        Back to All
      </Button>
    </div>
  );
}
