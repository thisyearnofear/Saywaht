"use client";

import React from "@/lib/hooks-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Template } from "@/types/template";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTemplateStore } from "@/stores/template-store";
import { HoverVideoPreview } from "./hover-video-preview";
import { LuSmartphone, LuSquare, LuMonitor } from "react-icons/lu";

interface TemplateCategoryCardProps {
  template: Template;
}

export function TemplateCategoryCard({ template }: TemplateCategoryCardProps) {
  const router = useRouter();
  const { selectTemplate } = useTemplateStore();

  const handleSelect = () => {
    selectTemplate(template.id);
    router.push(`/templates/${template.id}`);
  };

  const handleUse = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectTemplate(template.id);
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
      className="overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={handleSelect}
    >
      <div className="relative aspect-video overflow-hidden">
        {template.thumbnailUrl ? (
          template.thumbnailUrl.endsWith(".mp4") ? (
            // Use HoverVideoPreview component for MP4 files
            <HoverVideoPreview
              videoSrc={template.thumbnailUrl}
              alt={template.name}
              className="w-full h-full"
            />
          ) : (
            // Image thumbnail
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

        {/* Aspect Ratio Badge */}
        <div className="absolute top-2 right-2">
          <Badge
            className={`${aspectRatioInfo.color} border-0 text-xs flex items-center gap-1`}
          >
            <aspectRatioInfo.icon size={12} />
            {aspectRatioInfo.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium text-white">{template.name}</h3>
        <p className="text-sm text-white/70 line-clamp-2 mt-1">
          {template.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="text-xs text-white/50">
          {template.hasAudio ? "Complete Example" : "No Audio"}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/10 hover:bg-white/20 text-white"
            onClick={handleUse}
          >
            Use Template
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white"
            onClick={handleSelect}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
