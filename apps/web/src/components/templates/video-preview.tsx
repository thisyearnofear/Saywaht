"use client";

import React from "@/lib/hooks-provider";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "@/lib/hooks-provider";

interface VideoPreviewProps {
  src: string;
  title: string;
}

export function VideoPreview({ src, title }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayback = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((error: Error) => {
        console.error("Error playing video:", error);
      });
    }

    setIsPlaying(!isPlaying);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const handleVideoError = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    console.error("Video failed to load:", e);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={src}
        title={title}
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        muted // Important for autoplay on first interaction
        playsInline
      />

      {/* Play/Pause button overlay */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute inset-0 m-auto w-16 h-16 text-white bg-black/30 rounded-full hover:bg-black/50"
        onClick={togglePlayback}
      >
        {isPlaying ? (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </Button>
    </div>
  );
}
