"use client";

import { useState, ChangeEvent } from "@/lib/hooks-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LuLoader as Loader2, LuSparkles, LuUpload } from "react-icons/lu";
import { toast } from "sonner";
import Image from "next/image";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { MintWizardData } from "../mint-wizard";

interface ThumbnailStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function ThumbnailStep({ data, updateData }: ThumbnailStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(
    data.thumbnailPrompt ||
      "[PLACEHOLDER] Describe your video content for AI thumbnail generation"
  );

  const { mediaItems } = useMediaStore();
  const { tracks } = useTimelineStore();

  const extractFrameFromVideo = async (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = videoUrl;

      video.addEventListener("loadeddata", () => {
        video.currentTime = video.duration * 0.25;
      });

      video.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1920;
          canvas.height = 1080;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            const videoAspect = video.videoWidth / video.videoHeight;
            let sx = 0,
              sy = 0,
              sw = video.videoWidth,
              sh = video.videoHeight;

            if (videoAspect > 16 / 9) {
              sw = video.videoHeight * (16 / 9);
              sx = (video.videoWidth - sw) / 2;
            } else {
              sh = video.videoWidth / (16 / 9);
              sy = (video.videoHeight - sh) / 2;
            }

            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1920, 1080);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
          } else {
            reject(new Error("Failed to get canvas context"));
          }
        } catch (error) {
          reject(error);
        }
      });

      video.addEventListener("error", () => {
        reject(new Error("Failed to load video"));
      });
    });
  };

  const generateAIThumbnail = async () => {
    setIsGenerating(true);

    try {
      // Find the first video in the timeline
      let videoFrame: string | null = null;

      for (const track of tracks) {
        for (const clip of track.clips) {
          const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
          if (mediaItem && mediaItem.type === "video") {
            try {
              videoFrame = await extractFrameFromVideo(mediaItem.url);
              break;
            } catch (error) {
              console.error("Failed to extract frame:", error);
            }
          }
        }
        if (videoFrame) break;
      }

      if (!videoFrame) {
        throw new Error("No video found to generate thumbnail from");
      }

      // Generate AI thumbnail using our API
      const response = await fetch("/api/ai/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: customPrompt,
          videoFrame: videoFrame,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate thumbnail");
      }

      const responseData = await response.json();

      if (responseData.success && responseData.thumbnailUrl) {
        // Store thumbnail locally first - will upload to Grove during deployment
        updateData({
          thumbnail: responseData.thumbnailUrl,
          thumbnailPrompt: customPrompt,
        });

        // Show different success messages based on generation method
        if (responseData.method === "venice_ai") {
          toast.success("AI thumbnail generated with Venice AI!");
        } else if (responseData.method === "video_frame") {
          toast.success("Thumbnail extracted from video frame!");
        } else {
          toast.success("Custom thumbnail generated!");
        }
      } else {
        throw new Error("Invalid response from thumbnail generation API");
      }
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate thumbnail. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setIsGenerating(true);

      try {
        // Convert file to data URL and store locally first
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        updateData({
          thumbnail: dataUrl,
          thumbnailPrompt: customPrompt,
        });
        toast.success("Thumbnail uploaded successfully!");
      } catch (error) {
        console.error("Failed to upload thumbnail:", error);
        toast.error("Failed to upload thumbnail. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Coin Thumbnail</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate an AI-powered thumbnail or upload your own to represent your
          coin. Thumbnails will be uploaded to IPFS during deployment.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt">AI Generation Prompt</Label>
          <Textarea
            id="prompt"
            value={customPrompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setCustomPrompt(e.target.value)
            }
            placeholder="Describe the thumbnail you want to generate..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Be specific about style, colors, and elements you want in your
            thumbnail
          </p>
        </div>

        {/* Thumbnail Preview */}
        {data.thumbnail ? (
          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image
              src={data.thumbnail}
              alt="Generated thumbnail"
              fill
              className="object-cover"
              unoptimized={true}
              priority
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Current Thumbnail
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
            <div className="text-center">
              <div className="w-12 h-12 text-muted-foreground mx-auto mb-2">
                <LuSparkles />
              </div>
              <p className="text-sm text-muted-foreground">No thumbnail yet</p>
              <p className="text-xs text-muted-foreground">
                Generate or upload one below
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={generateAIThumbnail}
            disabled={
              isGenerating || tracks.length === 0 || !customPrompt.trim()
            }
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin">
                  <Loader2 />
                </div>
                Generating...
              </>
            ) : (
              <>
                <div className="w-4 h-4 mr-2">
                  <LuSparkles />
                </div>
                Generate AI Thumbnail
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="relative"
            disabled={isGenerating}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isGenerating}
            />
            <div className="w-4 h-4 mr-2">
              <LuUpload />
            </div>
            Upload Image
          </Button>
        </div>

        {tracks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center bg-muted/50 p-3 rounded">
            Add video content to your timeline to generate a thumbnail
          </p>
        )}
      </CardContent>
    </Card>
  );
}
