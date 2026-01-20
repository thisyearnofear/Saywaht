"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useCanvasStore } from "@/stores/canvas-store";
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
import { getExportErrorMessage } from "@/lib/export-error-handler";
import { isBackendExportAvailable } from "@/lib/backend-export";
import { ExportMethod } from "@/lib/canvas-export-utils";
import { storageManager } from "@/lib/storage-manager";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { isPlaying, toggle } = usePlaybackStore();
  const { address } = useAccount();
  const { getFormat } = useCanvasStore();
  const { isFarcasterMiniApp } = useFarcasterContext();
  const { shareToFarcaster, isSharing } = useFarcasterShare();

  // Use imported useState hook from hooks-provider
  const [isExporting, setIsExporting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  // Check backend availability on mount
  useEffect(() => {
    isBackendExportAvailable().then(setBackendAvailable);
  }, []);

  const handleExport = async (method: ExportMethod = "auto") => {
    if (!activeProject || tracks.length === 0) {
      toast.error("No content to export");
      return;
    }

    // CLEAN: Simplified method messages
    const methodMessages = {
      auto: "✨ Smart Export - choosing the best method for you!",
      backend: "⚡ Server Export - maximum quality and speed!",
      offline: "🎯 Offline Export - works on any device!",
    };

    if (method !== "auto") {
      toast.success(methodMessages[method] || "Starting export...");
    }

    setIsExporting(true);
    try {
      // Calculate total duration from timeline using proper timeline calculation
      const totalDuration = Math.max(getTotalDuration(), 5); // Minimum 5 seconds
      console.log(`📏 Export duration: ${totalDuration}s`);

      // ENHANCEMENT: Use consolidated export function
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

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject.name.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss("export-progress");
      toast.success("Video exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.dismiss("export-progress");

      // Use centralized error handler
      const errorMessage = getExportErrorMessage(error);

      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: "View Diagnostics",
          onClick: () => {
            // CONSOLIDATION: Use new diagnostics from monitoring
            console.log("=== Export Diagnostics ===");
            const { getExportDiagnostics } = require("@/lib/monitoring");
            console.log(getExportDiagnostics());
          },
        },
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeploy = async () => {
    if (!activeProject) {
      toast.error("No project to deploy");
      return;
    }

    if (tracks.length === 0) {
      toast.error("Add content to your project before deploying");
      return;
    }

    setIsDeploying(true);

    try {
      toast.loading("Preparing project for deployment...", { id: "deploy-progress" });

      // Export project data using consolidated storage manager method
      const projectData = {
        project: activeProject,
        tracks: tracks,
        mediaItems: mediaItems,
      };

      toast.loading("Uploading project data to IPFS...", { id: "deploy-progress" });

      // Add timeout and better error handling for storage upload
      const uploadPromise = storageManager.exportProjectData(projectData, {
        onProgress: (progress) => {
          toast.loading(`Uploading to IPFS... ${Math.round(progress)}%`, { id: "deploy-progress" });
        }
      });

      // Add 60 second timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000);
      });

      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;

      toast.dismiss("deploy-progress");
      toast.success("🚀 Project ready for deployment!");

      // Open mint page with project data URL
      const mintUrl = `/mint/${activeProject.id}?dataUrl=${encodeURIComponent(uploadResult.url)}`;
      window.open(mintUrl, "_blank");

    } catch (error) {
      console.error("Deploy preparation failed:", error);
      toast.dismiss("deploy-progress");

      // Provide more helpful error messages
      let errorMessage = "Failed to prepare project for deployment";

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "Upload timed out. Please try again with a smaller project or check your internet connection.";
        } else if (error.message.includes('Grove')) {
          errorMessage = "Storage service temporarily unavailable. Please try again in a few moments.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes('size') || error.message.includes('limit')) {
          errorMessage = "Project is too large for deployment. Please reduce the number of media files.";
        } else {
          errorMessage = `Deployment failed: ${error.message}`;
        }
      }

      toast.error(errorMessage, {
        duration: 8000,
        action: {
          label: "Try Again",
          onClick: () => handleDeploy(),
        },
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-sm">←</span>
          <Image
            src="/logo.png"
            alt="saywaht"
            width={24}
            height={24}
            className="rounded-sm"
          />
          <span className="font-semibold text-sm">saywaht</span>
        </Link>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-2">
          <h1 className="font-medium text-sm truncate max-w-[200px]">
            {activeProject?.name || "Untitled Project"}
          </h1>
          <div
            className={cn(badgeVariants({ variant: "secondary" }), "text-xs")}
          >
            Draft
          </div>
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
            <span className="text-sm">⏸</span>
          ) : (
            <span className="text-sm">▶</span>
          )}
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <Button
            variant="text"
            size="sm"
            onClick={() => handleExport()}
            disabled={isExporting || !activeProject || tracks.length === 0}
            className="text-xs font-medium rounded-r-none border-r-0"
          >
            {isSharing ? (
              <>
                <span className="inline-block h-4 w-4 mr-1 animate-spin">
                  ⟳
                </span>
                Exporting...
              </>
            ) : (
              <>
                <span className="inline-block h-4 w-4 mr-1">⬇️</span>
                Export
                {backendAvailable && (
                  <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">
                    Pro
                  </span>
                )}
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="text"
                size="sm"
                disabled={isExporting || !activeProject || tracks.length === 0}
                className="text-xs font-medium rounded-l-none border-l-0 px-1 w-6"
              >
                <span className="text-xs">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExport("auto")}>
                <span className="inline-block h-4 w-4 mr-2">✨</span>
                <div className="flex flex-col">
                  <span className="font-medium">Smart Export</span>
                  <span className="text-xs text-muted-foreground">
                    Recommended • Chooses best method for you
                  </span>
                </div>
              </DropdownMenuItem>
              {backendAvailable && (
                <DropdownMenuItem onClick={() => handleExport("backend")}>
                  <span className="inline-block h-4 w-4 mr-2">⚡</span>
                  <div className="flex flex-col">
                    <span className="font-medium">Server Export</span>
                    <span className="text-xs text-muted-foreground">
                      Premium • Fastest & highest quality
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleExport("offline")}>
                <span className="inline-block h-4 w-4 mr-2">🎯</span>
                <div className="flex flex-col">
                  <span className="font-medium">Offline Export</span>
                  <span className="text-xs text-muted-foreground">
                    Reliable • Works on any device
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {address && !isFarcasterMiniApp && (
          <Button
            variant="default"
            size="sm"
            onClick={handleDeploy}
            disabled={isDeploying || !activeProject || tracks.length === 0}
            className="text-xs font-medium bg-primary hover:bg-primary/90"
          >
            {isDeploying ? (
              <>
                <span className="inline-block h-4 w-4 mr-1 animate-spin">⟳</span>
                Deploying...
              </>
            ) : (
              <>
                <span className="inline-block h-4 w-4 mr-1">🪙</span>
                Deploy
              </>
            )}
          </Button>
        )}

        {isFarcasterMiniApp && (
          <Button
            variant="default"
            size="sm"
            onClick={shareToFarcaster}
            disabled={isSharing || !activeProject || tracks.length === 0}
            className="text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSharing ? (
              <>
                <span className="inline-block h-4 w-4 mr-1 animate-spin">⟳</span>
                Sharing...
              </>
            ) : (
              <>
                <span className="inline-block h-4 w-4 mr-1">🚀</span>
                Share
              </>
            )}
          </Button>
        )}

        <Button
          variant="text"
          size="sm"
          onClick={() => window.location.href = "/templates"}
          className="text-xs font-medium"
        >
          <span className="inline-block h-4 w-4 mr-1">🎬</span>
          Templates
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="text" size="sm" className="h-8 w-8 p-0">
              <span className="text-sm">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <span className="inline-block h-4 w-4 mr-2">↗️</span>
              Share Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span className="inline-block h-4 w-4 mr-2">⚙️</span>
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
