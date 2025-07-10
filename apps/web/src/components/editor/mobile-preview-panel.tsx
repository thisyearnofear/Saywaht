"use client";

import { useState, useRef } from "@/lib/hooks-provider";
import { PreviewPanel } from "@/components/editor/preview-panel";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "@/lib/icons-provider";
import { cn } from "@/lib/utils";
import { useMobileContext } from "@/contexts/mobile-context";
import { usePinchZoom } from "@/hooks/use-touch-gestures";
import { addHapticFeedback } from "@/lib/mobile-utils";

interface MobilePreviewPanelProps {
  className?: string;
}

export function MobilePreviewPanel({ className }: MobilePreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { orientation } = useMobileContext();
  const previewRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    addHapticFeedback("medium");
    setIsFullscreen(!isFullscreen);
  };

  const handleZoomChange = (scale: number) => {
    if (previewRef.current) {
      previewRef.current.style.transform = `scale(${scale})`;
    }
  };

  const { scale, setScale, gestureHandlers } = usePinchZoom(handleZoomChange, {
    minScale: 0.5,
    maxScale: 3,
  });

  const handleZoomIn = () => {
    const newScale = Math.min(3, scale + 0.2);
    setScale(newScale);
    handleZoomChange(newScale);
    addHapticFeedback("light");
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.5, scale - 0.2);
    setScale(newScale);
    handleZoomChange(newScale);
    addHapticFeedback("light");
  };

  const handleResetZoom = () => {
    setScale(1);
    handleZoomChange(1);
    addHapticFeedback("medium");
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Control buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleResetZoom}
        >
          <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleZoomIn}
          disabled={scale >= 3}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div
        className={cn(
          "h-full w-full transition-all duration-300 overflow-hidden",
          isFullscreen && "fixed inset-0 z-50 bg-background"
        )}
        {...gestureHandlers}
      >
        <div
          ref={previewRef}
          className="h-full w-full transition-transform duration-200 origin-center"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
}
