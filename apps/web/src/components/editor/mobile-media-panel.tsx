"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MediaPanel } from "@/components/editor/media-panel";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { useMobileContext } from "@/contexts/mobile-context";
import { useMediaStore } from "@/stores/media-store";
import { cn } from "@/lib/utils";
import { 
  Mic, 
  Upload, 
  Music, 
  Video,
  Image as ImageIcon,
  Plus,
  X
} from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";

interface MobileMediaPanelProps {
  className?: string;
}

export function MobileMediaPanel({ className }: MobileMediaPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("record");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { orientation } = useMobileContext();
  const { mediaItems, addMediaItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Count media by type
  const videoCount = mediaItems.filter(m => m.type === "video").length;
  const audioCount = mediaItems.filter(m => m.type === "audio").length;
  const imageCount = mediaItems.filter(m => m.type === "image").length;

  const handleFileSelect = () => {
    addHapticFeedback("light");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsProcessing(true);
    try {
      const items = await processMediaFiles(files);
      items.forEach((item) => {
        addMediaItem(item);
      });
      toast.success(`Added ${items.length} file(s)`);
      addHapticFeedback("medium");
    } catch (error) {
      console.error("File processing failed:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Simplified tab interface */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          addHapticFeedback("light");
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
          <TabsList className="grid grid-cols-3 flex-1 h-11">
            <TabsTrigger
              value="record"
              className="flex items-center gap-1.5 text-sm data-[state=active]:bg-background"
            >
              <Mic className="h-4 w-4" />
              <span>Record</span>
              {audioCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                  {audioCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="flex items-center gap-1.5 text-sm data-[state=active]:bg-background"
            >
              <Video className="h-4 w-4" />
              <span>Media</span>
              {(videoCount + imageCount) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                  {videoCount + imageCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center gap-1.5 text-sm data-[state=active]:bg-background"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="record"
          className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <MobileAudioPanel />
        </TabsContent>

        <TabsContent
          value="media"
          className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <MediaPanel />
          </div>
        </TabsContent>

        <TabsContent
          value="upload"
          className="flex-1 min-h-0 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <UploadTab 
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
            mediaCounts={{ video: videoCount, audio: audioCount, image: imageCount }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface UploadTabProps {
  onFileSelect: () => void;
  isProcessing: boolean;
  mediaCounts: { video: number; audio: number; image: number };
}

function UploadTab({ onFileSelect, isProcessing, mediaCounts }: UploadTabProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {/* Main upload button */}
        <Button
          onClick={onFileSelect}
          disabled={isProcessing}
          className="w-full h-20 text-lg"
        >
          {isProcessing ? (
            <>
              <div className="h-5 w-5 mr-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="h-6 w-6 mr-3" />
              Add Media Files
            </>
          )}
        </Button>

        {/* Supported formats */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Supports: MP4, MOV, WebM, MP3, WAV, JPG, PNG
          </p>
        </div>

        {/* Current media summary */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium">Current Project</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Video className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-semibold">{mediaCounts.video}</div>
              <div className="text-xs text-muted-foreground">Videos</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Music className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-semibold">{mediaCounts.audio}</div>
              <div className="text-xs text-muted-foreground">Audio</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <ImageIcon className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-semibold">{mediaCounts.image}</div>
              <div className="text-xs text-muted-foreground">Images</div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            💡 Pro Tips
          </h4>
          <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <li>• Start with a video template or upload your own</li>
            <li>• Record voiceover while watching the video</li>
            <li>• Add text overlays for captions</li>
            <li>• Keep videos under 60 seconds for best results</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
