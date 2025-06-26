"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download, Loader2 } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { HeaderBase } from "./header-base";
import { ProjectNameEditor } from "./editor/project-name-editor";
import { useState } from "react";
import { toast } from "sonner";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    toast.info("Starting export...", {
      description: "This may take a few moments.",
    });

    try {
      const { exportVideoWithCanvas } = await import(
        "@/lib/canvas-export-utils"
      );
      const exportedBlob = await exportVideoWithCanvas(
        tracks,
        mediaItems,
        getTotalDuration(),
        (progress) => {
          setExportProgress(progress);
        }
      );
      downloadBlob(exportedBlob, `${activeProject?.name || "video"}.webm`);
      toast.success("Export complete!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please check the console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format duration from seconds to MM:SS format
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const leftContent = (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        className="font-medium tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <ProjectNameEditor />
    </div>
  );

  const centerContent = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{formatDuration(getTotalDuration())}</span>
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <Button size="sm" onClick={handleExport} disabled={isExporting}>
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              Exporting... {exportProgress.toFixed(0)}%
            </span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span className="text-sm">Export</span>
          </>
        )}
      </Button>
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      centerContent={centerContent}
      rightContent={rightContent}
      className="bg-background border-b"
    />
  );
}
