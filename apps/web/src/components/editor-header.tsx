"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useTextStore } from "@/stores/text-store";
import { useCanvasStore, canvasPresets } from "@/stores/canvas-store";
import { useEditorStore } from "@/stores/editor-store";
import { badgeVariants } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  ZoomIn, 
  ZoomOut, 
  Play, 
  Pause, 
  Download, 
  Zap, 
  Video, 
  MoreHorizontal, 
  ChevronLeft,
  Share2,
  Settings,
  Trash2,
  ExternalLink,
  HardDrive,
  Loader2
} from "@/lib/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { getExportErrorMessage } from "@/lib/export-error-handler";
import { isBackendExportAvailable } from "@/lib/backend-export";
import { ExportMethod } from "@/lib/canvas-export-utils";
import { storageManager } from "@/lib/storage-manager";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";
import { saveFilecoinArchive } from "@/lib/filecoin-archives";
import { FilecoinArchivesDialog } from "@/components/editor/filecoin-archives-dialog";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { isPlaying, toggle } = usePlaybackStore();
  const { address } = useAccount();
  const { getFormat, canvasSize, setCanvasPreset } = useCanvasStore();
  const { previewZoom, setPreviewZoom, resetPreviewZoom } = useEditorStore();
  const { isFarcasterMiniApp } = useFarcasterContext();
  const { shareToFarcaster, isSharing } = useFarcasterShare();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { textElements } = useTextStore();

  useEffect(() => {
    isBackendExportAvailable().then(setBackendAvailable);
  }, []);

  const handleExport = async (method: ExportMethod = "auto") => {
    if (!activeProject || tracks.length === 0) {
      toast.error("No content to export");
      return;
    }

    setIsExporting(true);
    try {
      const totalDuration = Math.max(getTotalDuration(), 5);
      const { exportVideo } = await import("@/lib/canvas-export-utils");

      const blob = await exportVideo(
        tracks,
        mediaItems,
        totalDuration,
        (progress) => {
          toast.loading(`Exporting... ${Math.round(progress)}%`, {
            id: "export-progress",
          });
        },
        {
          format: getFormat(),
          quality: "medium",
          includeAudio: true,
          method: method,
          outputFormat: "mp4",
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject.name.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const captions = textElements
        .filter((el) => el.content.trim().length > 0)
        .map((el) => ({
          startTime: el.startTime,
          endTime: el.endTime,
          text: el.content,
        }))
        .sort((a, b) => a.startTime - b.startTime);

      const shouldArchiveToFilecoin = blob.size > 8 * 1024 * 1024 || captions.length > 0;

      if (shouldArchiveToFilecoin) {
        toast.loading("Archiving to Filecoin...", { id: "filecoin-archive" });
        try {
          const archiveResult = await storageManager.archiveExportToFilecoin({
            projectName: activeProject.name,
            videoBlob: blob,
            outputExt: "mp4",
            captions,
            metadata: {
              exportMethod: method,
              durationSeconds: totalDuration,
              captionCount: captions.length,
            },
          });

          saveFilecoinArchive({
            projectId: activeProject.id,
            projectName: activeProject.name,
            createdAt: new Date().toISOString(),
            ...archiveResult.retrieval,
          });

          toast.dismiss("filecoin-archive");
          toast.success("Archived on Filecoin");
        } catch (archiveError) {
          toast.dismiss("filecoin-archive");
          toast.error("Filecoin archive failed");
        }
      }

      toast.dismiss("export-progress");
      toast.success("Export successful!");
    } catch (error) {
      toast.dismiss("export-progress");
      toast.error(getExportErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeploy = async () => {
    if (!activeProject || tracks.length === 0) return;
    setIsDeploying(true);
    try {
      toast.loading("Preparing for launch...", { id: "deploy-progress" });
      const projectData = { project: activeProject, tracks, mediaItems };
      const uploadPromise = storageManager.exportProjectData(projectData);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000));
      await Promise.race([uploadPromise, timeoutPromise]);
      toast.dismiss("deploy-progress");
      window.location.href = `/mint/${activeProject.id}`;
    } catch (error) {
      toast.dismiss("deploy-progress");
      toast.error("Preparation failed. Try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <header className="h-16 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-all p-1.5 rounded-xl hover:bg-muted/50">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <Image src="/logo.png" alt="saywaht" width={24} height={24} className="rounded-lg shadow-sm" />
        </Link>

        <div className="hidden sm:flex flex-col">
          <h1 className="font-black text-xs uppercase tracking-tighter truncate max-w-[120px] leading-tight">
            {activeProject?.name || "Untitled"}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Draft</span>
          </div>
        </div>
      </div>

      {/* Center Section: Main Controls — hidden on mobile (preview has its own play button) */}
      <div className="hidden sm:flex items-center bg-muted/30 p-1 rounded-2xl border border-border/40">
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setPreviewZoom(previewZoom - 0.25)} disabled={previewZoom <= 0.25} className="h-8 w-8 rounded-xl">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="sm" onClick={resetPreviewZoom} className="h-8 px-2 text-[10px] font-black tracking-widest rounded-xl">
              {Math.round(previewZoom * 100)}%
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setPreviewZoom(previewZoom + 0.25)} disabled={previewZoom >= 3} className="h-8 w-8 rounded-xl">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <Button variant="ghost" size="icon" onClick={toggle} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </Button>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        {/* Desktop-only Canvas Settings */}
        <div className="hidden lg:flex items-center gap-2 mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/50 text-[10px] font-black uppercase tracking-widest px-3">
                <Video className="h-3 w-3 mr-2 text-primary" />
                {canvasPresets.find(p => p.size.width === canvasSize.width && p.size.height === canvasSize.height)?.name || "Custom"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
              {canvasPresets.map((preset) => (
                <DropdownMenuItem key={preset.name} onClick={() => setCanvasPreset(preset)} className="rounded-xl p-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{preset.size.width} × {preset.size.height}px</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary Action Button — hidden on mobile (moved into dropdown) */}
        {isFarcasterMiniApp ? (
          <Button onClick={shareToFarcaster} disabled={isSharing || !activeProject} className="hidden sm:flex h-10 rounded-xl px-5 font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700">
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
            Share
          </Button>
        ) : (
          <Button onClick={handleDeploy} disabled={isDeploying || !activeProject} className="hidden sm:flex h-10 rounded-xl px-5 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
            {isDeploying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2 fill-current" />}
            Launch
          </Button>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
            {/* Mobile-only: Deploy action (hidden on sm+) */}
            {isFarcasterMiniApp ? (
              <DropdownMenuItem onClick={shareToFarcaster} disabled={isSharing || !activeProject} className="sm:hidden rounded-xl p-3 mb-1">
                <Share2 className="h-4 w-4 mr-3 text-purple-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Share to Farcaster</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Post your video</span>
                </div>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleDeploy} disabled={isDeploying || !activeProject} className="sm:hidden rounded-xl p-3 mb-1">
                <Zap className="h-4 w-4 mr-3 text-primary" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Deploy</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Launch & mint your video</span>
                </div>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="sm:hidden my-1" />

            <DropdownMenuItem onClick={() => handleExport("auto")} className="rounded-xl p-3">
              <Download className="h-4 w-4 mr-3 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Download MP4</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Optimized export</span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => window.location.href = "/templates"} className="rounded-xl p-3">
              <Video className="h-4 w-4 mr-3 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Templates</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Switch template</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2" />
            
            {/* Zoom controls for small screens */}
            <div className="px-2 py-1.5 sm:hidden">
               <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Zoom</span>
               <div className="flex items-center gap-2 mt-2">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setPreviewZoom(previewZoom - 0.25)} 
                   disabled={previewZoom <= 0.25}
                   className="h-8 w-8 p-0 rounded-lg"
                 >
                   <ZoomOut className="h-3.5 w-3.5" />
                 </Button>
                 <span className="text-xs font-mono min-w-[3rem] text-center">{Math.round(previewZoom * 100)}%</span>
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setPreviewZoom(previewZoom + 0.25)} 
                   disabled={previewZoom >= 3}
                   className="h-8 w-8 p-0 rounded-lg"
                 >
                   <ZoomIn className="h-3.5 w-3.5" />
                 </Button>
               </div>
            </div>

            <DropdownMenuSeparator className="my-2 sm:hidden" />
            
            <div className="px-2 py-1.5 lg:hidden">
               <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Canvas Format</span>
               <div className="grid grid-cols-2 gap-1 mt-2">
                  {canvasPresets.slice(0, 4).map(p => (
                    <Button key={p.name} variant="outline" size="sm" onClick={() => setCanvasPreset(p)} 
                      className={cn("h-8 text-[10px] rounded-lg", canvasSize.width === p.size.width && "border-primary text-primary bg-primary/5")}>
                      {p.name}
                    </Button>
                  ))}
               </div>
            </div>

            <DropdownMenuSeparator className="my-2 lg:hidden" />

            <DropdownMenuItem className="rounded-xl p-3">
              <Settings className="h-4 w-4 mr-3" />
              <span className="font-bold text-sm">Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="rounded-xl p-3 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-3" />
              <span className="font-bold text-sm">Delete Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
