"use client";

import { useRef } from "@/lib/hooks-provider";

interface SimpleVideoPlayerProps {
  src: string;
  className?: string;
}

export function SimpleVideoPlayer({
  src,
  className = "",
}: SimpleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      src={src}
      className={`w-full h-full object-cover ${className}`}
      playsInline
      preload="auto"
      controls
    />
  );
}
