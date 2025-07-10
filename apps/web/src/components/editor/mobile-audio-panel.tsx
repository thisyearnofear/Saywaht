"use client";

import { useState, useRef, ChangeEvent } from '@/lib/hooks-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Music,
  Volume2,
  Upload,
  Play,
  Pause,
  Download,
} from "@/lib/icons-provider";
import { useMediaStore } from "@/stores/media-store";
import { useMobileContext } from "@/contexts/mobile-context";
import { cn } from "@/lib/utils";

interface MobileAudioPanelProps {
  className?: string;
}

export function MobileAudioPanel({ className }: MobileAudioPanelProps) {
  const { orientation } = useMobileContext();
  const { mediaItems } = useMediaStore();

  // Filter for audio files only
  const audioFiles = mediaItems.filter(
    (item) => item.type === "audio" || item.file?.type?.startsWith("audio/")
  );

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Handle audio upload logic
      console.log("Audio files uploaded:", files);
    }
  };

  const handleVoiceoverRecord = () => {
    // Handle voiceover recording
    console.log("Start voiceover recording");
  };

  const handleMusicLibrary = () => {
    // Handle music library access
    console.log("Open music library");
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Audio</h2>
          </div>
          <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
            {audioFiles.length} files
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12 flex flex-col gap-1"
            onClick={handleVoiceoverRecord}
          >
            <Mic className="h-4 w-4" />
            <span className="text-xs">Record</span>
          </Button>
          <Button
            variant="outline"
            className="h-12 flex flex-col gap-1"
            onClick={handleMusicLibrary}
          >
            <Music className="h-4 w-4" />
            <span className="text-xs">Music</span>
          </Button>
        </div>
      </div>

      {/* Audio Files List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {audioFiles.length === 0 ? (
            <div className="text-center py-8">
              <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No audio files uploaded
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById("audio-upload")?.click()}
                className="text-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Audio
              </Button>
            </div>
          ) : (
            audioFiles.map((audio, index) => (
              <AudioFileCard key={index} audio={audio} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Hidden file input */}
      <input
        id="audio-upload"
        type="file"
        accept="audio/*"
        multiple
        onChange={handleAudioUpload}
        className="hidden"
      />
    </div>
  );
}

interface AudioFileCardProps {
  audio: any; // Replace with proper type
}

function AudioFileCard({ audio }: AudioFileCardProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>("00:00");
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const minutes = Math.floor(audioRef.current.duration / 60);
      const seconds = Math.floor(audioRef.current.duration % 60);
      setDuration(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">
              {audio.name || "Untitled Audio"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {duration} •{" "}
              {audio.size ? `${Math.round(audio.size / 1024)}KB` : ""}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                // Handle download
                console.log("Download audio:", audio);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audio.url}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
