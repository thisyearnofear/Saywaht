"use client";

import { useRef } from "react";
import { PreviewPanel } from "@/components/editor/preview-panel";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useMobileContext } from "@/contexts/mobile-context";
import { usePinchZoom } from "@/hooks/use-touch-gestures";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { useCanvasStore } from "@/stores/canvas-store";
import { useEditorStore } from "@/stores/editor-store";

interface MobilePreviewPanelProps {
  className?: string;
  showResolution?: boolean;
  /** Hide the zoom/fit controls — useful in fullscreen cinematic mode */
  showControls?: boolean;
  /**
   * How playback controls are rendered inside PreviewPanel.
   * Default is "overlay" (floating pill) so they don't consume vertical space
   * in either fullscreen or tools mode on mobile.
   */
  controlsVariant?: "topbar" | "overlay";
}

export function MobilePreviewPanel({
  className,
  showResolution = false,
  showControls = true,
  controlsVariant = "overlay",
}: MobilePreviewPanelProps) {
  const { orientation } = useMobileContext();
  const previewRef = useRef<HTMLDivElement>(null);
  const { canvasSize } = useCanvasStore();
  const { videoObjectFit, toggleVideoObjectFit } = useEditorStore();

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

  const handleToggleFit = () => {
    toggleVideoObjectFit();
    addHapticFeedback("light");
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Canvas Size Indicator - only show if explicitly requested */}
      {showResolution && (
        <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full border border-white/20 backdrop-blur-sm font-bold">
          {canvasSize.width} × {canvasSize.height}
        </div>
      )}

      {/* Zoom / fit controls — only visible in editing (tools) mode */}
      {showControls && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full shadow-lg"
            onClick={handleToggleFit}
            aria-label={videoObjectFit === "contain" ? "Fill frame" : "Fit frame"}
          >
            {videoObjectFit === "contain" ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <div className="flex flex-col bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white rounded-full"
              onClick={handleZoomIn}
              disabled={scale >= 3}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <button
              className="h-7 flex items-center justify-center text-[9px] font-black text-white/80"
              onClick={handleResetZoom}
              aria-label="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white rounded-full"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div
        className="h-full w-full overflow-hidden"
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
          <PreviewPanel controlsVariant={controlsVariant} />
        </div>
      </div>
    </div>
  );
}
