"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import {
  ArrowLeft,
  Download,
  Share2,
  Settings,
  Play,
  Pause,
  MoreHorizontal,
  Coins,
  Loader2,
} from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useAccount } from "wagmi";
import { toast } from "sonner";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { isPlaying, toggle } = usePlaybackStore();
  const { address } = useAccount();

  const [isExporting, setIsExporting] = useState(false);
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  const handleExport = async () => {
    if (!activeProject || tracks.length === 0) {
      toast.error("No content to export");
      return;
    }

    setIsExporting(true);
    try {
      // Calculate total duration from timeline
      const totalDuration = Math.max(
        ...tracks.flatMap(track => 
          track.clips.map(clip => clip.startTime + clip.duration)
        ),
        5 // Minimum 5 seconds
      );

      // Dynamic import to avoid loading export utils unless needed
      const { exportVideoWithCanvas } = await import("@/lib/canvas-export-utils");
      
      const blob = await exportVideoWithCanvas(
        tracks,
        mediaItems,
        totalDuration,
        (progress) => {
          toast.loading(`Exporting... ${Math.round(progress)}%`, {
            id: 'export-progress'
          });
        }
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject.name.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss('export-progress');
      toast.success("Video exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.dismiss('export-progress');
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMint = () => {
    if (!activeProject) return;
    window.open(`/mint/${activeProject.id}`, "_blank");
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          <Image
            src="/logo.png"
            alt="SayWhat"
            width={24}
            height={24}
            className="rounded-sm"
          />
          <span className="font-semibold text-sm">SayWhat</span>
        </Link>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-2">
          <h1 className="font-medium text-sm truncate max-w-[200px]">
            {activeProject?.name || "Untitled Project"}
          </h1>
          <Badge variant="secondary" className="text-xs">
            Draft
          </Badge>
        </div>
      </div>

      {/* Center Section - Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="text"
          size="sm"
          onClick={toggle}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="text"
          size="sm"
          onClick={handleExport}
          disabled={isExporting || !activeProject || tracks.length === 0}
          className="text-xs font-medium"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-1" />
              Export
            </>
          )}
        </Button>

        {address && (
          <Button
            variant="default"
            size="sm"
            onClick={handleMint}
            className="text-xs font-medium bg-primary hover:bg-primary/90"
          >
            <Coins className="h-4 w-4 mr-1" />
            Mint
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="text" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Share2 className="h-4 w-4 mr-2" />
              Share Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Project Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
