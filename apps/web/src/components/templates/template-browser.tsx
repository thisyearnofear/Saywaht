"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTemplateStore } from "@/stores/template-store";
import { TemplateCategoryCard } from "./template-category-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pexelsService, PexelsVideo, getPreferredPexelsVideoFile } from "@/services/pexels-service";
import { Loader2, Search, ExternalLink, Image as ImageIcon, Video } from "@/lib/icons";
import { toast } from "sonner";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTemplateBrowser } from "./mobile-template-browser";
import { resolveIpfsUrl, cn } from "@/lib/utils";
import { useVideoPreloader } from "@/hooks/use-video-preloader";
import { useMemo } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useCanvasStore, canvasPresets } from "@/stores/canvas-store";
import { useSceneStore } from "@/stores/scene-store";
import { startTemplateFlowMeasurement } from "@/lib/template-performance";

export function TemplateBrowser() {
  const { categories, isLoading, error, fetchCategories, recentTemplates } = useTemplateStore();
  const [mainTab, setMainTab] = useState<"packs" | "stock">("packs");
  const [searchQuery, setSearchQuery] = useState("");
  const [pexelsResults, setPexelsResults] = useState<PexelsVideo[]>([]);
  const [isPexelsLoading, setIsPexelsLoading] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  // PREPERFORMANCE: Preload the first few template videos
  const allTemplates = useMemo(() =>
    categories.flatMap(c => c.templates),
    [categories]);

  const templateUrls = useMemo(() =>
    allTemplates.map(t => resolveIpfsUrl(t.thumbnailUrl || "")),
    [allTemplates]);

  const stockUrls = useMemo(() =>
    pexelsResults.map(v => v.video_files.find(f => f.quality === 'sd')?.link || v.video_files[0].link),
    [pexelsResults]);

  useVideoPreloader(mainTab === 'packs' ? templateUrls : stockUrls);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Pexels search
  // Fix #3: gate on mainTab so we don't fire a Pexels request when the user
  // is on the "packs" tab. Also add mainTab to deps so switching tabs with an
  // empty query still loads the default stock reel.
  useEffect(() => {
    if (mainTab !== 'stock') {
      // Not on stock tab — don't touch Pexels at all.
      return;
    }

    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsPexelsLoading(true);
        try {
          const response = await pexelsService.search(searchQuery, 'video', 1, 12);
          setPexelsResults(response.videos || []);
        } catch (err) {
          console.error("Pexels search failed:", err);
        } finally {
          setIsPexelsLoading(false);
        }
      } else if (searchQuery === "") {
        // Fetch some trending videos as initial "templates"
        setIsPexelsLoading(true);
        try {
          const response = await pexelsService.search("cinematic background", 'video', 1, 12);
          setPexelsResults(response.videos || []);
        } catch (err) {
          console.error("Pexels trending fetch failed:", err);
        } finally {
          setIsPexelsLoading(false);
        }
      } else {
        setPexelsResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, mainTab]);


  const handleUsePexelsVideo = (video: PexelsVideo) => {
    const { addMediaItem, clearAllMedia } = useMediaStore.getState();
    const { createNewProject } = useProjectStore.getState();
    const { addTrack, addClipToTrack, setTracks } = useTimelineStore.getState();
    const { setCurrentTime, pause } = usePlaybackStore.getState();

    const bestFile = getPreferredPexelsVideoFile(video);
    const mediaId = `pexels-${video.id}`;
    startTemplateFlowMeasurement({
      templateId: mediaId,
      source: "stock-video",
      surface: "desktop-web",
    });

    // 1. Initialize project
    createNewProject(`Pexels: ${video.user.name}`);

    // 2. Clear existing state for a fresh start
    clearAllMedia();
    setTracks([]);

    // 3. Add the media item
    addMediaItem({
      id: mediaId,
      name: `Stock: ${video.user.name}`,
      type: "video",
      url: bestFile.link,
      thumbnailUrl: video.image,
      duration: video.duration,
      aspectRatio: video.width / video.height,
    });

    // 4. Create a track and add the clip so it's visible in the editor
    const trackId = addTrack("video");
    addClipToTrack(trackId, {
      mediaId: mediaId,
      name: `Stock: ${video.user.name}`,
      duration: video.duration,
      startTime: 0,
      trimStart: 0,
      trimEnd: 0,
    });

    // 5. Initialize canvas size based on video aspect ratio
    const videoAspectRatio = video.width / video.height;
    const { setCanvasPreset } = useCanvasStore.getState();
    const preset = canvasPresets.reduce((prev, curr) => {
      return (Math.abs(curr.aspectRatio - videoAspectRatio) < Math.abs(prev.aspectRatio - videoAspectRatio) ? curr : prev);
    });
    setCanvasPreset(preset);

    // 6. Initialize scenes immediately
    const { initializeScenes } = useSceneStore.getState();
    const updatedProject = useProjectStore.getState().activeProject;
    if (updatedProject) {
      initializeScenes(updatedProject.scenes || [], updatedProject.currentSceneId);
    }

    // 7. Reset playback state
    pause();
    setCurrentTime(0);

    toast.success("Ready to edit!");
    router.push("/editor");
  };

  // If on mobile, use the high-impact mobile browser
  if (isMobile) {
    return <MobileTemplateBrowser />;
  }

  // Filter templates based on search query
  const filteredCategories = categories.map(category => {
    return {
      ...category,
      templates: category.templates.filter(template => {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          (template.tags && template.tags.some(tag => tag.toLowerCase().includes(query))) ||
          template.id.toLowerCase().includes(query)
        );
      })
    };
  }).filter(category => category.templates.length > 0);

  // Show loading state
  if (isLoading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Curating templates...</p>
      </div>
    );
  }

  // Render main layout
  return (
    <div className="space-y-8">
      {/* Main Tab Switcher and Search */}
      <div className="sticky top-0 z-20 py-4 bg-background/80 backdrop-blur-md flex items-center justify-between gap-6 border-b border-border/50 px-2">
        <div className="flex p-1 bg-muted/30 rounded-2xl border border-border/50">
          <button
            onClick={() => setMainTab("packs")}
            className={cn(
              "px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mainTab === "packs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Template Packs
          </button>
          <button
            onClick={() => setMainTab("stock")}
            className={cn(
              "px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mainTab === "stock" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Stock Library
          </button>
        </div>

        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="text"
            placeholder={mainTab === 'packs' ? "Search packs..." : "Search 10,000+ stock clips..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background/80 border-border/50 focus:border-primary/50 h-11 pl-11 pr-11 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {mainTab === 'packs' ? (
          <div className="space-y-12">
            {error ? (
              <div className="p-8 bg-destructive/5 border border-destructive/10 text-destructive rounded-2xl text-center">
                <h3 className="font-bold text-lg mb-2">Failed to load templates</h3>
                <p className="text-sm opacity-80">{error}</p>
                <Button onClick={() => fetchCategories()} variant="outline" className="mt-4">Try Again</Button>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-20 text-center glass rounded-3xl">
                <h3 className="text-xl font-bold mb-2">No Templates Found</h3>
                <p className="text-muted-foreground">Adjust your search or browse the Stock Library.</p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                        {category.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {category.templates.map((template) => (
                      <TemplateCategoryCard key={template.id} template={template} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  Global Stock Library
                </h2>
                <p className="text-sm text-muted-foreground">Powered by Pexels • Royalty Free for Creators</p>
              </div>
              {isPexelsLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {pexelsResults.map((video) => (
                <div
                  key={video.id}
                  className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer ring-1 ring-border/50 hover:ring-primary transition-all hover:shadow-2xl"
                  onClick={() => handleUsePexelsVideo(video)}
                >
                  <Image
                    src={video.image}
                    alt={video.user.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 16vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-all" />

                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-[10px] text-white/70 uppercase tracking-widest font-black truncate mb-1">
                      {video.user.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/80 backdrop-blur-md px-2 py-0.5 rounded text-[8px] text-white font-black uppercase">
                        {Math.round(video.duration)}s
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                    <div className="bg-white text-black p-3 rounded-full shadow-2xl">
                      <Video className="h-5 w-5 fill-current" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pexelsResults.length === 0 && !isPexelsLoading && (
              <div className="py-20 text-center glass rounded-3xl">
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Stock Found</h3>
                <p className="text-muted-foreground">Try searching for keywords like &quot;drone&quot;, &quot;fashion&quot;, or &quot;nature&quot;.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
