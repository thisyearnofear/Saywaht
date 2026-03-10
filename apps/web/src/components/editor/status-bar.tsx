"use client";

import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { usePanelStore } from "@/stores/panel-store";
import { cn } from "@/lib/utils";
import {
  Clock,
  Layers,
  Video,
  Wifi,
  WifiOff,
  CheckCircle,
  ChevronUp,
  ChevronDown,
} from "@/lib/icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function StatusBar() {
  const { activeProject } = useProjectStore();
  const { tracks } = useTimelineStore();
  const { currentTime, duration } = usePlaybackStore();
  const { isTimelineCollapsed, toggleTimelineCollapse } = usePanelStore();
  const [isOnline, setIsOnline] = useState(true);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.updatedAt) {
      setLastSavedText(
        new Date(activeProject.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else {
      setLastSavedText(null);
    }
  }, [activeProject?.updatedAt]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="h-6 bg-muted/30 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Timeline Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTimelineCollapse}
          className="h-5 px-2 text-xs hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95"
          title={isTimelineCollapsed ? "Show Timeline" : "Hide Timeline"}
        >
          {isTimelineCollapsed ? (
            <ChevronUp className="w-3 h-3 mr-1 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-3 h-3 mr-1 transition-transform duration-200" />
          )}
          Timeline
        </Button>

        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>{tracks.length} tracks</span>
        </div>

        <div className="flex items-center gap-1">
          <Video className="w-3 h-3" />
          <span>{tracks.reduce((sum, t) => sum + (t.clips?.length ?? 0), 0)} clips</span>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <div
            className={cn(
              "text-xs h-5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground"
            )}
          >
            {activeProject.name}
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {lastSavedText && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Saved {lastSavedText}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-green-500" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-red-500" />
              <span>Offline</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
