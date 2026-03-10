"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Template } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverVideoPreview } from "./hover-video-preview";
import { LuSmartphone, LuSquare, LuMonitor } from "react-icons/lu";
import { resolveIpfsUrl } from "@/lib/utils";

interface TemplateCategoryCardProps {
  template: Template;
  showRecentBadge?: boolean;
}

export function TemplateCategoryCard({ template, showRecentBadge }: TemplateCategoryCardProps) {
  const router = useRouter();
  // NOTE: selectTemplate is intentionally NOT called here before navigation.
  // The destination pages (template-details, use-client) call selectTemplate
  // on mount with a re-fetch guard, so pre-fetching here only wastes a request
  // that immediately gets cancelled by the destination's own call.
  // (Fix #1: eliminate double-fetch race condition)

  const resolvedThumbnailUrl = template.thumbnailUrl ? resolveIpfsUrl(template.thumbnailUrl) : null;

  const handleSelect = () => {
    router.push(`/templates/${template.id}`);
  };

  const handleUse = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/templates/${template.id}/use`);
  };

  // Get aspect ratio info for display
  const getAspectRatioInfo = () => {
    const aspectRatio = template.aspectRatio || "landscape"; // fallback for older templates
    switch (aspectRatio) {
      case "portrait":
        return {
          icon: LuSmartphone,
          label: "Portrait",
          color: "bg-green-500/20 text-green-300",
        };
      case "square":
        return {
          icon: LuSquare,
          label: "Square",
          color: "bg-blue-500/20 text-blue-300",
        };
      case "landscape":
      default:
        return {
          icon: LuMonitor,
          label: "Landscape",
          color: "bg-orange-500/20 text-orange-300",
        };
    }
  };

  const aspectRatioInfo = getAspectRatioInfo();

  return (
    <Card
      className="overflow-hidden bg-card/50 border-border/50 md:hover:border-primary/50 transition-all duration-300 cursor-pointer group shadow-sm md:hover:shadow-xl touch-manipulation"
      onClick={handleSelect}
    >
      <div className="relative aspect-video overflow-hidden">
        {resolvedThumbnailUrl ? (
          resolvedThumbnailUrl.endsWith(".mp4") || resolvedThumbnailUrl.includes("video") ? (
            // Use HoverVideoPreview component for MP4 files
            <HoverVideoPreview
              videoSrc={resolvedThumbnailUrl}
              alt={template.name}
              className="w-full h-full transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            // Image thumbnail
            <Image
              src={resolvedThumbnailUrl}
              alt={template.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          )
        ) : (
          // Fallback when no thumbnail is available
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground/50"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {showRecentBadge && (
            <Badge
              className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 backdrop-blur-md"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                <path d="M12 6v6l4 2"></path>
              </svg>
              Recent
            </Badge>
          )}
          <Badge
            className={`${aspectRatioInfo.color} border-0 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 backdrop-blur-md`}
          >
            <aspectRatioInfo.icon size={10} strokeWidth={3} />
            {aspectRatioInfo.label}
          </Badge>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleUse} className="rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
            Use Now
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{template.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {template.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center border-t border-border/50 mt-auto">
        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          {template.hasAudio ? "High Fidelity" : "Visual Only"}
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
            onClick={handleSelect}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
