"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { VideoPreview } from "./video-preview";
import { useState, useEffect } from "react";
import { resolveIpfsUrl, cn } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Clock,
  Layers,
  Sparkles,
  Smartphone,
  Monitor,
  Square,
  Mic,
  Video,
  Music,
  ChevronRight,
  Zap
} from "@/lib/icons";
import { Badge } from "@/components/ui/badge";

interface TemplateDetailsProps {
  templateId: string;
}

export function TemplateDetails({ templateId }: TemplateDetailsProps) {
  const router = useRouter();
  const {
    selectedTemplate,
    isLoading,
    error,
    selectTemplate,
    applySelectedTemplate,
    clearSelectedTemplate,
  } = useTemplateStore();

  useEffect(() => {
   console.log('[TemplateDetails] Checking template:', templateId);
   if (templateId && selectedTemplate?.id !== templateId) {
     console.log('[TemplateDetails] Fetching template:', templateId);
     selectTemplate(templateId).catch((err) => 
       console.error('[TemplateDetails] selectTemplate error:', err)
      );
    }
  }, [templateId, selectTemplate, selectedTemplate?.id]);

  const resolvedVideoUrl = selectedTemplate?.videoUrl ? resolveIpfsUrl(selectedTemplate.videoUrl) : null;
  const resolvedThumbnailUrl = selectedTemplate?.thumbnailUrl ? resolveIpfsUrl(selectedTemplate.thumbnailUrl) : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">Loading template details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-center max-w-md mx-auto">
        <h3 className="font-bold text-lg mb-2">Error loading template</h3>
        <p className="text-sm opacity-80 mb-6">{error}</p>
        <Button
          onClick={() => selectTemplate(templateId)}
          variant="outline"
          className="border-destructive/30 hover:bg-destructive/10"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Template not found
  if (!selectedTemplate) {
    return (
      <div className="p-12 text-center glass rounded-2xl max-w-md mx-auto">
        <h3 className="text-xl font-bold mb-2">Template Not Found</h3>
        <p className="text-muted-foreground mb-6">The requested template could not be found.</p>
        <Button
          onClick={() => router.push("/templates")}
          variant="secondary"
          className="rounded-full"
        >
          Back to Templates
        </Button>
      </div>
    );
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    // Fully await the async media-loading so the timeline is populated
    // before we navigate.  Clear the template afterwards so EditorProvider
    // doesn't attempt a second (duplicate) application.
    const success = await applySelectedTemplate();
    if (success) {
      clearSelectedTemplate();
      router.push("/editor");
    }
  };

  // Get aspect ratio info for display
  const getAspectRatioInfo = () => {
    const aspectRatio = selectedTemplate.aspectRatio || "landscape";
    switch (aspectRatio) {
      case "portrait":
        return {
          icon: Smartphone,
          label: "Portrait (9:16)",
          description: "Perfect for TikTok, Reels & Zora Mobile",
          color: "text-green-500 bg-green-500/10",
        };
      case "square":
        return {
          icon: Square,
          label: "Square (1:1)",
          description: "Universal format for all social feeds",
          color: "text-blue-500 bg-blue-500/10",
        };
      case "landscape":
      default:
        return {
          icon: Monitor,
          label: "Landscape (16:9)",
          description: "Traditional widescreen format",
          color: "text-orange-500 bg-orange-500/10",
        };
    }
  };

  const ratio = getAspectRatioInfo();

  return (
    <div className="space-y-6 md:space-y-10 animate-fade-in">
      {/* Breadcrumbs & Header - Compact */}
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/templates")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Browse
        </Button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {selectedTemplate.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none text-[10px] uppercase tracking-wider font-bold">
                {selectedTemplate.category}
              </Badge>
              {selectedTemplate.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="rounded-full text-[10px] uppercase tracking-wider font-semibold opacity-70">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={handleApplyTemplate}
            disabled={isLoading}
            size="lg"
            className="rounded-full px-8 shadow-lg hover:shadow-primary/20 transition-all btn-hover hidden md:flex"
          >
            {isLoading ? "Loading…" : "Use Template"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Preview */}
        <div className="lg:col-span-7 space-y-8">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl bg-black shadow-2xl border border-border/50 ring-1 ring-white/10",
              selectedTemplate.aspectRatio === "portrait"
                ? "aspect-[9/16] max-w-sm mx-auto"
                : selectedTemplate.aspectRatio === "square"
                  ? "aspect-square max-w-md mx-auto"
                  : "aspect-video"
            )}
          >
            {resolvedVideoUrl ||
              (resolvedThumbnailUrl &&
                resolvedThumbnailUrl.endsWith(".mp4")) ? (
              <VideoPreview
                src={resolvedVideoUrl || resolvedThumbnailUrl!}
                title={selectedTemplate.name}
              />
            ) : resolvedThumbnailUrl ? (
              <Image
                src={resolvedThumbnailUrl}
                alt={selectedTemplate.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 gap-4">
                <Play className="h-12 w-12 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground font-medium">No preview available</span>
              </div>
            )}
          </div>

          {/* Timeline Visualizer */}
          {selectedTemplate.timelineTracks && (
            <div className="glass rounded-3xl p-6 border-border/40">
              <h3 className="text-sm uppercase tracking-widest font-bold text-foreground mb-6 flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Project Structure
              </h3>
              <div className="space-y-4">
                {selectedTemplate.timelineTracks.map((track) => (
                  <div key={track.id} className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {track.type === 'video' ? <Video className="h-3 w-3" /> : track.type === 'audio' ? <Music className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                        {track.name || track.type}
                      </span>
                      {track.clips.length} Clips
                    </div>

                    <div className="relative h-10 bg-muted/30 rounded-xl overflow-hidden border border-border/30">
                      {track.clips.map((clip) => {
                        const startPercent = (clip.startTime / 60) * 100;
                        const widthPercent = (clip.duration / 60) * 100;
                        const colors = {
                          video: "bg-primary/30 border-primary/40",
                          audio: "bg-green-500/30 border-green-500/40",
                          effects: "bg-accent/30 border-accent/40"
                        };
                        const colorClass = colors[track.type as keyof typeof colors] || colors.effects;

                        return (
                          <div
                            key={clip.id}
                            className={cn("absolute top-1 bottom-1 border rounded-lg transition-all hover:brightness-110 flex items-center px-2", colorClass)}
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          >
                            <span className="text-[10px] font-bold text-foreground truncate">{clip.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-[10px] font-bold text-muted-foreground/60 px-1">
                <span>0s</span>
                <span>30s</span>
                <span>60s</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Details & Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Stats Card */}
          <div className="glass rounded-3xl p-6 border-border/40 space-y-6">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl", ratio.color)}>
                <ratio.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{ratio.label}</h3>
                <p className="text-xs text-muted-foreground">{ratio.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-2xl p-4 flex flex-col items-center text-center">
                <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-lg font-bold">~60s</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Duration</span>
              </div>
              <div className="bg-muted/30 rounded-2xl p-4 flex flex-col items-center text-center">
                <Sparkles className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-lg font-bold">HD</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Quality</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">How it works</h4>
              <ul className="space-y-3">
                {[
                  { icon: Mic, text: "Record your commentary or reaction" },
                  { icon: Layers, text: "Sync automatically with the template" },
                  { icon: Zap, text: "Mint your video coin in seconds" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-3 w-3 text-primary" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleApplyTemplate}
              disabled={isLoading}
              className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all btn-hover"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                <>Start Creating<ChevronRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </div>

          {/* Description Card */}
          <div className="glass rounded-3xl p-6 border-border/40">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">About this template</h3>
            <p className="text-foreground/90 leading-relaxed text-sm">
              {selectedTemplate.description}
            </p>

            {selectedTemplate.source && (
              <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Source</span>
                <a
                  href={selectedTemplate.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  {selectedTemplate.source.name}
                  <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Mobile Apply Button (Sticky-ish) */}
          <div className="md:hidden fixed bottom-6 left-6 right-6 z-40">
            <Button
              onClick={handleApplyTemplate}
              disabled={isLoading}
              className="w-full h-14 rounded-full text-lg font-bold shadow-2xl shadow-primary/40 border-2 border-white/20 animate-slide-up"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                "Use This Template"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
