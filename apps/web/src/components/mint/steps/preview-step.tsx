"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle } from "@/lib/icons";
import Image from "next/image";
import { MintVideoPreview } from "../video-preview";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { generateCoinMetadata, uploadMetadataToIPFS } from "@/lib/metadata";
import { MintWizardData } from "../mint-wizard";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import {
  unifiedExport,
  ExportProgress,
  checkExportFeasibility,
} from "@/lib/unified-export";
import { storageManager, StorageErrorType } from "@/lib/storage-manager";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface PreviewStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function PreviewStep({ data, updateData }: PreviewStepProps) {
  const { preferences } = useUserPreferencesStore();
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [videoUploadStatus, setVideoUploadStatus] = useState<
    | "idle"
    | "preparing"
    | "exporting"
    | "uploading"
    | "success"
    | "warning"
    | "failed"
  >("idle");
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null
  );
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [storageProvider, setStorageProvider] = useState<string>("grove");
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [adjustedSettings, setAdjustedSettings] = useState<{
    quality: string;
    frameRate: number;
    videoBitrate?: number;
  } | null>(null);

  const { activeProject } = useProjectStore();
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  // Generate metadata when component mounts or data changes
  useEffect(() => {
    if (
      !data.coinName ||
      !data.coinSymbol ||
      !activeProject ||
      data.metadataUri
    )
      return;

    const generateMetadata = async () => {
      setIsGeneratingMetadata(true);
      setVideoUploadStatus("preparing");
      setVideoUploadError(null);

      try {
        // Step 1: Check export feasibility and estimate file size
        const totalDuration = Math.max(getTotalDuration(), 5); // Minimum 5 seconds
        console.log(`📏 Calculated timeline duration: ${totalDuration}s`);

        // Check if export is feasible within size limits
        const feasibility = await checkExportFeasibility(
          tracks,
          mediaItems,
          totalDuration,
          8, // Grove's 8MB limit
          data.videoFormat
        );

        setEstimatedSize(feasibility.estimatedSize);

        if (!feasibility.feasible) {
          // Show warning but continue with adjusted settings
          setShowSizeWarning(true);
          setAdjustedSettings(
            feasibility.recommendedSettings
              ? {
                  quality: feasibility.recommendedSettings.quality,
                  frameRate: feasibility.recommendedSettings.frameRate,
                  videoBitrate: feasibility.recommendedSettings.videoBitrate,
                }
              : null
          );

          console.warn(`⚠️ ${feasibility.message}`);

          // If size is way too large, show warning but don't attempt export
          if (feasibility.estimatedSize > 15) {
            // If over 15MB, probably won't work even with adjustments
            setVideoUploadStatus("warning");
            setVideoUploadError(feasibility.message);
            // Still generate metadata without video
            await generateMetadataOnly();
            return;
          }
        }

        // Step 2: Export timeline content as video
        setVideoUploadStatus("exporting");
        console.log("🎬 Exporting timeline content...");

        try {
          const videoBlob = await unifiedExport(
            tracks,
            mediaItems,
            totalDuration,
            (progress) => {
              setExportProgress(progress);
            },
            {
              format: data.videoFormat,
              quality: feasibility.recommendedSettings?.quality || "medium",
              includeAudio: true,
              outputFormat: "mp4",
              frameRate: feasibility.recommendedSettings?.frameRate || 30,
              videoBitrate: feasibility.recommendedSettings?.videoBitrate,
              maxFileSizeMB: 7.5, // Target 7.5MB to be safe with Grove's 8MB limit
              onSizeEstimate: async (estimatedSize, maxSize) => {
                // Always continue, but with adjusted settings
                return true;
              },
            }
          );

          // Step 3: Upload video using storage manager
          setVideoUploadStatus("uploading");

          const videoFile = new File(
            [videoBlob],
            `${data.coinName.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
            { type: "video/mp4" }
          );

          const uploadResult = await storageManager.uploadFile(videoFile, {
            preferredProvider: "grove",
            allowFallback: true,
            onProgress: (progress) => {
              setExportProgress({
                phase: "finalizing",
                percentage: progress,
                message: `Uploading to ${storageProvider}... ${Math.round(progress)}%`,
              });
            },
            onProviderFallback: async (from, to, reason) => {
              setStorageProvider(to);
              toast.info(`Switching to ${to} storage: ${reason}`);
              return true; // Allow fallback
            },
          });

          setExportedVideoUrl(uploadResult.url);
          setStorageProvider(uploadResult.provider);
          setVideoUploadStatus("success");

          // Step 4: Generate metadata with the uploaded video
          await generateMetadataWithVideo(uploadResult.url);
        } catch (error) {
          console.error("Failed to export/upload video:", error);

          // Handle storage-specific errors
          if (error && typeof error === "object" && "type" in error) {
            const storageError = error as {
              type: StorageErrorType;
              message: string;
            };

            if (storageError.type === StorageErrorType.SIZE_EXCEEDED) {
              setVideoUploadStatus("warning");
              setVideoUploadError(
                `Video file exceeds storage limit. Please trim your video or use lower quality settings.`
              );
            } else {
              setVideoUploadStatus("failed");
              setVideoUploadError(
                storageManager.getErrorMessage(error as any) ||
                  `Failed to upload video: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
          } else {
            setVideoUploadStatus("failed");
            setVideoUploadError(
              `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }

          // Still generate metadata without video
          await generateMetadataOnly();
        }
      } catch (error) {
        console.error("Failed to generate metadata:", error);
        setIsGeneratingMetadata(false);
      }
    };

    // Generate metadata with video URL
    async function generateMetadataWithVideo(videoUrl: string) {
      try {
        // Prepare thumbnail for metadata
        let finalThumbnailUrl = data.thumbnail;
        if (data.thumbnail && data.thumbnail.startsWith("data:")) {
          try {
            const result = await storageManager.uploadFile(
              dataURLtoFile(data.thumbnail, "thumbnail.png"),
              { preferredProvider: "grove" }
            );
            finalThumbnailUrl = result.ipfsUrl || result.url;
            console.log("📸 Thumbnail uploaded:", finalThumbnailUrl);
          } catch (error) {
            console.error("Failed to upload thumbnail:", error);
            // Continue with data URL if upload fails
          }
        }

        // Create modified mediaItems with exported video
        const modifiedMediaItems = [...mediaItems];
        const exportedVideoItem = {
          id: crypto.randomUUID(),
          name: `${data.coinName} - Exported`,
          url: videoUrl,
          type: "video" as const,
          size: 0,
          duration: getTotalDuration(),
          aspectRatio: 16 / 9,
          thumbnailUrl: finalThumbnailUrl || undefined,
        };
        modifiedMediaItems.unshift(exportedVideoItem);

        const metadata = await generateCoinMetadata({
          coinName: data.coinName,
          coinSymbol: data.coinSymbol,
          creatorAddress: "0x0000000000000000000000000000000000000000",
          mediaItems: modifiedMediaItems,
          tracks,
          projectId: activeProject?.id || "",
          exportedVideoUrl: videoUrl,
          thumbnailUrl: finalThumbnailUrl || undefined,
        });

        // Add custom description if provided
        if (data.coinDescription) {
          metadata.description = data.coinDescription;
        }

        const uri = await uploadMetadataToIPFS(metadata);
        updateData({ metadataUri: uri });
        setIsGeneratingMetadata(false);
      } catch (error) {
        console.error("Failed to generate metadata with video:", error);
        setIsGeneratingMetadata(false);
      }
    }

    // Generate metadata without video (fallback)
    async function generateMetadataOnly() {
      try {
        // Prepare thumbnail for metadata
        let finalThumbnailUrl = data.thumbnail;
        if (data.thumbnail && data.thumbnail.startsWith("data:")) {
          try {
            const result = await storageManager.uploadFile(
              dataURLtoFile(data.thumbnail, "thumbnail.png"),
              { preferredProvider: "grove" }
            );
            finalThumbnailUrl = result.ipfsUrl || result.url;
          } catch (error) {
            console.error("Failed to upload thumbnail:", error);
            // Continue with data URL if upload fails
          }
        }

        const metadata = await generateCoinMetadata({
          coinName: data.coinName,
          coinSymbol: data.coinSymbol,
          creatorAddress: "0x0000000000000000000000000000000000000000",
          mediaItems: mediaItems,
          tracks,
          projectId: activeProject?.id || "",
          thumbnailUrl: finalThumbnailUrl || undefined,
        });

        // Add custom description if provided
        if (data.coinDescription) {
          metadata.description = data.coinDescription;
        }

        const uri = await uploadMetadataToIPFS(metadata);
        updateData({ metadataUri: uri });
      } catch (error) {
        console.error("Failed to generate metadata without video:", error);
      } finally {
        setIsGeneratingMetadata(false);
      }
    }

    // Convert data URL to File object
    function dataURLtoFile(dataurl: string, filename: string): File {
      const arr = dataurl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    }

    const timeout = setTimeout(generateMetadata, 500);
    return () => clearTimeout(timeout);
  }, [
    data.coinName,
    data.coinSymbol,
    data.coinDescription,
    data.videoFormat,
    activeProject?.id,
    data.metadataUri,
    data.thumbnail,
    updateData,
    tracks,
    mediaItems,
    getTotalDuration,
    activeProject,
    storageProvider,
  ]);

  // Render progress indicator
  function renderProgressIndicator() {
    if (!exportProgress) return null;

    return (
      <div className="space-y-2 mt-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{exportProgress.message}</span>
          <span>{Math.round(exportProgress.percentage)}%</span>
        </div>
        <Progress value={exportProgress.percentage} className="h-1" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coin Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coin Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review how your coin will appear to traders and collectors
          </p>
          {preferences.hasCreatorCoin !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Backing Currency:</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={preferences.hasCreatorCoin ? "default" : "secondary"}
                      className="text-xs cursor-help"
                    >
                      {preferences.hasCreatorCoin ? "Creator Coin (preferred)" : "ZORA"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {preferences.hasCreatorCoin
                      ? "Uses your Creator Coin for markets. Aligns rewards and reduces slippage risk."
                      : "Uses ZORA for markets. Connect or set up a Creator Coin to prefer creator-backed markets."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thumbnail */}
            <div className="space-y-3">
              <h4 className="font-medium">Thumbnail</h4>
              {data.thumbnail ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={
                      data.thumbnail.startsWith("ipfs://")
                        ? `https://ipfs.io/ipfs/${data.thumbnail.slice(7)}`
                        : data.thumbnail.startsWith("lens://")
                          ? `https://api.grove.storage/${data.thumbnail.slice(7)}`
                          : data.thumbnail
                    }
                    alt="Coin thumbnail"
                    fill
                    className="object-cover"
                    unoptimized={true}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                  <p className="text-sm text-muted-foreground">No thumbnail</p>
                </div>
              )}
            </div>

            {/* Coin Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Coin Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">
                      {data.coinName || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Symbol:
                    </span>
                    <Badge variant="secondary">
                      {data.coinSymbol || "Not set"}
                    </Badge>
                  </div>
                  {data.coinDescription && (
                    <div className="pt-2">
                      <span className="text-sm text-muted-foreground">
                        Description:
                      </span>
                      <p className="text-sm mt-1">{data.coinDescription}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Export Status</h4>

                {/* Video Export Status */}
                <div className="flex items-center gap-2 mb-2">
                  {videoUploadStatus === "idle" ? (
                    <>
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                      <span className="text-sm text-muted-foreground">
                        Waiting to start...
                      </span>
                    </>
                  ) : videoUploadStatus === "preparing" ? (
                    <>
                      <div className="w-4 h-4 animate-spin text-primary">
                        <Loader2 />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Preparing export...
                      </span>
                    </>
                  ) : videoUploadStatus === "exporting" ? (
                    <>
                      <div className="w-4 h-4 animate-spin text-primary">
                        <Loader2 />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {exportProgress?.message || "Exporting video..."}
                        </span>
                        {renderProgressIndicator()}
                      </div>
                    </>
                  ) : videoUploadStatus === "uploading" ? (
                    <>
                      <div className="w-4 h-4 animate-spin text-primary">
                        <Loader2 />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          Uploading to {storageProvider}...
                        </span>
                        {renderProgressIndicator()}
                      </div>
                    </>
                  ) : videoUploadStatus === "success" ? (
                    <>
                      <div className="w-4 h-4 text-green-500">
                        <CheckCircle />
                      </div>
                      <span className="text-sm text-green-600">
                        Video uploaded to {storageProvider}
                      </span>
                    </>
                  ) : videoUploadStatus === "warning" ? (
                    <>
                      <div className="w-4 h-4 text-orange-500">
                        <AlertCircle />
                      </div>
                      <span className="text-sm text-orange-600">
                        Video processing issue
                      </span>
                    </>
                  ) : videoUploadStatus === "failed" ? (
                    <>
                      <div className="w-4 h-4 text-red-500">
                        <AlertCircle />
                      </div>
                      <span className="text-sm text-red-600">
                        Video export failed
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Metadata Status */}
                <div className="flex items-center gap-2">
                  {isGeneratingMetadata ? (
                    <>
                      <div className="w-4 h-4 animate-spin text-primary">
                        <Loader2 />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Generating metadata...
                      </span>
                    </>
                  ) : data.metadataUri ? (
                    <>
                      <div className="w-4 h-4 text-green-500">
                        <CheckCircle />
                      </div>
                      <span className="text-sm text-green-600">
                        Metadata ready
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 text-yellow-500">
                        <AlertCircle />
                      </div>
                      <span className="text-sm text-yellow-600">
                        Preparing metadata...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Video Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            The video content that will be associated with your coin
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted aspect-video rounded-lg overflow-hidden">
            <MintVideoPreview />
          </div>
        </CardContent>
      </Card>

      {/* Size Warning */}
      {showSizeWarning && estimatedSize && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-blue-600 mt-0.5">
                <AlertCircle />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Video Size Optimization
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your video has an estimated size of {estimatedSize.toFixed(2)}
                  MB, which exceeds the 8MB limit for Grove storage. We&apos;ve
                  automatically adjusted the export settings for optimal quality
                  within size constraints.
                </p>
                {adjustedSettings && (
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Adjusted settings:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Quality: {adjustedSettings.quality}</li>
                      <li>Frame rate: {adjustedSettings.frameRate} fps</li>
                      {adjustedSettings.videoBitrate && (
                        <li>
                          Bitrate:{" "}
                          {Math.round(adjustedSettings.videoBitrate / 1000)}{" "}
                          Kbps
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Upload Warning */}
      {videoUploadError && (
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-orange-600 mt-0.5">
                <AlertCircle />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Video Processing Issue
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {videoUploadError}
                </p>
                {videoUploadStatus === "warning" && (
                  <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                    <p className="font-medium">Suggested solutions:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Trim your video to reduce file size</li>
                      <li>Use a lower quality export setting</li>
                      <li>Split your content into multiple shorter videos</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card
        className={
          videoUploadError
            ? "bg-orange-50/50 dark:bg-orange-950/10"
            : "bg-muted/50"
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 mt-0.5 ${videoUploadError ? "text-orange-600" : "text-primary"}`}
            >
              <AlertCircle />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {videoUploadError
                  ? "Deploy with Thumbnail Only?"
                  : "Ready to Deploy?"}
              </p>
              <p className="text-xs text-muted-foreground">
                {videoUploadError
                  ? "Your coin will deploy with the thumbnail only. You can add video content later or try a different storage solution."
                  : "You&apos;ll earn from trading activity and can share it across social platforms."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
