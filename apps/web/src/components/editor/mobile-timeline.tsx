"use client";

import * as React from "react";
import { Timeline } from "@/components/editor/timeline";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileContext } from "@/contexts/mobile-context";

interface MobileTimelineProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function MobileTimeline({ 
  expanded = false, 
  onToggleExpand 
}: MobileTimelineProps) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  const { orientation } = useMobileContext();
  
  // Use the provided toggle function or the internal state
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  };
  
  // Determine the actual expanded state
  const actualExpanded = onToggleExpand ? expanded : isExpanded;
  
  // Calculate height based on expanded state and orientation
  const getTimelineHeight = () => {
    if (actualExpanded) {
      return orientation === "portrait" ? "50vh" : "70vh";
    }
    return "120px";
  };

  return (
    <div 
      className={cn(
        "border-t border-border transition-all duration-300 ease-in-out",
        actualExpanded ? "flex-1" : "flex-none"
      )}
      style={{ height: getTimelineHeight() }}
    >
      <div 
        className="flex items-center justify-center h-6 bg-muted cursor-pointer"
        onClick={handleToggle}
      >
        {actualExpanded ? 
          <>
            <ChevronDown className="h-4 w-4 mr-1" /> 
            <span className="text-xs">Collapse Timeline</span>
            <Minimize2 className="h-3 w-3 ml-1" />
          </> : 
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            <span className="text-xs">Expand Timeline</span>
            <Maximize2 className="h-3 w-3 ml-1" />
          </>}
      </div>
      <div className="h-[calc(100%-24px)]">
        <Timeline />
      </div>
    </div>
  );
}