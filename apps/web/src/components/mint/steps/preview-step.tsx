"use client";

import { useState, useEffect } from "@/lib/hooks-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuLoader as Loader2 } from "react-icons/lu";
import Image from "next/image";
import { MintVideoPreview } from "../video-preview";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { generateCoinMetadata, uploadMetadataToIPFS } from "@/lib/metadata";
import { MintWizardData } from "../mint-wizard";

interface PreviewStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function PreviewStep({ data, updateData }: PreviewStepProps) {
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [videoUploadStatus, setVideoUploadStatus] = useState<
    "pending" | "success" | "failed" | "size_exceeded"
  >("pending");
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const { activeProject } = useProjectStore();
  const { tracks } = useTimelineStore();
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
      setVideoUploadStatus("pending");
      setVideoUploadError(null);

      try {
        // Step 1: Export timeline content as video
        console.log("🎬 Exporting timeline content...");
        let exportedVideoUrl = "";

        if (tracks.length > 0 && mediaItems.length > 0) {
          try {
            // Calculate total duration from timeline
            const totalDuration = Math.max(
              ...tracks.flatMap((track) =>
                track.clips.map((clip) => clip.startTime + clip.duration)
              ),
              5 // Minimum 5 seconds
            );

            // Export video using canvas with selected format
            const { exportVideoWithCanvas } = await import(
              "@/lib/canvas-export-utils"
            );
            const videoBlob = await exportVideoWithCanvas(
              tracks,
              mediaItems,
              totalDuration,
              (progress) => {
                console.log(`Export progress: ${Math.round(progress)}%`);
              },
              {
                format: data.videoFormat,
                quality: "medium",
              }
            );

            // Check file size before upload (Grove limit is 8MB)
            const fileSizeMB = videoBlob.size / (1024 * 1024);
            console.log(`📊 Video file size: ${fileSizeMB.toFixed(2)}MB`);

            if (fileSizeMB > 8) {
              console.warn(
                `⚠️ Video file (${fileSizeMB.toFixed(2)}MB) exceeds Grove's 8MB limit`
              );
              setVideoUploadStatus("size_exceeded");
              setVideoUploadError(
                `Video file is ${fileSizeMB.toFixed(2)}MB, but Grove's limit is 8MB. Please trim your video or use a different storage option.`
              );
              // Continue without video upload but show warning
            } else {
              // Upload exported video to Grove
              const { groveStorage } = await import("@/lib/grove-storage");
              const videoFile = new File(
                [videoBlob],
                `${data.coinName.replace(/[^a-zA-Z0-9]/g, "_")}.webm`,
                {
                  type: "video/webm",
                }
              );

              console.log("📤 Uploading exported video to Grove...");
              const videoUploadResult =
                await groveStorage.uploadFile(videoFile);
              exportedVideoUrl = videoUploadResult.gatewayUrl;
              console.log("✅ Video uploaded to Grove:", exportedVideoUrl);
              setVideoUploadStatus("success");
            }
          } catch (error) {
            console.error("Failed to export/upload video:", error);
            setVideoUploadStatus("failed");

            // Check if it's a Grove size limit error
            if (error instanceof Error && error.message.includes("8.00MB")) {
              setVideoUploadError(
                "Video file exceeds Grove's 8MB limit. Please trim your video or consider using a different storage option."
              );
              setVideoUploadStatus("size_exceeded");
            } else {
              setVideoUploadError(
                `Failed to upload video: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
            // Continue without video if export fails
          }
        }

        // Step 2: Upload thumbnail to Grove if it's a data URL
        let finalThumbnailUrl = data.thumbnail;
        let thumbnailDisplayUrl = data.thumbnail; // Keep original for display
        if (data.thumbnail && data.thumbnail.startsWith("data:")) {
          try {
            const { uploadThumbnailToGrove } = await import(
              "@/lib/thumbnail-upload"
            );
            const result = await uploadThumbnailToGrove(data.thumbnail);
            finalThumbnailUrl = result.metadataUrl; // IPFS URL for metadata
            thumbnailDisplayUrl = result.displayUrl; // Gateway URL for display
            console.log("📸 Thumbnail uploaded to Grove:", finalThumbnailUrl);

            // Update the wizard data with the display URL (so user can still see it)
            updateData({ thumbnail: thumbnailDisplayUrl });
          } catch (error) {
            console.error("Failed to upload thumbnail to Grove:", error);
            // Continue with data URL if Grove upload fails
          }
        }

        // Step 3: Create modified mediaItems with exported video and custom thumbnail
        const modifiedMediaItems = [...mediaItems];

        // Add the exported video as the primary media item
        if (exportedVideoUrl) {
          const exportedVideoItem = {
            id: crypto.randomUUID(),
            name: `${data.coinName} - Exported`,
            url: exportedVideoUrl,
            type: "video" as const,
            size: 0, // Size not critical for metadata
            duration: 0, // Duration not critical for metadata
            aspectRatio: 16 / 9,
            isGrove: true,
            thumbnailUrl: thumbnailDisplayUrl || undefined,
          };

          // Insert at the beginning to make it the primary media
          modifiedMediaItems.unshift(exportedVideoItem);
        } else if (thumbnailDisplayUrl) {
          // If no exported video, at least update the first video with custom thumbnail
          const firstVideoIndex = modifiedMediaItems.findIndex(
            (item) => item.type === "video"
          );
          if (firstVideoIndex >= 0) {
            modifiedMediaItems[firstVideoIndex] = {
              ...modifiedMediaItems[firstVideoIndex],
              thumbnailUrl: thumbnailDisplayUrl,
            };
          }
        }

        const metadata = await generateCoinMetadata({
          coinName: data.coinName,
          coinSymbol: data.coinSymbol,
          creatorAddress: "0x0000000000000000000000000000000000000000", // Will be set during deploy
          mediaItems: modifiedMediaItems,
          tracks,
          projectId: activeProject.id,
          exportedVideoUrl: exportedVideoUrl || undefined, // Include the exported video URL
        });

        // Add custom description if provided
        if (data.coinDescription) {
          metadata.description = data.coinDescription;
        }

        const uri = await uploadMetadataToIPFS(metadata);
        updateData({ metadataUri: uri });
      } catch (error) {
        console.error("Failed to generate metadata:", error);
      } finally {
        setIsGeneratingMetadata(false);
      }
    };

    const timeout = setTimeout(generateMetadata, 500);
    return () => clearTimeout(timeout);
  }, [
    data.coinName,
    data.coinSymbol,
    data.coinDescription,
    data.thumbnail,
    data.videoFormat,
    activeProject,
    mediaItems,
    tracks,
    data.metadataUri,
    updateData,
  ]);

  return (
    <div className="space-y-6">
      {/* Coin Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coin Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review how your coin will appear to traders and collectors
          </p>
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
                <h4 className="font-medium mb-2">Upload Status</h4>

                {/* Video Upload Status */}
                <div className="flex items-center gap-2 mb-2">
                  {videoUploadStatus === "pending" ? (
                    <>
                      <div className="w-4 h-4 animate-spin">
                        <Loader2 />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Uploading video...
                      </span>
                    </>
                  ) : videoUploadStatus === "success" ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-600">
                        Video uploaded
                      </span>
                    </>
                  ) : videoUploadStatus === "size_exceeded" ? (
                    <>
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-sm text-orange-600">
                        Video too large for Grove
                      </span>
                    </>
                  ) : videoUploadStatus === "failed" ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-sm text-red-600">
                        Video upload failed
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Metadata Status */}
                <div className="flex items-center gap-2">
                  {isGeneratingMetadata ? (
                    <>
                      <div className="w-4 h-4 animate-spin">
                        <Loader2 />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Generating metadata...
                      </span>
                    </>
                  ) : data.metadataUri ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-green-600">
                        Metadata ready
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
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

      {/* Video Upload Warning */}
      {videoUploadError && (
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-orange-600 mt-0.5">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Video Upload Issue
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {videoUploadError}
                </p>
                {videoUploadStatus === "size_exceeded" && (
                  <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                    <p className="font-medium">Suggested solutions:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Trim your video to reduce file size</li>
                      <li>Use a lower quality export setting</li>
                      <li>Consider using FileCoin storage as an alternative</li>
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
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
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
                  : "Once deployed, your video becomes a tradeable Zora Coin. You'll earn from trading activity and can share it across social platforms."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
