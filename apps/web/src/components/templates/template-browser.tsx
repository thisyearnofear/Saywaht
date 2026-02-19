"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/stores/template-store";
import { TemplateCategoryCard } from "./template-category-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pexelsService, PexelsVideo } from "@/services/pexels-service";
import { Loader2, Search, ExternalLink, Image as ImageIcon, Video } from "@/lib/icons";
import { toast } from "sonner";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";

export function TemplateBrowser() {
  const { categories, isLoading, error, fetchCategories, recentTemplates } = useTemplateStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [pexelsResults, setPexelsResults] = useState<PexelsVideo[]>([]);
  const [isPexelsLoading, setIsPexelsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Pexels search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsPexelsLoading(true);
        try {
          const response = await pexelsService.search(searchQuery, 'video', 1, 6);
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
          const response = await pexelsService.search("cinematic", 'video', 1, 6);
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
  }, [searchQuery]);

  const handleUsePexelsVideo = (video: PexelsVideo) => {
    const { addMediaItem, clearAllMedia } = useMediaStore.getState();
    const { createNewProject } = useProjectStore.getState();

    const bestFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];

    // Create new project
    createNewProject(`Pexels: ${video.user.name}`);
    clearAllMedia();

    // Add the video
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
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Curating templates...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-center">
        <h3 className="font-bold text-lg mb-2">Failed to load templates</h3>
        <p className="text-sm opacity-80 max-w-md mx-auto">{error}</p>
        <Button
          onClick={() => fetchCategories()}
          variant="outline"
          className="mt-6 border-destructive/30 hover:bg-destructive/10"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // No categories found
  if (categories.length === 0) {
    return (
      <div className="p-12 text-center glass rounded-2xl">
        <h3 className="text-xl font-bold mb-2">No Templates Available</h3>
        <p className="text-muted-foreground">
          Check back later for new templates or create your own project from
          scratch.
        </p>
      </div>
    );
  }

  // No search results
  if (filteredCategories.length === 0) {
    return (
      <div className="p-12 text-center glass rounded-2xl">
        <h3 className="text-xl font-bold mb-2">No Templates Found</h3>
        <p className="text-muted-foreground mb-6">
          Your search &quot;{searchQuery}&quot; didn&apos;t match any templates.
        </p>
        <Button
          onClick={() => setSearchQuery("")}
          variant="secondary"
          className="rounded-full"
        >
          Clear Search
        </Button>
      </div>
    );
  }

  // Render categories with aspect ratio organization
  return (
    <div className="space-y-6 md:space-y-12">
      {/* Search Bar - More mobile friendly */}
      <div className="sticky top-0 z-20 py-2 md:pb-4 bg-background/90 md:bg-background/50 backdrop-blur-sm -mx-2 px-2 md:pt-2 -mt-2 md:mt-0">
        <div className="relative group">
          <Input
            type="text"
            placeholder="Search by name, style, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background/80 border-border/50 focus:border-primary/50 text-foreground placeholder-muted-foreground w-full h-12 pl-12 pr-12 rounded-2xl shadow-sm transition-all group-hover:shadow-md"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m15 9-6 6"></path>
                <path d="m9 9 6 6"></path>
              </svg>
            </button>
          )}
        </div>
        <div className="flex justify-between items-center mt-3 px-2">
          <div className="flex gap-2">
            {/* Simple filters could go here */}
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            {filteredCategories.reduce((total, category) => total + category.templates.length, 0)} Results
          </p>
        </div>
      </div>

      {/* Recent Templates Section */}
      {recentTemplates.length > 0 && searchQuery === "" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h2 className="text-sm uppercase tracking-widest font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              Recently Used
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground"
              onClick={() => useTemplateStore.getState().clearRecentTemplates()}
            >
              Clear History
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentTemplates.map((template) => (
              <TemplateCategoryCard
                key={template.id}
                template={template}
                showRecentBadge={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pexels Stock Section */}
      {(pexelsResults.length > 0 || isPexelsLoading) && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h2 className="text-sm uppercase tracking-widest font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Pexels Stock {searchQuery ? `"${searchQuery}"` : "Cinematic"}
            </h2>
            <div className="flex items-center gap-2">
              {isPexelsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Library</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pexelsResults.map((video) => (
              <div
                key={video.id}
                className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer ring-1 ring-border/50 hover:ring-primary/50 transition-all hover:shadow-xl"
                onClick={() => handleUsePexelsVideo(video)}
              >
                <img
                  src={video.image}
                  alt={video.user.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="absolute bottom-2 left-2 right-2 text-[8px] text-white font-bold truncate uppercase tracking-tighter">
                  {video.user.name}
                </div>
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] text-white font-black">
                  {Math.round(video.duration)}s
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                  <div className="bg-primary text-white p-2 rounded-full shadow-2xl">
                    <Video className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pexelsResults.length === 0 && !isPexelsLoading && (
            <div className="py-8 text-center text-muted-foreground text-xs glass rounded-xl">
              No stock videos found. Try a different search.
            </div>
          )}
        </div>
      )}

      {filteredCategories.map((category) => {
        // Group templates by aspect ratio
        const portraitTemplates = category.templates.filter(
          (t) => t.aspectRatio === "portrait"
        );
        const squareTemplates = category.templates.filter(
          (t) => t.aspectRatio === "square"
        );
        const landscapeTemplates = category.templates.filter(
          (t) => t.aspectRatio === "landscape" || !t.aspectRatio
        );

        return (
          <div key={category.id} className="space-y-8 animate-fade-in">
            <div className="border-l-4 border-primary pl-4 py-1">
              <h2 className="text-2xl font-bold text-foreground">
                {category.name}
              </h2>
              <p className="text-muted-foreground text-sm">{category.description}</p>
            </div>

            {/* Portrait Templates (Mobile-First) */}
            {portraitTemplates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-primary"
                    >
                      <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm uppercase tracking-widest font-bold text-foreground">
                      Portrait
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Optimized for Mobile & Zora</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portraitTemplates.map((template) => (
                    <TemplateCategoryCard
                      key={template.id}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Square Templates */}
            {squareTemplates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-2 rounded-lg">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-accent"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm uppercase tracking-widest font-bold text-foreground">
                      Square
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Universal Compatibility</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {squareTemplates.map((template) => (
                    <TemplateCategoryCard
                      key={template.id}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Landscape Templates */}
            {landscapeTemplates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2 rounded-lg">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-muted-foreground"
                    >
                      <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm uppercase tracking-widest font-bold text-foreground">
                      Landscape
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Traditional Display</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {landscapeTemplates.map((template) => (
                    <TemplateCategoryCard
                      key={template.id}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
