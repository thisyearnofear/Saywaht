import React from 'react';
import Image from "next/image";
import { useState, useEffect, useRef } from 'react';
import { Play } from '@/lib/icons'; // Import Play icon

interface HoverVideoPreviewProps {
  videoSrc: string;
  alt: string;
  className?: string;
}

export function HoverVideoPreview({
  videoSrc,
  alt,
  className = "",
}: HoverVideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // New state to track actual play status
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to only load video when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      { rootMargin: "200px" } // Load slightly before it comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Autoplay muted when in view with delay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !isInView) return;

    // PERFORMANCE: Wait 300ms before playing to ensure the user has stopped scrolling
    const playTimer = setTimeout(() => {
      if (isInView) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((error: Error) => {
              console.warn("Autoplay prevented:", error);
              setIsPlaying(false);
            });
        }
      }
    }, 300);

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

  const handleVideoError = () => {
    setHasError(true);
    setIsLoading(false);
    console.error("Error loading video:", videoSrc);
  };

  const handleVideoLoadedMetadata = () => {
    setIsLoading(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-gray-800 rounded-lg overflow-hidden cursor-pointer ${className}`}
      onClick={hasError ? undefined : handlePlayClick} // Allow click to play/pause
    >
      {!hasError && isInView && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={videoSrc}
          muted // Always muted by default for autoplay
          playsInline
          loop
          preload="metadata"
          onLoadedMetadata={handleVideoLoadedMetadata}
          onError={handleVideoError}
        />
      )}

      {/* Placeholder when not in view, loading, or has error */}
      {(!isInView || isLoading) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
          <svg
            className={`w-8 h-8 ${!isInView ? "opacity-20" : "animate-spin text-white"}`}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-white/50 p-4 text-center">
          <Play className="w-12 h-12 mb-2" />
          <p className="text-sm">Video not available</p>
          <p className="text-xs text-white/30">Tap to retry (if applicable)</p>
        </div>
      )}

      {/* Play/Pause Overlay for user interaction */}
      {!isLoading && isInView && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-300 opacity-0 hover:opacity-100 focus-within:opacity-100">
          {!isPlaying && (
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center">
              <Play className="h-6 w-6 fill-current" />
            </div>
          )}
        </div>
      )}

      {/* Muted indicator */}
      {!isLoading && isInView && !hasError && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Muted
        </div>
      )}
    </div>
  );
}
