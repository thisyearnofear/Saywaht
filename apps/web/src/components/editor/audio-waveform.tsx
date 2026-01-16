"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

/**
 * Audio Waveform Component
 * 
 * Visualizes audio clips on timeline using WaveSurfer.js
 * Simplified from upstream - only essential features.
 * Following Core Principles: minimal, performant, clean.
 */

interface AudioWaveformProps {
  audioUrl: string;
  height?: number;
  className?: string;
}

export function AudioWaveform({
  audioUrl,
  height = 32,
  className = "",
}: AudioWaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initWaveSurfer = async () => {
      if (!waveformRef.current || !audioUrl) return;

      try {
        // Clean up previous instance
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
          wavesurfer.current = null;
        }

        // Create new instance
        const ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: "rgba(255, 255, 255, 0.6)",
          progressColor: "rgba(255, 255, 255, 0.9)",
          cursorColor: "transparent",
          barWidth: 2,
          barGap: 1,
          height,
          normalize: true,
          interact: false,
        });

        if (mounted) {
          wavesurfer.current = ws;
        } else {
          ws.destroy();
          return;
        }

        // Event listeners
        ws.on("ready", () => {
          if (mounted) {
            setIsLoading(false);
            setError(false);
          }
        });

        ws.on("error", (err) => {
          if (mounted) {
            console.error("WaveSurfer error:", err);
            setError(true);
            setIsLoading(false);
          }
        });

        await ws.load(audioUrl);
      } catch (err) {
        if (mounted) {
          console.error("Failed to initialize WaveSurfer:", err);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    initWaveSurfer();

    return () => {
      mounted = false;
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        wavesurfer.current = null;
      }
    };
  }, [audioUrl, height]);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={waveformRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="text-xs text-white/50">Loading...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="text-xs text-white/50">Failed to load</span>
        </div>
      )}
    </div>
  );
}
