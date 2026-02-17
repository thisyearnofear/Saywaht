"use client";

import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Sparkles, 
  Upload, 
  Check, 
  ArrowLeftRight,
  Info
} from "@/lib/icons";
import { toast } from "sonner";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { MintWizardData } from "../mint-wizard";
import { cn } from "@/lib/utils";

interface ThumbnailStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

const STYLE_PRESETS = [
  {
    label: "Cinematic",
    prompt:
      "cinematic still frame, dramatic contrast, rich highlights, polished look",
  },
  {
    label: "Bold Text",
    prompt:
      "high-contrast thumbnail with strong focal point and room for headline text",
  },
  {
    label: "Minimal",
    prompt: "clean composition, simple background, minimal visual noise",
  },
  {
    label: "Meme",
    prompt: "vibrant meme energy, punchy expression, social-ready composition",
  },
];

const SOURCE_META = {
  ai: { label: "AI Generated", color: "text-purple-500 bg-purple-500/10" },
  video_frame: { label: "Video Frame", color: "text-blue-500 bg-blue-500/10" },
  timeline_media: { label: "Media Asset", color: "text-green-500 bg-green-500/10" },
  upload: { label: "Uploaded", color: "text-orange-500 bg-orange-500/10" },
};

export function ThumbnailStep({ data, updateData }: ThumbnailStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "working" | "ready" | "fallback" | "error"
  >("idle");
  const [generationMessage, setGenerationMessage] = useState(
    "Choose a style and generate your thumbnail."
  );
  const [previousThumbnail, setPreviousThumbnail] = useState<string | null>(
    null
  );
  const [comparePosition, setComparePosition] = useState(50);
  const [customPrompt, setCustomPrompt] = useState(
    data.thumbnailPrompt ||
      "A vibrant, cinematic reaction thumbnail"
  );

  const { mediaItems } = useMediaStore();
  const { tracks } = useTimelineStore();
  const hasTimelineMedia = tracks.some((track) => track.clips.length > 0);
  const hasComparison =
    !!previousThumbnail &&
    !!data.thumbnail &&
    previousThumbnail !== data.thumbnail &&
    !isGenerating;
  const sourceMeta = data.thumbnailSource
    ? SOURCE_META[data.thumbnailSource]
    : null;

  const getAspectRatioClass = () => {
    switch (data.videoFormat) {
      case "portrait":
        return "aspect-[9/16] max-w-[280px] mx-auto";
      case "square":
        return "aspect-square max-w-[350px] mx-auto";
      case "landscape":
      default:
        return "aspect-video";
    }
  };

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
          
          let targetWidth = 1920;
          let targetHeight = 1080;
          let targetAspect = 16 / 9;

          if (data.videoFormat === "portrait") {
            targetWidth = 1080;
            targetHeight = 1920;
            targetAspect = 9 / 16;
          } else if (data.videoFormat === "square") {
            targetWidth = 1080;
            targetHeight = 1080;
            targetAspect = 1;
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            const videoAspect = video.videoWidth / video.videoHeight;
            let sx = 0,
              sy = 0,
              sw = video.videoWidth,
              sh = video.videoHeight;

            if (videoAspect > targetAspect) {
              sw = video.videoHeight * targetAspect;
              sx = (video.videoWidth - sw) / 2;
            } else {
              sh = video.videoWidth / targetAspect;
              sy = (video.videoHeight - sh) / 2;
            }

            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
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
    setGenerationStatus("working");
    setGenerationMessage("Crafting AI thumbnail...");
    if (data.thumbnail) setPreviousThumbnail(data.thumbnail);

    let videoFrame: string | null = null;
    let fallbackThumbnail: string | null = null;

    try {
      for (const track of tracks) {
        for (const clip of track.clips) {
          const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
          if (!mediaItem) continue;

          if (!fallbackThumbnail) {
            if (mediaItem.thumbnailUrl) {
              fallbackThumbnail = mediaItem.thumbnailUrl;
            } else if (mediaItem.type === "image") {
              fallbackThumbnail = mediaItem.url;
            }
          }

          if (mediaItem.type !== "video") continue;

          try {
            videoFrame = await extractFrameFromVideo(mediaItem.url);
            break;
          } catch (error) {
            console.error("Failed to extract frame:", error);
          }
        }
        if (videoFrame) break;
      }

      if (!videoFrame && fallbackThumbnail) {
        updateData({
          thumbnail: fallbackThumbnail,
          thumbnailPrompt: customPrompt,
          thumbnailSource: "timeline_media",
        });
        setGenerationStatus("fallback");
        setGenerationMessage("Using timeline media.");
        toast.success("Using existing media");
        return;
      }

      if (!videoFrame && !fallbackThumbnail) {
        throw new Error("No media found for thumbnail");
      }

      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_EXPORT_URL || "https://persidian.com";
      const endpoints = [
        { url: `${BACKEND_URL}/api/ai/generate-thumbnail`, label: "backend", timeoutMs: 55_000 },
        { url: "/api/ai/generate-thumbnail", label: "vercel", timeoutMs: 55_000 },
      ];

      let response: Response | undefined;
      for (const ep of endpoints) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ep.timeoutMs);
        try {
          const res = await fetch(ep.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              prompt: customPrompt, 
              videoFrame,
              aspectRatio: data.videoFormat
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            response = res;
            break;
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
        }
      }

      if (!response) {
        throw new Error("Generation failed.");
      }

      const responseData = await response.json();

      if (responseData.success && responseData.thumbnailUrl) {
        const thumbnailSource =
          responseData.method === "venice_ai" ? "ai" : "video_frame";
        updateData({
          thumbnail: responseData.thumbnailUrl,
          thumbnailPrompt: customPrompt,
          thumbnailSource: thumbnailSource,
        });
        setGenerationStatus("ready");
        setGenerationMessage("Thumbnail is ready!");
        toast.success("Thumbnail generated!");
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      
      if (videoFrame) {
        updateData({
          thumbnail: videoFrame,
          thumbnailPrompt: customPrompt,
          thumbnailSource: "video_frame",
        });
        setGenerationStatus("fallback");
        setGenerationMessage("Using extracted video frame.");
        toast.success("Using video frame");
      } else {
        setGenerationStatus("error");
        setGenerationMessage("Generation failed.");
        toast.error("Failed to generate thumbnail.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setIsGenerating(true);

      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        updateData({
          thumbnail: dataUrl,
          thumbnailPrompt: customPrompt,
          thumbnailSource: "upload",
        });
        setGenerationStatus("ready");
        setGenerationMessage("Uploaded successfully.");
        toast.success("Thumbnail uploaded!");
      } catch (error) {
        console.error("Failed to upload thumbnail:", error);
        setGenerationStatus("error");
        setGenerationMessage("Upload failed.");
        toast.error("Failed to upload thumbnail.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const applyStylePreset = (presetPrompt: string) => {
    setCustomPrompt((prev) => {
      if (!prev.trim() || prev.includes("A vibrant")) {
        return presetPrompt;
      }
      return `${prev}. Style: ${presetPrompt}`;
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Preview</Label>
            {sourceMeta && (
              <Badge className={cn("rounded-full border-none text-[10px] uppercase font-black tracking-tighter", sourceMeta.color)}>
                {sourceMeta.label}
              </Badge>
            )}
          </div>

          {data.thumbnail && !isGenerating ? (
            <div className={cn("relative group rounded-[2rem] overflow-hidden border-2 border-border/50 shadow-2xl transition-all duration-500 hover:border-primary/50", getAspectRatioClass())}>
              {hasComparison ? (
                <>
                  <Image
                    src={previousThumbnail}
                    alt="Previous"
                    fill
                    className="object-cover"
                    unoptimized={true}
                  />
                  <div
                    className="absolute inset-0 z-10"
                    style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                  >
                    <Image
                      src={data.thumbnail || ""}
                      alt="New"
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  </div>
                  <div
                    className="absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                    style={{ left: `${comparePosition}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4 text-black" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 inset-x-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparePosition}
                      onChange={(e) => setComparePosition(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </>
              ) : (
                <Image
                  src={data.thumbnail}
                  alt="Thumbnail"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  priority
                />
              )}
            </div>
          ) : isGenerating ? (
            <div className={cn("relative bg-muted/30 rounded-[2rem] border-2 border-dashed border-primary/30 flex flex-col items-center justify-center p-8 text-center animate-pulse", getAspectRatioClass())}>
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h4 className="font-bold text-foreground">Generating...</h4>
              <p className="text-xs text-muted-foreground mt-2">{generationMessage}</p>
            </div>
          ) : (
            <div className={cn("bg-muted/20 rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center p-8 text-center", getAspectRatioClass())}>
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No thumbnail yet</p>
            </div>
          )}

          {hasComparison && (
             <Button
               variant="secondary"
               size="sm"
               className="w-full rounded-xl h-10 font-bold text-xs"
               onClick={() => setPreviousThumbnail(null)}
             >
               Keep this version
             </Button>
          )}
        </div>

        {/* Right Column: Controls */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">AI Style Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-10 text-xs font-bold border-border/50 hover:bg-primary/5 hover:border-primary/30"
                  onClick={() => applyStylePreset(preset.prompt)}
                  disabled={isGenerating}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="prompt" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Custom Prompt</Label>
            <Textarea
              id="prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[100px] rounded-2xl bg-muted/30 border-border/50 focus:border-primary/50"
              placeholder="Describe your thumbnail..."
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={generateAIThumbnail}
              disabled={isGenerating || !hasTimelineMedia}
              className="h-12 rounded-2xl font-bold shadow-lg shadow-primary/10"
            >
              {isGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {data.thumbnail ? "Regenerate AI Thumbnail" : "Generate AI Thumbnail"}
            </Button>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={isGenerating}
              />
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl font-bold border-border/50"
                disabled={isGenerating}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Own Image
              </Button>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 flex items-start gap-3 border-border/40">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We&apos;ll use frames from your video to guide the AI, ensuring your thumbnail matches your content perfectly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
