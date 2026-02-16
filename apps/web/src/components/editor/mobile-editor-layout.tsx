"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import "@/app/editor/mobile-editor.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMobileContext } from "@/contexts/mobile-context";
import { 
  Loader2, 
  Smartphone, 
  Monitor, 
  ChevronUp, 
  ChevronDown,
  Play,
  Pause,
  Mic,
  Image as ImageIcon,
  Type,
  Settings,
  Layers
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePanelStore } from "@/stores/panel-store";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackStore } from "@/stores/playback-store";
import { StatusBar } from "@/components/editor/status-bar";
import { WorkingMobileTimeline } from "@/components/editor/working-mobile-timeline";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";
import { MobileTextPanel } from "@/components/editor/mobile-text-panel";
import { MobileEffectsPanel } from "@/components/editor/mobile-effects-panel";
import {
  MobileOnboardingOverlay,
  useMobileOnboarding,
} from "@/components/editor/mobile-onboarding-overlay";
import { addHapticFeedback } from "@/lib/mobile-utils";

// Import components dynamically to match the main editor page
import dynamic from "next/dynamic";

// Lazy load heavy components
const EditorHeader = dynamic(
  () => import("@/components/editor-header").then((mod) => mod.EditorHeader),
  {
    ssr: false,
    loading: () => (
      <div className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    ),
  }
);

const QuickActions = dynamic(
  () =>
    import("@/components/editor/quick-actions").then((mod) => ({
      default: mod.QuickActions,
    })),
  { ssr: false }
);

interface MobileEditorLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

// Swipe direction type
type SwipeDirection = "up" | "down" | "left" | "right" | null;

export function MobileEditorLayout({ children, className }: MobileEditorLayoutProps) {
  const { isEditorMobileMode, toggleEditorMobileMode } = useMobileContext();
  const { isPlaying, toggle } = usePlaybackStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("preview");
  
  // Timeline state
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(false);
  const [timelineHeight, setTimelineHeight] = useState<number>(80); // Default collapsed height
  
  // Preview state
  const [previewExpanded, setPreviewExpanded] = useState<boolean>(false);
  
  // Touch gesture state
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const lastTouchY = useRef<number>(0);
  const isDraggingTimeline = useRef<boolean>(false);
  
  // Onboarding state
  const { showOnboarding, completeOnboarding, skipOnboarding } = useMobileOnboarding();

  // Set up playback controls
  usePlaybackControls();

  // Handle timeline expand/collapse with animation
  const toggleTimeline = useCallback(() => {
    addHapticFeedback("light");
    setTimelineExpanded(prev => !prev);
    setTimelineHeight(prev => prev === 80 ? 280 : 80);
  }, []);

  // Handle preview expand/collapse
  const togglePreview = useCallback(() => {
    addHapticFeedback("medium");
    setPreviewExpanded(prev => !prev);
  }, []);

  // Tab switching with swipe
  const tabs = ["preview", "media", "text", "effects"];
  const handleTabSwipe = useCallback((direction: "left" | "right") => {
    const currentIndex = tabs.indexOf(activeTab);
    if (direction === "left" && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      addHapticFeedback("light");
    } else if (direction === "right" && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
      addHapticFeedback("light");
    }
  }, [activeTab, tabs]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    lastTouchY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isDraggingTimeline.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = touchStartY.current - touch.clientY;
    const deltaX = touchStartX.current - touch.clientX;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);
    
    // Determine if we're dragging the timeline
    if (!isDraggingTimeline.current && absDeltaY > absDeltaX && absDeltaY > 10) {
      // Check if touch is in timeline area
      const target = e.target as HTMLElement;
      const isInTimeline = target.closest('[data-timeline-area]');
      if (isInTimeline) {
        isDraggingTimeline.current = true;
      }
    }
    
    // Handle timeline drag
    if (isDraggingTimeline.current && timelineExpanded) {
      e.preventDefault();
      const dragDelta = lastTouchY.current - touch.clientY;
      setTimelineHeight(prev => {
        const newHeight = prev + dragDelta;
        return Math.max(80, Math.min(400, newHeight));
      });
    }
    
    lastTouchY.current = touch.clientY;
  }, [timelineExpanded]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaY = touchStartY.current - touch.clientY;
    const deltaX = touchStartX.current - touch.clientX;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);
    const timeDelta = Date.now() - touchStartTime.current;
    
    // Handle timeline swipe
    if (isDraggingTimeline.current) {
      // Snap to expanded or collapsed
      if (timelineHeight > 180) {
        setTimelineExpanded(true);
        setTimelineHeight(280);
      } else {
        setTimelineExpanded(false);
        setTimelineHeight(80);
      }
      isDraggingTimeline.current = false;
      return;
    }
    
    // Quick swipe detection (fast, short movement)
    const isQuickSwipe = timeDelta < 300;
    const swipeThreshold = 50;
    
    if (isQuickSwipe) {
      if (absDeltaY > absDeltaX && absDeltaY > swipeThreshold) {
        // Vertical swipe - toggle timeline
        if (deltaY > 0) {
          // Swipe up - expand
          setTimelineExpanded(true);
          setTimelineHeight(280);
        } else {
          // Swipe down - collapse
          setTimelineExpanded(false);
          setTimelineHeight(80);
        }
        addHapticFeedback("light");
      } else if (absDeltaX > absDeltaY && absDeltaX > swipeThreshold) {
        // Horizontal swipe - change tabs
        if (deltaX > 0) {
          handleTabSwipe("left");
        } else {
          handleTabSwipe("right");
        }
      }
    }
  }, [timelineHeight, handleTabSwipe]);

  // Calculate preview height based on state
  const getPreviewHeight = () => {
    if (previewExpanded) return "60vh";
    if (timelineExpanded) return "25vh";
    return "35vh";
  };

  return (
    <div 
      className={cn(
        "h-full w-full flex flex-col bg-background overflow-hidden mobile-editor safe-area",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with mode toggle */}
      <div className="relative flex-shrink-0">
        <EditorHeader />
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-2 h-10 w-10 min-h-[44px] min-w-[44px] z-10 bg-background/80 backdrop-blur-sm"
          onClick={toggleEditorMobileMode}
        >
          {isEditorMobileMode ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Video Preview - Always visible but resizable */}
        <div 
          className={cn(
            "relative flex-shrink-0 transition-all duration-300 ease-out",
            previewExpanded ? "h-[60vh]" : timelineExpanded ? "h-[25vh]" : "h-[35vh]"
          )}
        >
          <MobilePreviewPanel />
          
          {/* Expand/collapse preview button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 h-8 px-3 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={togglePreview}
          >
            {previewExpanded ? (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Tools
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Expand
              </>
            )}
          </Button>
          
          {/* Quick play/pause overlay */}
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 active:bg-black/20 transition-colors"
            onClick={toggle}
          >
            {isPlaying && (
              <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                <Pause className="h-8 w-8 text-white" />
              </div>
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              addHapticFeedback("light");
            }}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4 rounded-none border-0 bg-transparent h-14">
              <TabsTrigger
                value="preview"
                className="flex flex-col items-center gap-1 data-[state=active]:bg-muted/50 rounded-lg mx-1 h-12"
              >
                <Play className="h-4 w-4" />
                <span className="text-[10px]">Preview</span>
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="flex flex-col items-center gap-1 data-[state=active]:bg-muted/50 rounded-lg mx-1 h-12"
              >
                <Mic className="h-4 w-4" />
                <span className="text-[10px]">Record</span>
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex flex-col items-center gap-1 data-[state=active]:bg-muted/50 rounded-lg mx-1 h-12"
              >
                <Type className="h-4 w-4" />
                <span className="text-[10px]">Text</span>
              </TabsTrigger>
              <TabsTrigger
                value="effects"
                className="flex flex-col items-center gap-1 data-[state=active]:bg-muted/50 rounded-lg mx-1 h-12"
              >
                <Layers className="h-4 w-4" />
                <span className="text-[10px]">FX</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent 
                value="preview" 
                className="m-0 h-full data-[state=active]:block"
              >
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">Tap the video to play/pause</p>
                  <p className="text-xs mt-1">Use timeline below to scrub</p>
                </div>
              </TabsContent>

              <TabsContent 
                value="media" 
                className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileMediaPanel />
                </div>
              </TabsContent>

              <TabsContent 
                value="text" 
                className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileTextPanel />
                </div>
              </TabsContent>

              <TabsContent 
                value="effects" 
                className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileEffectsPanel />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Timeline - Swipeable and expandable */}
        <div 
          data-timeline-area
          className="flex-shrink-0 border-t border-border bg-background transition-all duration-300 ease-out"
          style={{ height: timelineHeight }}
        >
          {/* Timeline drag handle */}
          <div 
            className="h-6 flex items-center justify-center cursor-ns-resize touch-manipulation"
            onClick={toggleTimeline}
          >
            <div className="w-12 h-1 bg-border rounded-full" />
          </div>
          
          {/* Timeline content */}
          <div className="h-[calc(100%-24px)]">
            <WorkingMobileTimeline
              expanded={timelineExpanded}
              onToggleExpand={toggleTimeline}
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Floating UI Elements */}
      <QuickActions />

      {/* Mobile Onboarding Overlay */}
      <MobileOnboardingOverlay
        isOpen={showOnboarding}
        onClose={skipOnboarding}
        onStartRecording={() => {
          completeOnboarding();
          setActiveTab("media");
        }}
      />
    </div>
  );
}
