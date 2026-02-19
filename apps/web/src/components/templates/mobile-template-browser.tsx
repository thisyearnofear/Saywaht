"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/stores/template-store";
import { Template, TemplateCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverVideoPreview } from "./hover-video-preview";
import { Play, Zap, Flame, Award, Music, Smartphone, Sparkles, ChevronRight, Loader2 } from "@/lib/icons";
import { resolveIpfsUrl, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { pexelsService, PexelsVideo } from "@/services/pexels-service";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { Input } from "@/components/ui/input";
import { Search, Video as VideoIcon } from "lucide-react";
import { useVideoPreloader } from "@/hooks/use-video-preloader";

export function MobileTemplateBrowser() {
  const { categories, isLoading, selectTemplate, applySelectedTemplate } = useTemplateStore();
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
    if (!activeCategoryId) return allTemplates;
    const category = categories.find(c => c.id === activeCategoryId);
    return category ? category.templates.map(t => ({ ...t, categoryName: category.name })) : [];
  }, [activeCategoryId, allTemplates, categories]);

  // Handle Pexels search
  useEffect(() => {
    if (mainTab !== 'stock') return;

    const timer = setTimeout(async () => {
      setIsPexelsLoading(true);
      try {
        const query = searchQuery || "cinematic background";
        const response = await pexelsService.search(query, 'video', 1, 10);
        setPexelsResults(response.videos || []);
      } catch (err) {
        console.error("Pexels load failed:", err);
      } finally {
        setIsPexelsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, mainTab]);

  const handleUsePexelsVideo = (video: PexelsVideo) => {
    const { addMediaItem, clearAllMedia } = useMediaStore.getState();
    const { createNewProject } = useProjectStore.getState();

    const bestFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];

    createNewProject(`Pexels: ${video.user.name}`);
    clearAllMedia();

    addMediaItem({
      id: `pexels-${video.id}`,
      name: `Stock: ${video.user.name}`,
      type: "video",
      url: bestFile.link,
      thumbnailUrl: video.image,
      duration: video.duration,
      aspectRatio: video.width / video.height,
    });

    toast.success("Ready to edit!");
    router.push("/editor");
  };

  const handleUseTemplate = async (template: Template) => {
    setIsApplying(template.id);
    try {
      await selectTemplate(template.id);
      const success = await applySelectedTemplate();
      if (success) {
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
                className="relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="bg-white/5 border-white/10 rounded-xl pl-10 h-10 text-xs placeholder:text-muted-foreground"
                  placeholder="Search 10,000+ stock clips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
            </div>
            {isPexelsLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
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

const addHapticFeedback = (type: "light" | "medium" | "heavy") => {
  if (typeof window !== "undefined" && (window as any).twa?.hapticFeedback) {
    (window as any).twa.hapticFeedback.notificationOccurred(type);
  }
};
