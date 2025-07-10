"use client";

import React from '@/lib/hooks-provider';
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
import { useRouter } from "next/navigation";
import { Template } from "@/types/template";
import { HoverVideoPreview } from "@/components/templates/hover-video-preview";
import Image from "next/image";
import { useEffect, useMemo } from '@/lib/hooks-provider';

// Interface for templates with category name
interface FeaturedTemplate extends Template {
  categoryName: string;
}

export function WelcomeScreen() {
  const { createNewProject } = useProjectStore();
  const router = useRouter();
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

    // Prioritize animal voiceovers templates
    return templates
      .sort((a, b) => {
        // Sort animal templates first (supporting both old and new structure)
        const aIsAnimal =
          (a.category === "voiceovers" && a.subcategory === "animal") ||
          a.category === "animal-voiceovers";

        const bIsAnimal =
          (b.category === "voiceovers" && b.subcategory === "animal") ||
          b.category === "animal-voiceovers";

        if (aIsAnimal && !bIsAnimal) return -1;
        if (!aIsAnimal && bIsAnimal) return 1;
        return 0;
      })
      .slice(0, 4); // Get top 4 templates
  }, [categories]);

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 text-white">
      {/* Hero Section with Visual Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
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
                SayWhat?!
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              coin your commentary
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="px-8 py-10">
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Left Column - Project Creation */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 text-center lg:text-left">
                    <h2 className="text-2xl font-bold">Ready to Create?</h2>
                    <p className="text-white/80">
                      Start from scratch and bring your vision to life.
                    </p>
                  </div>

                  <Button
                    onClick={() => createNewProject("My Awesome Project")}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6 rounded-lg shadow-lg border-0 transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-6 w-6"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Create New Project
                  </Button>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-300">
                        {isLoading ? "..." : featuredTemplates.length}
                      </div>
                      <div className="text-xs text-white/60 uppercase tracking-wider">
                        Templates
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-300">
                        3
                      </div>
                      <div className="text-xs text-white/60 uppercase tracking-wider">
                        Categories
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-pink-300">4K</div>
                      <div className="text-xs text-white/60 uppercase tracking-wider">
                        Quality
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Templates */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 text-center lg:text-left">
                    <h2 className="text-2xl font-bold">Need Inspiration?</h2>
                    <p className="text-white/80">Start with a template.</p>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <svg
                        className="w-8 h-8 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </div>
                  ) : featuredTemplates.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {featuredTemplates
                        .slice(0, 2)
                        .map((template: FeaturedTemplate) => (
                          <Card
                            key={template.id}
                            className="overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.03] cursor-pointer"
                            onClick={() =>
                              router.push(`/templates/${template.id}`)
                            }
                          >
                            <div className="aspect-video relative overflow-hidden">
                              {template.thumbnailUrl ? (
                                template.thumbnailUrl.endsWith(".mp4") ? (
                                  // Use hover-to-play video for MP4 files
                                  <HoverVideoPreview
                                    videoSrc={template.thumbnailUrl}
                                    alt={template.name}
                                    className="w-full h-full"
                                  />
                                ) : (
                                  // Static image for other thumbnails
                                  <Image
                                    src={template.thumbnailUrl}
                                    alt={template.name}
                                    fill
                                    className="object-cover"
                                  />
                                )
                              ) : (
                                // Fallback when no thumbnail is available
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                  <svg
                                    width="48"
                                    height="48"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white/50"
                                  >
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                              <div className="absolute bottom-2 left-2 text-white z-20 text-sm font-medium">
                                {template.name}
                              </div>
                            </div>
                            <CardContent className="p-3">
                              <p className="text-xs text-white/70 truncate">
                                {template.categoryName}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/60">
                      <p>No templates available</p>
                    </div>
                  )}

                  <div className="flex justify-center lg:justify-start">
                    <Button
                      onClick={() => router.push("/templates")}
                      className="bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                    >
                      {isLoading
                        ? "Loading..."
                        : featuredTemplates.length > 0
                          ? `Browse All ${featuredTemplates.length} Templates`
                          : "Browse Templates"}
                    </Button>
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
                      Add your own voiceovers
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
