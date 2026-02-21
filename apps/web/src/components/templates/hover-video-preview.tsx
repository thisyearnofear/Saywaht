import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Play } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface HoverVideoPreviewProps {
  videoSrc: string;
  alt: string;
  className?: string;
}

/**
 * Enhanced HoverVideoPreview with intelligent buffering and persistence.
 * Prevents "flickering" or "disappearing" on scroll by keeping the video element in DOM.
 */
export function HoverVideoPreview({
  videoSrc,
  alt,
  className = "",
}: HoverVideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to control playback, but NOT mounting
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      { rootMargin: "600px" } // Aggressive margin to keep buffer ready
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Autoplay logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !isInView) return;

    // Small delay to ensure smooth scrolling
    const playTimer = setTimeout(() => {
      if (isInView && video.paused) {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }, 200);

    return () => clearTimeout(playTimer);
  }, [isInView, hasError]);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().then(() => setIsPlaying(true)).catch(console.error);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden cursor-pointer ${className}`}
      onClick={hasError ? undefined : handlePlayClick}
    >
      {!hasError && (
        <video
          ref={videoRef}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            (isLoading) ? "opacity-0" : "opacity-100"
          )}
          src={videoSrc}
          muted
          playsInline
          loop
          preload="auto"
          onLoadedMetadata={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}

      {/* Loading/Placeholder state */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white/50 p-4 text-center">
          <Play className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest">Preview Unavailable</p>
        </div>
      )}

      {/* Interaction Overlays */}
      {!isLoading && isInView && !hasError && (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            {!isPlaying && (
              <div className="p-3 rounded-full bg-white/20 backdrop-blur-md">
                <Play className="h-5 w-5 fill-white" />
              </div>
            )}
          </div>
          
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/10">
            Preview
          </div>
        </>
      )}
    </div>
  );
}
