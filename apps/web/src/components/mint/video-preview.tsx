"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { PreviewPanel } from "@/components/editor/preview-panel";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Loader2 } from "@/lib/icons";

export function MintVideoPreview() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { toggle, isPlaying } = usePlaybackStore();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle play button click
  const handlePlayClick = () => {
    setIsLoading(true);
    setShowPlayer(true);

    // Small delay to allow PreviewPanel to mount, then start playback
    setTimeout(() => {
      if (!isPlaying) {
        toggle();
      }
      // Hide loading state after a brief moment
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }, 100);
  };

  // Show the actual video player if requested
  if (showPlayer) {
    return (
      <div className="relative w-full h-full">
        {/* Show thumbnail with loading overlay during initialization */}
        {isLoading && thumbnailUrl && (
          <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center transition-opacity duration-300">
            <Image
              src={thumbnailUrl}
              alt="Video preview"
              fill
              className="object-cover opacity-30"
              unoptimized={true}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Brand/Logo stays visible */}
              {activeProject && (
                <div className="mb-8 text-center">
                  <h3 className="text-white font-bold text-2xl mb-2">
                    {activeProject.name || "Untitled Project"}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {mediaItems.length} media items • {tracks.length} tracks
                  </p>
                </div>
              )}

              {/* Loading spinner */}
              <div className="bg-black/60 rounded-full p-6">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
              <p className="text-white/80 text-sm mt-4">Loading video...</p>
            </div>
          </div>
        )}

        {/* Video player */}
        <PreviewPanel controlsVariant="overlay" />

        {/* Close button */}
        <button
          onClick={() => {
            setShowPlayer(false);
            setIsLoading(false);
          }}
          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full transition-colors z-30 shadow-sm"
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
      onClick={handlePlayClick}
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

      {/* Play button overlay with hover effect */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="bg-black/60 backdrop-blur-sm rounded-full p-6 group-hover:bg-black/80 group-hover:scale-110 transition-all duration-300 shadow-2xl">
          <svg
            className="w-12 h-12 text-white fill-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Project info overlay - Beautiful branding */}
      {activeProject && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
          <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg">
            {activeProject.name || "Untitled Project"}
          </h3>
          <p className="text-white/90 text-sm drop-shadow-md">
            {mediaItems.length} media items • {tracks.length} tracks
          </p>
        </div>
      )}
    </div>
  );
}
