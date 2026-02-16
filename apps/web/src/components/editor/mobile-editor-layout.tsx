"use client";

import { useState, useCallback } from "react";
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
  Type,
  Layers
} from "@/lib/icons";
import { cn } from "@/lib/utils";
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

export function MobileEditorLayout({ children, className }: MobileEditorLayoutProps) {
  const { isEditorMobileMode, toggleEditorMobileMode } = useMobileContext();
  const { isPlaying, toggle } = usePlaybackStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("media");
  
  // Timeline state - larger default for better usability
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(false);
  const [timelineHeight, setTimelineHeight] = useState<number>(120); // Increased from 80px
  
  // Preview state
  const [previewExpanded, setPreviewExpanded] = useState<boolean>(false);
  
  // Onboarding state
  const { showOnboarding, completeOnboarding, skipOnboarding } = useMobileOnboarding();

  // Set up playback controls
  usePlaybackControls();

  // Handle timeline expand/collapse with animation
  const toggleTimeline = useCallback(() => {
    addHapticFeedback("light");
    setTimelineExpanded(prev => !prev);
    setTimelineHeight(prev => prev === 120 ? 280 : 120);
  }, []);

  // Handle preview expand/collapse
  const togglePreview = useCallback(() => {
    addHapticFeedback("medium");
    setPreviewExpanded(prev => !prev);
  }, []);

  // Calculate preview height based on state - increased defaults for better usability
  const getPreviewHeight = () => {
    if (previewExpanded) return "65vh";
    if (timelineExpanded) return "30vh";
    return "45vh"; // Increased from 35vh
  };

  return (
    <div 
      className={cn(
        "h-full w-full flex flex-col bg-background overflow-hidden mobile-editor safe-area",
        className
      )}
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
            previewExpanded ? "h-[65vh]" : timelineExpanded ? "h-[30vh]" : "h-[45vh]"
          )}
        >
          <MobilePreviewPanel />
          
          {/* Expand/collapse preview button - larger and more visible */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 h-10 px-4 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm rounded-full min-h-[44px]"
            onClick={togglePreview}
          >
            {previewExpanded ? (
              <>
                <ChevronDown className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Show Tools</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Fullscreen</span>
              </>
            )}
          </Button>
          
          {/* Quick play/pause overlay */}
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 active:bg-black/20 transition-colors touch-manipulation"
            onClick={() => {
              addHapticFeedback("light");
              toggle();
            }}
          >
            {isPlaying && (
              <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                <Pause className="h-10 w-10 text-white" />
              </div>
            )}
          </button>
        </div>

        {/* Tab Navigation - Redesigned with larger touch targets */}
        <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-md">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              addHapticFeedback("light");
            }}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4 rounded-none border-0 bg-transparent h-16 p-1">
              <TabsTrigger
                value="preview"
                className="relative flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl mx-0.5 h-14 touch-manipulation"
              >
                <Play className="h-6 w-6" />
                <span className="text-xs font-medium">Preview</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full opacity-0 data-[state=active]:opacity-100 transition-opacity" />
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="relative flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl mx-0.5 h-14 touch-manipulation"
              >
                <Mic className="h-6 w-6" />
                <span className="text-xs font-medium">Record</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full opacity-0 data-[state=active]:opacity-100 transition-opacity" />
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="relative flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl mx-0.5 h-14 touch-manipulation"
              >
                <Type className="h-6 w-6" />
                <span className="text-xs font-medium">Text</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full opacity-0 data-[state=active]:opacity-100 transition-opacity" />
              </TabsTrigger>
              <TabsTrigger
                value="effects"
                className="relative flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl mx-0.5 h-14 touch-manipulation"
              >
                <Layers className="h-6 w-6" />
                <span className="text-xs font-medium">Effects</span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full opacity-0 data-[state=active]:opacity-100 transition-opacity" />
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

        {/* Timeline - Improved with dedicated expand button */}
        <div 
          data-timeline-area
          className="flex-shrink-0 border-t border-border bg-background transition-all duration-300 ease-out"
          style={{ height: timelineHeight }}
        >
          {/* Timeline header with expand button */}
          <div 
            className="h-10 flex items-center justify-between px-3 bg-muted/30 touch-manipulation"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTimeline}
              className="h-8 px-3 text-xs font-medium min-h-[36px] touch-manipulation"
            >
              {timelineExpanded ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
          
          {/* Timeline content */}
          <div className="h-[calc(100%-40px)]">
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
