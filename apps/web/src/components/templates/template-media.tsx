"use client";

import React from '@/lib/hooks-provider';
import { TemplateMediaItem } from "@/types/template";
import { Card, CardContent } from "@/components/ui/card";

interface TemplateMediaProps {
  mediaItems: TemplateMediaItem[];
}

export function TemplateMedia({ mediaItems }: TemplateMediaProps) {
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="text-white/60 text-sm italic">
        No media items in this template
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {mediaItems.map((item) => (
        <Card key={item.id} className="bg-white/5 border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Media type icon */}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-white/10">
                {item.type === "video" && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-400"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="2.18"
                      ry="2.18"
                    />
                    <line x1="7" y1="2" x2="7" y2="22" />
                    <line x1="17" y1="2" x2="17" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                )}
                {item.type === "image" && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-green-400"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
                {item.type === "audio" && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-purple-400"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                )}
              </div>

              {/* Media info */}
              <div className="flex-grow min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {item.name}
                </div>
                <div className="text-xs text-white/60">
                  {item.duration ? `${Math.round(item.duration)}s` : ""}
                  {item.duration && item.aspectRatio ? " • " : ""}
                  {item.aspectRatio ? `${item.aspectRatio}:1` : ""}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
