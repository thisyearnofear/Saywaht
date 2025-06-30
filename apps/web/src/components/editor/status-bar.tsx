"use client";

import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { Badge } from "../ui/badge";
import { 
  Clock, 
  Layers, 
  HardDrive, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useEffect, useState } from "react";

export function StatusBar() {
  const { activeProject } = useProjectStore();
  const { tracks } = useTimelineStore();
  const { currentTime, duration } = usePlaybackStore();
  const [isOnline, setIsOnline] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="h-6 bg-muted/30 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>{tracks.length} tracks</span>
        </div>
        
        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          <span>{formatFileSize(0)} used</span>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <Badge variant="secondary" className="text-xs h-5">
            {activeProject.name}
          </Badge>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {lastSaved && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
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
