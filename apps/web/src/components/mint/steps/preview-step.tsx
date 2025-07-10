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
      try {
        // Upload thumbnail to Grove if it's a data URL
        let finalThumbnailUrl = data.thumbnail;
        if (data.thumbnail && data.thumbnail.startsWith("data:")) {
          try {
            const { uploadThumbnailToGrove } = await import(
              "@/lib/thumbnail-upload"
            );
            finalThumbnailUrl = await uploadThumbnailToGrove(data.thumbnail);
            console.log("📸 Thumbnail uploaded to Grove:", finalThumbnailUrl);

            // Update the wizard data with the Grove URL
            updateData({ thumbnail: finalThumbnailUrl });
          } catch (error) {
            console.error("Failed to upload thumbnail to Grove:", error);
            // Continue with data URL if Grove upload fails
          }
        }

        // Create modified mediaItems with custom thumbnail
        const modifiedMediaItems = finalThumbnailUrl
          ? mediaItems.map((item, index) => {
              if (index === 0 && item.type === "video") {
                return {
                  ...item,
                  thumbnailUrl: finalThumbnailUrl || undefined,
                };
              }
              return item;
            })
          : mediaItems;

        const metadata = await generateCoinMetadata({
          coinName: data.coinName,
          coinSymbol: data.coinSymbol,
          creatorAddress: "0x0000000000000000000000000000000000000000", // Will be set during deploy
          mediaItems: modifiedMediaItems,
          tracks,
          projectId: activeProject.id,
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
                <h4 className="font-medium mb-2">Metadata Status</h4>
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

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-primary mt-0.5">
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
              <p className="text-sm font-medium">Ready to Deploy?</p>
              <p className="text-xs text-muted-foreground">
                Once deployed, your video becomes a tradeable Zora Coin.
                You&apos;ll earn from trading activity and can share it across
                social platforms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
