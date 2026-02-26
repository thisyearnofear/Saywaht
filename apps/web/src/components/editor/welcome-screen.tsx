"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProjectStore } from "@/stores/project-store";
import { useTemplateStore } from "@/stores/template-store";
import { useSmartNavigation } from "@/hooks/use-smart-navigation";
import { Template } from "@/lib/types";
import { HoverVideoPreview } from "@/components/templates/hover-video-preview";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { Sparkles, Loader2, Video, Plus } from "@/lib/icons";
import { resolveIpfsUrl } from "@/lib/utils";

// Interface for templates with category name
interface FeaturedTemplate extends Template {
  categoryName: string;
}

export function WelcomeScreen() {
  const { createNewProject } = useProjectStore();
  const { navigateToTemplate, navigateToTemplates } = useSmartNavigation();
  const { fetchCategories, categories, isLoading } = useTemplateStore();

  useEffect(() => {
    // Load template categories when the component mounts
    fetchCategories();
  }, [fetchCategories]);

  // Get featured templates with priority to animal voiceovers
  const featuredTemplates = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // Collect templates from all categories
    const templates: FeaturedTemplate[] = categories.flatMap((category) =>
      category.templates.map((template) => ({
        ...template,
        categoryName: category.name,
      }))
    );

    // Prioritize portrait templates first (mobile-first), then other formats
    return templates
      .sort((a, b) => {
        // First priority: Portrait templates (mobile-first for Zora)
        const aIsPortrait = a.aspectRatio === "portrait";
        const bIsPortrait = b.aspectRatio === "portrait";

        if (aIsPortrait && !bIsPortrait) return -1;
        if (!aIsPortrait && bIsPortrait) return 1;

        // Second priority: Square templates (universal)
        const aIsSquare = a.aspectRatio === "square";
        const bIsSquare = b.aspectRatio === "square";

        if (aIsSquare && !bIsSquare) return -1;
        if (!aIsSquare && bIsSquare) return 1;

        // Third priority: Landscape templates
        return 0;
      })
      .slice(0, 4); // Get top 4 templates
  }, [categories]);

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 text-white overflow-y-auto scrollable">
      {/* Hero Section with Visual Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute top-60 -left-20 w-60 h-60 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              {" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                saywaht?!
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Coin Your Commentary
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="px-8 py-10">
              <div className="flex flex-col lg:flex-row-reverse gap-10">
                {/* Right Column - Templates (NOW PRIMARY) */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 text-center lg:text-left">
                    <h2 className="text-3xl font-black flex items-center justify-center lg:justify-start gap-3 italic uppercase tracking-tighter">
                      <Sparkles className="h-8 w-8 text-yellow-400" />
                      Create with Style
                    </h2>
                    <p className="text-white/80 font-medium">Pick a high-fidelity template to start your commentary.</p>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  ) : featuredTemplates.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {featuredTemplates
                        .slice(0, 2)
                        .map((template: FeaturedTemplate) => (
                          <Card
                            key={template.id}
                            className="overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.03] cursor-pointer group rounded-2xl"
                            onClick={() =>
                              navigateToTemplate(template.id)
                            }
                          >
                            <div className="aspect-[3/4] relative overflow-hidden">
                              {template.thumbnailUrl ? (
                                <HoverVideoPreview
                                  videoSrc={resolveIpfsUrl(template.thumbnailUrl)}
                                  alt={template.name}
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                  <Video className="h-8 w-8 text-white/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                              <div className="absolute bottom-3 left-3 text-white z-20 text-[10px] font-black uppercase tracking-widest leading-none">
                                {template.name}
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/60">
                      <p>No templates available</p>
                    </div>
                  )}

                  <div className="flex justify-center lg:justify-start pt-2">
                    <Button
                      onClick={() => navigateToTemplates()}
                      className="w-full h-16 bg-white text-blue-900 hover:bg-white/90 font-black uppercase tracking-widest rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all active:scale-95 text-lg"
                    >
                      Explore All Packs
                    </Button>
                  </div>
                </div>

                {/* Left Column - Project Creation (NOW SECONDARY) */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 text-center lg:text-left">
                    <h2 className="text-2xl font-bold opacity-80">Starting Fresh?</h2>
                    <p className="text-white/60">
                      Create a project from scratch and import your own media.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => createNewProject("My Awesome Project")}
                    className="w-full bg-white/5 border-white/20 hover:bg-white/10 text-white text-sm py-6 rounded-2xl transition-all"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    New Empty Project
                  </Button>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-4 mt-6 opacity-60">
                    <div className="text-center border-r border-white/10">
                      <div className="text-2xl font-bold text-blue-300">
                        {isLoading ? "..." : featuredTemplates.length}
                      </div>
                      <div className="text-[8px] text-white/60 uppercase tracking-widest">
                        Templates
                      </div>
                    </div>
                    <div className="text-center border-r border-white/10">
                      <div className="text-2xl font-bold text-purple-300">
                        3
                      </div>
                      <div className="text-[8px] text-white/60 uppercase tracking-widest">
                        Categories
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-300">HD</div>
                      <div className="text-[8px] text-white/60 uppercase tracking-widest">
                        Quality
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Feature Bar */}
            <div className="bg-white/5 px-8 py-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Pexels Templates</h3>
                    <p className="text-sm text-white/60">
                      Start with pre-made vids
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Custom Audio</h3>
                    <p className="text-sm text-white/60">
                      Add your own voiceovers (10s limit)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      High Quality Video
                    </h3>
                    <p className="text-sm text-white/60">
                      Export in 4K resolution
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
