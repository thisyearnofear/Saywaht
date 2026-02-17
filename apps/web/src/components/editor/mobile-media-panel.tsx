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
          <TabsList className="grid grid-cols-3 flex-1 h-11 p-1">
            <TabsTrigger
              value="record"
              className="flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-background h-9 px-2"
            >
              <Mic className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Record</span>
              <span className="sm:hidden">Rec</span>
              {audioCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-[18px] px-1 text-[10px] shrink-0">
                  {audioCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-background h-9 px-2"
            >
              <Video className="h-4 w-4 shrink-0" />
              <span>Media</span>
              {(videoCount + imageCount) > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-[18px] px-1 text-[10px] shrink-0">
                  {videoCount + imageCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-background h-9 px-2"
            >
              <Upload className="h-4 w-4 shrink-0" />
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
    <ScrollArea className="flex-1 bg-muted/5">
      <div className="p-6 space-y-6">
        {/* Main upload area - more modern look */}
        <button
          onClick={onFileSelect}
          disabled={isProcessing}
          className={cn(
            "w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all active:scale-[0.98]",
            isProcessing 
              ? "bg-muted border-muted-foreground/20 cursor-not-allowed" 
              : "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
          )}
        >
          {isProcessing ? (
            <>
              <div className="h-10 w-10 mb-4 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="font-bold text-muted-foreground">Processing Files...</p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <p className="font-bold text-lg">Add Media</p>
              <p className="text-xs text-muted-foreground mt-1 px-10 text-center">
                Upload videos, photos, or audio from your device
              </p>
            </>
          )}
        </button>

        {/* Current media summary - cleaner grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Project Assets</h3>
            <Badge variant="outline" className="text-[10px] font-bold border-muted-foreground/20">
              {mediaCounts.video + mediaCounts.audio + mediaCounts.image} TOTAL
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Videos", count: mediaCounts.video, icon: Video, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Audio", count: mediaCounts.audio, icon: Music, color: "text-green-500", bg: "bg-green-500/10" },
              { label: "Images", count: mediaCounts.image, icon: ImageIcon, color: "text-purple-500", bg: "bg-purple-500/10" },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border/50 p-4 rounded-2xl flex flex-col items-center text-center shadow-sm">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-2", item.bg)}>
                  <item.icon className={cn("h-5 w-5", item.color)} />
                </div>
                <div className="text-lg font-black tabular-nums">{item.count}</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips - minimal and helpful */}
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/80">
              Quick Tips
            </h4>
          </div>
          <ul className="space-y-3">
            {[
              "Keep videos under 60 seconds for best social results",
              "Record voiceover while watching your preview",
              "Add text overlays for better accessibility"
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-black text-primary">
                  {i + 1}
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                  {tip}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
