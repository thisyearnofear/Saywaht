"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Video, 
  Layers, 
  Sparkles, 
  Zap,
  ChevronRight,
  Info
} from "@/lib/icons";
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
import { Progress } from "@/components/ui/progress";
import { useTextStore } from "@/stores/text-store";
import { cn } from "@/lib/utils";
import { loadFilecoinArchives } from "@/lib/filecoin-archives";

interface PreviewStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function PreviewStep({ data, updateData }: PreviewStepProps) {
  const { preferences } = useUserPreferencesStore();
  
  const { activeProject } = useProjectStore();
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { textElements } = useTextStore();

  const getAspectRatioClass = () => {
    switch (data.videoFormat) {
      case "portrait":
        return "aspect-[9/16]";
      case "square":
        return "aspect-square";
      case "landscape":
      default:
        return "aspect-video";
    }
  };

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
  const [filecoinMaxSizeMB, setFilecoinMaxSizeMB] = useState(8);
  const [archiveManifestUrl, setArchiveManifestUrl] = useState<string | null>(
    null
  );
  const [archiveCaptionsUrl, setArchiveCaptionsUrl] = useState<string | null>(
    null
  );

  const thumbnailSourceLabel = data.thumbnailSource
    ? {
        ai: "AI Generated",
        video_frame: "Video Frame",
        timeline_media: "Media Asset",
        upload: "Uploaded",
      }[data.thumbnailSource]
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadFilecoinCapacity = async () => {
      try {
        const res = await fetch("/api/filecoin/status");
        if (!res.ok) return;
        const status = await res.json();
        if (cancelled) return;
        if (status?.configured) {
          setFilecoinMaxSizeMB(254);
        } else {
          setFilecoinMaxSizeMB(8);
        }
      } catch {
        if (!cancelled) {
          setFilecoinMaxSizeMB(8);
        }
      }
    };

    loadFilecoinCapacity();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !data.coinName ||
      !data.coinSymbol ||
      !activeProject ||
      data.metadataUri ||
      isGeneratingMetadata
    )
      return;

    const generateMetadata = async () => {
      setIsGeneratingMetadata(true);
      setVideoUploadStatus("preparing");
      setVideoUploadError(null);

      try {
        // ENHANCEMENT: Check for existing Filecoin archive to avoid duplicate work
        // If the user just exported in the editor, we can reuse that asset
        const archives = loadFilecoinArchives();
        const recentArchive = archives.find(a => 
          a.projectId === activeProject.id && 
          (new Date().getTime() - new Date(a.createdAt).getTime() < 1000 * 60 * 30) // Within 30 mins
        );

        if (recentArchive) {
          console.log("♻️ Reusing recent Filecoin archive for minting:", recentArchive.videoUrl);
          setExportedVideoUrl(recentArchive.videoUrl);
          setArchiveManifestUrl(recentArchive.manifestUrl);
          setArchiveCaptionsUrl(recentArchive.transcriptUrl || null);
          setVideoUploadStatus("success");
          
          await generateMetadataWithVideo(
            recentArchive.videoUrl,
            recentArchive.manifestUrl,
            recentArchive.transcriptUrl
          );
          return;
        }

        const videoMediaIds = new Set(
          mediaItems.filter((item) => item.type === "video").map((item) => item.id)
        );
        const hasTimelineVideoClip = tracks.some(
          (track) =>
            track.type === "video" &&
            track.clips.some((clip) => videoMediaIds.has(clip.mediaId))
        );

        if (!hasTimelineVideoClip) {
          setVideoUploadStatus("failed");
          setVideoUploadError(
            "No timeline video clips were found for export. Go back to the editor and make sure your video clip is on the timeline, then try minting again."
          );
          await generateMetadataOnly();
          return;
        }

        const totalDuration = Math.max(getTotalDuration(), 5);

        const feasibility = await checkExportFeasibility(
          tracks,
          mediaItems,
          totalDuration,
          filecoinMaxSizeMB,
          data.videoFormat
        );

        setEstimatedSize(feasibility.estimatedSize);

        if (!feasibility.feasible) {
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

          if (feasibility.estimatedSize > filecoinMaxSizeMB * 1.25) {
            setVideoUploadStatus("warning");
            setVideoUploadError(feasibility.message);
            await generateMetadataOnly();
            return;
          }
        }

        setVideoUploadStatus("exporting");

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
              maxFileSizeMB: filecoinMaxSizeMB > 8 ? 220 : 7.5,
              onSizeEstimate: async () => true,
            }
          );

          setVideoUploadStatus("uploading");

          const captions = textElements
            .filter((item) => item.content?.trim().length > 0)
            .map((item) => ({
              startTime: item.startTime,
              endTime: item.endTime,
              text: item.content,
            }));

          const archive = await storageManager.archiveExportToFilecoin({
            projectName: activeProject?.name || data.coinName || "untitled",
            videoBlob,
            outputExt: "mp4",
            captions,
            metadata: {
              projectId: activeProject?.id || "",
              coinName: data.coinName,
            },
          });

          setExportedVideoUrl(archive.retrieval.videoUrl);
          setStorageProvider(archive.video.provider);
          setArchiveManifestUrl(archive.retrieval.manifestUrl);
          setArchiveCaptionsUrl(archive.retrieval.transcriptUrl || null);
          setVideoUploadStatus("success");

          await generateMetadataWithVideo(
            archive.retrieval.videoUrl,
            archive.retrieval.manifestUrl,
            archive.retrieval.transcriptUrl
          );
        } catch (error) {
          console.error("Failed to export/upload video:", error);

          if (error && typeof error === "object" && "type" in error) {
            const storageError = error as {
              type: StorageErrorType;
              message: string;
            };

            if (storageError.type === StorageErrorType.SIZE_EXCEEDED) {
              setVideoUploadStatus("warning");
              setVideoUploadError(
                `Video file exceeds storage limit. Please trim your video.`
              );
            } else {
              setVideoUploadStatus("failed");
              setVideoUploadError(
                storageManager.getErrorMessage(error as any) || "Upload failed"
              );
            }
          } else {
            setVideoUploadStatus("failed");
            setVideoUploadError("Export failed");
          }

          await generateMetadataOnly();
        }
      } catch (error) {
        console.error("Failed to generate metadata:", error);
        setIsGeneratingMetadata(false);
      }
    };

    async function generateMetadataWithVideo(
      videoUrl: string,
      manifestUrl?: string,
      captionsUrl?: string
    ) {
      try {
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
          }
        }

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
          archiveManifestUrl: manifestUrl,
          captionsUrl,
        });

        if (data.coinDescription) {
          metadata.description = data.coinDescription;
        }

        const uri = await uploadMetadataToIPFS(metadata);
        updateData({ 
          metadataUri: uri,
          thumbnail: finalThumbnailUrl || data.thumbnail
        });
        setIsGeneratingMetadata(false);
      } catch (error) {
        console.error("Failed to generate metadata with video:", error);
        setIsGeneratingMetadata(false);
      }
    }

    async function generateMetadataOnly() {
      try {
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
          archiveManifestUrl: archiveManifestUrl || undefined,
          captionsUrl: archiveCaptionsUrl || undefined,
        });

        if (data.coinDescription) {
          metadata.description = data.coinDescription;
        }

        const uri = await uploadMetadataToIPFS(metadata);
        updateData({ 
          metadataUri: uri,
          thumbnail: finalThumbnailUrl || data.thumbnail
        });
      } catch (error) {
        console.error("Failed to generate metadata without video:", error);
      } finally {
        setIsGeneratingMetadata(false);
      }
    }

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
    isGeneratingMetadata,
    updateData,
    tracks,
    mediaItems,
    getTotalDuration,
    activeProject,
    filecoinMaxSizeMB,
    textElements,
    archiveManifestUrl,
    archiveCaptionsUrl,
  ]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visual Preview */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-2">Video Composition</Label>
            <div className={cn("bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-border/50 ring-1 ring-white/10", getAspectRatioClass())}>
              <MintVideoPreview />
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border-border/40 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Asset Summary</h3>
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-widest">
                  {data.videoFormat}
                </Badge>
             </div>
             
             <div className="space-y-3">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground flex items-center gap-2">
                   <Video className="h-4 w-4" /> Export Status
                 </span>
                 <span className={cn(
                   "font-bold text-[10px] uppercase tracking-wider",
                   videoUploadStatus === 'success' ? "text-green-500" : "text-primary"
                 )}>
                   {videoUploadStatus}
                 </span>
               </div>
               
               {exportProgress && (
                 <div className="space-y-1.5">
                   <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/60">
                     <span>{exportProgress.message}</span>
                     <span>{Math.round(exportProgress.percentage)}%</span>
                   </div>
                   <Progress value={exportProgress.percentage} className="h-1 bg-muted/30" />
                 </div>
               )}

               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground flex items-center gap-2">
                   <Zap className="h-4 w-4" /> Metadata Status
                 </span>
                 <span className={cn(
                   "font-bold text-[10px] uppercase tracking-wider",
                   data.metadataUri ? "text-green-500" : "text-yellow-500"
                 )}>
                   {data.metadataUri ? "Ready" : "Preparing..."}
                 </span>
               </div>
             </div>
          </div>
        </div>

        {/* Coin Preview */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-2">Collector View</Label>
            <div className="glass rounded-[2rem] p-6 border-primary/20 bg-primary/5 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4">
                 <Badge className="bg-primary/20 text-primary border-none font-black tracking-tighter">
                   ${data.coinSymbol}
                 </Badge>
               </div>
               
               <div className="flex items-start gap-6">
                 <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border/50 shadow-lg shrink-0">
                    {data.thumbnail ? (
                      <Image src={data.thumbnail} alt="Thumbnail" fill className="object-cover" unoptimized={true} />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                 </div>
                 
                 <div className="space-y-1 pt-1">
                   <h3 className="text-2xl font-black tracking-tight">{data.coinName || "Untitled Coin"}</h3>
                   <p className="text-sm text-muted-foreground line-clamp-3">
                     {data.coinDescription || "No description provided."}
                   </p>
                 </div>
               </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="glass rounded-3xl p-6 border-border/40">
               <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-4">Launch Details</h3>
               <div className="space-y-3">
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Currency</span>
                   <span className="font-bold">{data.currency}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Protocol</span>
                   <span className="font-bold">Zora Protocol</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Network</span>
                   <span className="font-bold text-blue-500">Base</span>
                 </div>
               </div>
             </div>

             {showSizeWarning && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <p className="text-[11px] text-blue-500/80 leading-relaxed font-medium">
                    Smart optimization applied: Video quality adjusted to fit storage constraints while maintaining clarity.
                  </p>
                </div>
             )}

             {videoUploadError && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <p className="text-[11px] text-orange-500/80 leading-relaxed font-medium">
                    {videoUploadError}. You can still deploy with a thumbnail only.
                  </p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
