"use client";

import React from 'react';
import Image from "next/image";
import { useState, useEffect, useRef } from 'react';

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
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to only load video when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Load slightly before it comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Start/stop video on hover
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !isInView) return;

    if (isHovering) {
      // Try to play the video when hovering
      const playPromise = video.play();

      // Handle autoplay policies
      if (playPromise !== undefined) {
        playPromise.catch((error: Error) => {
          console.error("Auto-play was prevented:", error);
        });
      }
    } else {
      // Pause when not hovering
      video.pause();
      // Reset to beginning when not hovering to save resources
      video.currentTime = 0;
    }
  }, [isHovering, hasError, isInView]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-gray-800 ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {!hasError && isInView && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={videoSrc}
          muted
          playsInline
          loop
          preload="metadata"
          onLoadedMetadata={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
            console.error("Error loading video:", videoSrc);
          }}
        />
      )}

      {/* Placeholder when not in view or loading */}
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

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/50"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      )}

      {/* Video indicator overlay */}
      {!isLoading && !hasError && (
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
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
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {isHovering ? "Playing" : "Hover to Play"}
          </div>
        </div>
      )}
    </div>
  );
}
