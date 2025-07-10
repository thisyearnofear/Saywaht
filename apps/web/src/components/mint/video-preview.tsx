"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { PreviewPanel } from "@/components/editor/preview-panel";
import Image from "next/image";
import { useState, useEffect } from "@/lib/hooks-provider";

export function MintVideoPreview() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    // Ensure we're on the client
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Find the first video or image to use as preview
    let foundPreview = false;

    for (const track of tracks) {
      if (foundPreview) break;

      for (const clip of track.clips) {
        const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

        if (mediaItem) {
          if (mediaItem.thumbnailUrl) {
            // Use existing thumbnail
            setThumbnailUrl(mediaItem.thumbnailUrl);
            foundPreview = true;
            break;
          } else if (mediaItem.type === "image") {
            // Use image directly
            setThumbnailUrl(mediaItem.url);
            foundPreview = true;
            break;
          }
        }
      }
    }

    // If no preview found, use default
    if (!foundPreview) {
      setThumbnailUrl("/opengraph-image.jpg");
    }
  }, [tracks, mediaItems, isClient]);

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show the actual video player if requested
  if (showPlayer) {
    return (
      <div className="relative w-full h-full">
        <PreviewPanel />
        <button
          onClick={() => setShowPlayer(false)}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors z-10"
          title="Close player"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  }

  if (!thumbnailUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🎬</div>
          <p className="text-sm text-muted-foreground">No preview available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full group overflow-hidden rounded-lg cursor-pointer"
      onClick={() => setShowPlayer(true)}
    >
      {/* Use Image component with unoptimized prop to avoid SSR issues */}
      <div className="relative w-full h-full">
        <Image
          src={thumbnailUrl}
          alt="Video preview"
          fill
          className="object-cover"
          unoptimized={true}
          onError={() => {
            setThumbnailUrl("/opengraph-image.jpg");
          }}
        />
      </div>

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/50 rounded-full p-4 group-hover:bg-black/70 transition-colors">
          <svg
            className="w-8 h-8 text-white fill-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Project info overlay */}
      {activeProject && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          <h3 className="text-white font-semibold text-lg">
            {activeProject.name || "Untitled Project"}
          </h3>
          <p className="text-white/80 text-sm">
            {mediaItems.length} media items • {tracks.length} tracks
          </p>
        </div>
      )}
    </div>
  );
}
