"use client";

import React from '@/lib/hooks-provider';
import { TemplateTimelineTrack } from "@/types/template";

interface TemplateTimelineProps {
  tracks: TemplateTimelineTrack[];
}

export function TemplateTimeline({ tracks }: TemplateTimelineProps) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="text-white/60 text-sm italic">
        No timeline data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <div key={track.id} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white/80">
              {track.name ||
                `${track.type.charAt(0).toUpperCase() + track.type.slice(1)} Track`}
            </span>
            {track.muted && (
              <span className="text-xs bg-yellow-600/30 text-yellow-200 px-1.5 py-0.5 rounded">
                Muted
              </span>
            )}
          </div>

          <div className="relative h-8 bg-white/5 rounded-sm overflow-hidden">
            {track.clips.map((clip) => {
              // Calculate clip position and width based on timeline (100% = 60 seconds)
              const startPercent = (clip.startTime / 60) * 100;
              const widthPercent = (clip.duration / 60) * 100;

              // Different background colors for different track types
              const bgColor =
                track.type === "video"
                  ? "bg-blue-500/50"
                  : track.type === "audio"
                    ? "bg-green-500/50"
                    : "bg-purple-500/50"; // effects

              return (
                <div
                  key={clip.id}
                  className={`absolute top-0 h-full ${bgColor} border border-white/20 rounded-sm`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                >
                  <div className="px-2 truncate text-xs text-white/90 leading-8">
                    {clip.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
