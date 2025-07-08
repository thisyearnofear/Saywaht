"use client";

import * as React from "react";
import { PreviewPanel } from "@/components/editor/preview-panel";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileContext } from "@/contexts/mobile-context";

interface MobilePreviewPanelProps {
  className?: string;
}

export function MobilePreviewPanel({ className }: MobilePreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { orientation } = useMobileContext();

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div className="absolute top-2 right-2 z-10">
        <Button 
          variant="secondary" 
          size="icon" 
          className="h-8 w-8 bg-background/80 backdrop-blur-sm" 
          onClick={toggleFullscreen}
        >
          {isFullscreen ? 
            <Minimize2 className="h-4 w-4" /> : 
            <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      
      <div 
        className={cn(
          "h-full w-full transition-all duration-300",
          isFullscreen && "fixed inset-0 z-50 bg-background"
        )}
      >
        <PreviewPanel />
      </div>
    </div>
  );
}