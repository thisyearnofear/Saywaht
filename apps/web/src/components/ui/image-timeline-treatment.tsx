"use client";

import Image from "next/image";
import { useState } from "@/lib/hooks-provider";
import { cn } from "@/lib/utils";

interface ImageTimelineTreatmentProps {
  src: string;
  alt: string;
  targetAspectRatio?: number; // Default to 16:9 for video
  className?: string;
  backgroundType?: "blur" | "mirror" | "color";
  backgroundColor?: string;
}

export function ImageTimelineTreatment({
  src,
  alt,
  targetAspectRatio = 16 / 9,
  className,
  backgroundType = "blur",
  backgroundColor = "#000000",
}: ImageTimelineTreatmentProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setImageLoaded(true);
  };

  const imageAspectRatio = imageDimensions
    ? imageDimensions.width / imageDimensions.height
    : 1;

  const needsAspectRatioTreatment = imageAspectRatio !== targetAspectRatio;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio: targetAspectRatio }}
    >
      {/* Background Layer */}
      {needsAspectRatioTreatment && imageLoaded && (
        <>
          {backgroundType === "blur" && (
            <div className="absolute inset-0">
              <Image
                src={src}
                alt=""
                fill
                style={{ objectFit: "cover" }}
                className="filter blur-xl scale-110 opacity-60"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}

          {backgroundType === "mirror" && (
            <div className="absolute inset-0">
              <Image
                src={src}
                alt=""
                fill
                style={{ objectFit: "cover" }}
                className="opacity-30"
                aria-hidden="true"
              />
            </div>
          )}

          {backgroundType === "color" && (
            <div className="absolute inset-0" style={{ backgroundColor }} />
          )}
        </>
      )}

      {/* Main Image Layer */}
      <div className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: "cover" }}
          onLoad={handleImageLoad}
        />
      </div>

      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <div className="animate-pulse text-xs text-muted-foreground">
            Loading...
          </div>
        </div>
      )}
    </div>
  );
}
