"use client";

import { Button } from "../ui/button";
import { AspectRatio } from "../ui/aspect-ratio";
import { DragOverlay } from "../ui/drag-overlay";
import { useMediaStore } from "@/stores/media-store";
import { processMediaFiles } from "@/lib/media-processing";
import {
  Plus,
  Image as ImageIcon,
  Video,
  Music,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
  Mic,
  Sparkles,
  Cloud,
  Zap,
  Globe,
} from "@/lib/icons-provider";
import Image from "next/image";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { useEffect, useRef, useState, ChangeEvent } from '@/lib/hooks-provider';
import { toast } from "sonner";
import { VoiceoverRecorder } from "./voiceover-recorder";
import { AiVoiceGenerator } from "./ai-voice-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { FileUpload } from "./file-upload";
import { GroveUpload } from "./grove-upload";
import { isFilCDNConfigured, UploadResult } from "@/lib/filcdn";
import { type GroveUploadResult } from "@/lib/grove-storage";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "@/lib/utils";

// MediaPanel lets users add, view, and drag media (images, videos, audio) into the project.
// You can upload files or drag them from your computer. Dragging from here to the timeline adds them to your video project.

export function MediaPanel() {
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "audio">("upload");

  const processFiles = async (files: FileList | File[]) => {
    // If no files, do nothing
    if (!files?.length) return;

    setIsProcessing(true);
    try {
      // Process files (extract metadata, generate thumbnails, etc.)
      const items = await processMediaFiles(files);
      // Add each processed media item to the store
      items.forEach((item) => {
        addMediaItem(item);
      });
    } catch (error) {
      // Show error if processing fails
      console.error("File processing failed:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilCDNUpload = (result: UploadResult) => {
    // When FilCDN upload completes, add the file as a media item
    const type = result.filename.match(/\.(mp4|webm|mov|avi)$/i)
      ? ("video" as const)
      : ("audio" as const);

    const mediaItem = {
      id: crypto.randomUUID(),
      name: result.filename,
      url: result.filcdnUrl, // Use FilCDN URL for fast retrieval
      cid: result.cid, // Store the CID for later reference
      type,
      size: result.size,
      duration: 0, // Will be updated when the media loads
      aspectRatio: 16 / 9, // Default ratio
      isFilCDN: true, // Flag to identify FilCDN content
    };

    addMediaItem(mediaItem);
    toast.success(`Added ${result.filename} from FilCDN`);
  };

  const handleGroveUpload = (result: GroveUploadResult) => {
    // When Grove upload completes, add the file as a media item
    const type = result.filename.match(/\.(mp4|webm|mov|avi)$/i)
      ? ("video" as const)
      : result.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        ? ("image" as const)
        : ("audio" as const);

    const mediaItem = {
      id: crypto.randomUUID(),
      name: result.filename,
      url: result.gatewayUrl, // Use Grove gateway URL for fast retrieval
      cid: result.storageKey, // Store the storage key for later reference
      type,
      size: result.size,
      duration: 0, // Will be updated when the media loads
      aspectRatio: 16 / 9, // Default ratio
      isGrove: true, // Flag to identify Grove/IPFS content
    };

    addMediaItem(mediaItem);
    toast.success(`Added ${result.filename} from Grove/IPFS`);
  };

  const { isDragOver, dragProps } = useDragDrop({
    // When files are dropped, process them
    onDrop: processFiles,
  });

  const handleFileSelect = () => fileInputRef.current?.click(); // Open file picker

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When files are selected via file picker, process them
    if (e.target.files) processFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    // Remove a media item from the store
    e.stopPropagation();
    removeMediaItem(id);
  };

  const formatDuration = (duration: number) => {
    // Format seconds as mm:ss
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const startDrag = (e: React.DragEvent, item: any) => {
    // When dragging a media item, set drag data for timeline to read
    console.log("Starting drag for item:", item);
    e.dataTransfer.setData(
      "application/x-media-item",
      JSON.stringify({
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration, // Include duration in drag data
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const filteredMediaItems = mediaItems;

  const renderPreview = (item: any) => {
    // Render a preview for each media type (image, video, audio, unknown)
    // Each preview is draggable to the timeline
    const baseDragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => startDrag(e, item),
    };

    if (item.type === "image") {
      return (
        <Image
          src={item.url}
          alt={item.name}
          fill
          style={{ objectFit: "cover" }}
          className="rounded cursor-grab active:cursor-grabbing"
          {...baseDragProps}
        />
      );
    }

    if (item.type === "video") {
      if (item.thumbnailUrl) {
        return (
          <div
            className="relative w-full h-full cursor-grab active:cursor-grabbing"
            {...baseDragProps}
          >
            {item.thumbnailUrl.endsWith(".mp4") ||
            item.thumbnailUrl.endsWith(".webm") ||
            item.thumbnailUrl.endsWith(".mov") ? (
              // For video files, use a video element to show first frame
              <video
                src={item.thumbnailUrl}
                className="absolute inset-0 w-full h-full object-cover rounded"
                muted
                playsInline
              />
            ) : (
              // For image thumbnails, use Next.js Image
              <Image
                src={item.thumbnailUrl}
                alt={item.name}
                fill
                style={{ objectFit: "cover" }}
                className="rounded"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
              <Video className="h-6 w-6 text-white drop-shadow-md" />
            </div>
            {item.duration && (
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                {formatDuration(item.duration)}
              </div>
            )}
          </div>
        );
      }
      return (
        <div
          className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded cursor-grab active:cursor-grabbing"
          {...baseDragProps}
        >
          <Video className="h-6 w-6 mb-1" />
          <span className="text-xs">Video</span>
          {item.duration && (
            <span className="text-xs opacity-70">
              {formatDuration(item.duration)}
            </span>
          )}
        </div>
      );
    }

    if (item.type === "audio") {
      return (
        <div
          className="w-full h-full min-h-[48px] bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center gap-3 text-muted-foreground rounded border border-green-500/20 cursor-grab active:cursor-grabbing p-3"
          {...baseDragProps}
        >
          <Music className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{item.name}</div>
            {item.duration && (
              <div className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded cursor-grab active:cursor-grabbing"
        {...baseDragProps}
      >
        <ImageIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Unknown</span>
      </div>
    );
  };

  return (
    <>
      {/* Hidden file input for uploading media */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`h-full flex flex-col transition-colors relative ${
          isDragOver ? "bg-accent/30" : ""
        }`}
        {...dragProps}
      >
        {/* Show overlay when dragging files over the panel */}
        <DragOverlay isVisible={isDragOver} />

        {/* Header with toggle buttons */}
        <div className="flex border-b">
          <Button
            variant={activeTab === "upload" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 rounded-none"
            onClick={() => setActiveTab("upload")}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button
            variant={activeTab === "audio" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 rounded-none"
            onClick={() => setActiveTab("audio")}
          >
            <Mic className="h-4 w-4 mr-2" />
            Audio
          </Button>
        </div>

        {/* Content sections */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === "upload" && (
            <>
              {/* Upload section */}
              <div className="p-3 border-b bg-muted/5">
                <Tabs defaultValue="local" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-8">
                    <TabsTrigger value="local" className="text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Local
                    </TabsTrigger>
                    <TabsTrigger value="grove" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      Grove
                    </TabsTrigger>
                    <TabsTrigger value="filcdn" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      FilCDN
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="local" className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFileSelect}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Upload className="h-4 w-4 animate-spin mr-2" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          <span>Add Files</span>
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="grove" className="mt-3">
                    <GroveUpload onUploadComplete={handleGroveUpload} />
                  </TabsContent>

                  <TabsContent value="filcdn" className="mt-3">
                    {isFilCDNConfigured() ? (
                      <FileUpload onUploadComplete={handleFilCDNUpload} />
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">
                          FilCDN not configured
                        </p>
                        <Button asChild size="sm" variant="outline">
                          <a
                            href="https://fs-upload-dapp.netlify.app"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Setup Guide
                          </a>
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Media library */}
              <div className="flex-1 overflow-y-auto p-3">
                {filteredMediaItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No media in project
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Drag files here or click Add Files
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Separate audio items for better visibility */}
                    {filteredMediaItems.filter((item) => item.type === "audio")
                      .length > 0 && (
                      <>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Audio
                        </div>
                        <div className="space-y-1 mb-3">
                          {filteredMediaItems
                            .filter((item) => item.type === "audio")
                            .map((item) => (
                              <div key={item.id} className="relative group">
                                <Button
                                  variant="outline"
                                  className="flex flex-col gap-1 p-2 h-auto w-full relative overflow-hidden"
                                >
                                  <div className="w-full">
                                    {renderPreview(item)}
                                  </div>
                                </Button>
                                {/* Show remove button on hover */}
                                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e: React.MouseEvent) =>
                                      handleRemove(e, item.id)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    )}

                    {/* Grid for video/image items */}
                    {filteredMediaItems.filter((item) => item.type !== "audio")
                      .length > 0 && (
                      <>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Media
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {filteredMediaItems
                            .filter((item) => item.type !== "audio")
                            .map((item) => (
                              <div key={item.id} className="relative group">
                                <Button
                                  variant="outline"
                                  className="flex flex-col gap-1 p-2 h-auto w-full relative overflow-hidden"
                                >
                                  <AspectRatio ratio={item.aspectRatio}>
                                    {renderPreview(item)}
                                  </AspectRatio>
                                  <span
                                    className="text-xs truncate px-1 max-w-full"
                                    aria-label={item.name}
                                    title={item.name}
                                  >
                                    {item.name.length > 12
                                      ? `${item.name.slice(0, 8)}...${item.name.slice(-3)}`
                                      : item.name}
                                  </span>
                                </Button>
                                {/* Show remove button on hover */}
                                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e: React.MouseEvent) =>
                                      handleRemove(e, item.id)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "audio" && (
            <div className="flex-1 overflow-y-auto p-3">
              <Tabs defaultValue="record" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="record" className="text-sm">
                    <Mic className="h-3 w-3 mr-1" />
                    Record
                  </TabsTrigger>
                  <TabsTrigger value="generate" className="text-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="record" className="mt-4">
                  <VoiceoverRecorder />
                </TabsContent>
                <TabsContent value="generate" className="mt-4">
                  <AiVoiceGenerator />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
