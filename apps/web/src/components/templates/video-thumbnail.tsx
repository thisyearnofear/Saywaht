"use client";

import React from '@/lib/hooks-provider';
import Image from "next/image";
import { useEffect, useState, useRef } from '@/lib/hooks-provider';

interface VideoThumbnailProps {
  videoSrc: string;
  alt: string;
  className?: string;
}

export function VideoThumbnail({
  videoSrc,
  alt,
  className = "",
}: VideoThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Create video element
    const video = videoRef.current;
    if (!video) return;

    const generateThumbnail = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current frame to canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL("image/jpeg");
        setThumbnailUrl(dataUrl);
      } catch (err) {
        console.error("Error generating thumbnail:", err);
        setError(true);
      }
    };

    // Event handlers
    const handleCanPlay = () => {
      // Generate thumbnail when video can play
      generateThumbnail();

      // Clean up - we no longer need the video after thumbnail is generated
      video.removeEventListener("canplay", handleCanPlay);
      video.pause();
      video.src = "";
      video.load();
    };

    const handleError = () => {
      console.error("Error loading video for thumbnail:", videoSrc);
      setError(true);
    };

    // Add event listeners
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    // Load the video
    video.src = videoSrc;
    video.load();

    // Clean up function
    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [videoSrc, thumbnailUrl]);

  // Show fallback if error
  if (error) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}
      >
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
    );
  }

  return (
    <>
      {/* Hidden video element used for capturing thumbnail */}
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* Hidden canvas used for capturing thumbnail */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Display the thumbnail */}
      {thumbnailUrl ? (
        <div className="relative w-full h-full">
          <Image
            src={thumbnailUrl}
            alt={alt}
            fill
            className={`object-cover ${className}`}
          />
          <div className="absolute bottom-2 right-2 bg-black/50 text-white/80 text-xs px-1.5 py-0.5 rounded">
            Video
          </div>
        </div>
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gray-800/50 ${className}`}
        >
          <svg
            className="w-8 h-8 animate-spin text-white"
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
    </>
  );
}
