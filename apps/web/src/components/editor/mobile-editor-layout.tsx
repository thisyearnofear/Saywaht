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
  
  // View mode: 'fullscreen' (default) or 'tools'
  const [viewMode, setViewMode] = useState<'fullscreen' | 'tools'>('fullscreen');
  
  // Active tool when in tools mode
  const [activeTab, setActiveTab] = useState<string>("media");
  
  // Timeline state
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(false);
  const [timelineHeight, setTimelineHeight] = useState<number>(120);
  
  // Onboarding state
  const { showOnboarding, completeOnboarding, skipOnboarding } = useMobileOnboarding();

  // Set up playback controls
  usePlaybackControls();

  // Handle timeline expand/collapse
  const toggleTimeline = useCallback(() => {
    addHapticFeedback("light");
    setTimelineExpanded(prev => !prev);
    setTimelineHeight(prev => prev === 120 ? 280 : 120);
  }, []);

  // Switch to tools view with specific tab
  const openTool = useCallback((tab: string) => {
    addHapticFeedback("medium");
    setActiveTab(tab);
    setViewMode('tools');
  }, []);

  // Toggle between fullscreen and tools
  const toggleViewMode = useCallback(() => {
    addHapticFeedback("medium");
    setViewMode(prev => prev === 'fullscreen' ? 'tools' : 'fullscreen');
  }, []);

  // Fullscreen mode: video takes most of the screen with floating toolbar
  if (viewMode === 'fullscreen') {
    return (
      <div 
        className={cn(
          "h-full w-full flex flex-col bg-black overflow-hidden mobile-editor safe-area",
          className
        )}
      >
        {/* Minimal header - just logo and desktop toggle */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3">
          <div className="text-white/80 text-sm font-medium">saywaht</div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10"
            onClick={toggleEditorMobileMode}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>

        {/* Full video preview */}
        <div className="flex-1 relative">
          <MobilePreviewPanel />
          
          {/* Play/pause overlay */}
          <button
            className="absolute inset-0 flex items-center justify-center touch-manipulation"
            onClick={() => {
              addHapticFeedback("light");
              toggle();
            }}
          >
            {!isPlaying && (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Play className="h-10 w-10 text-white ml-1" />
              </div>
            )}
          </button>
        </div>

        {/* Floating Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 safe-area-bottom">
          {/* Quick action buttons */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <Button
              variant="secondary"
              size="lg"
              className="h-14 px-6 rounded-full bg-white/90 text-black hover:bg-white shadow-lg touch-manipulation"
              onClick={() => openTool('media')}
            >
              <Mic className="h-5 w-5 mr-2" />
              Record
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-14 px-6 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm touch-manipulation"
              onClick={() => openTool('text')}
            >
              <Type className="h-5 w-5 mr-2" />
              Text
            </Button>
            <Button
              variant="secondary" 
              size="lg"
              className="h-14 px-6 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm touch-manipulation"
              onClick={() => openTool('effects')}
            >
              <Layers className="h-5 w-5 mr-2" />
              FX
            </Button>
          </div>
          
          {/* Show all tools button */}
          <Button
            variant="ghost"
            className="w-full h-12 text-white/70 hover:text-white hover:bg-white/10 touch-manipulation"
            onClick={toggleViewMode}
          >
            <ChevronUp className="h-5 w-5 mr-2" />
            Show All Tools & Timeline
          </Button>
        </div>

        {/* Onboarding */}
        <MobileOnboardingOverlay
          isOpen={showOnboarding}
          onClose={skipOnboarding}
          onStartRecording={() => {
            completeOnboarding();
            openTool('media');
          }}
        />
      </div>
    );
  }

  // Tools mode: traditional editor layout
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
          <Monitor className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Video Preview - Smaller in tools mode */}
        <div className={cn(
          "relative flex-shrink-0 transition-all duration-300 ease-out",
          timelineExpanded ? "h-[25vh]" : "h-[35vh]"
        )}>
          <MobilePreviewPanel />
          
          {/* Fullscreen button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 h-9 px-4 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm rounded-full touch-manipulation"
            onClick={toggleViewMode}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium">Fullscreen</span>
          </Button>
          
          {/* Play/pause overlay */}
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 active:bg-black/20 transition-colors touch-manipulation"
            onClick={() => {
              addHapticFeedback("light");
              toggle();
            }}
          >
            {isPlaying && (
              <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                <Pause className="h-8 w-8 text-white" />
              </div>
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-md">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              addHapticFeedback("light");
            }}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4 rounded-none border-0 bg-transparent h-14 p-1">
              <TabsTrigger
                value="preview"
                className="relative flex flex-col items-center justify-center gap-0.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg mx-0.5 h-12 touch-manipulation"
              >
                <Play className="h-5 w-5" />
                <span className="text-[10px] font-medium">Preview</span>
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="relative flex flex-col items-center justify-center gap-0.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg mx-0.5 h-12 touch-manipulation"
              >
                <Mic className="h-5 w-5" />
                <span className="text-[10px] font-medium">Record</span>
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="relative flex flex-col items-center justify-center gap-0.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg mx-0.5 h-12 touch-manipulation"
              >
                <Type className="h-5 w-5" />
                <span className="text-[10px] font-medium">Text</span>
              </TabsTrigger>
              <TabsTrigger
                value="effects"
                className="relative flex flex-col items-center justify-center gap-0.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg mx-0.5 h-12 touch-manipulation"
              >
                <Layers className="h-5 w-5" />
                <span className="text-[10px] font-medium">Effects</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="preview" className="m-0 h-full data-[state=active]:block">
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">Tap the video to play/pause</p>
                  <p className="text-xs mt-1">Use timeline below to scrub</p>
                </div>
              </TabsContent>

              <TabsContent value="media" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileMediaPanel />
                </div>
              </TabsContent>

              <TabsContent value="text" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileTextPanel />
                </div>
              </TabsContent>

              <TabsContent value="effects" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileEffectsPanel />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Timeline */}
        <div 
          data-timeline-area
          className="flex-shrink-0 border-t border-border bg-background transition-all duration-300 ease-out"
          style={{ height: timelineHeight }}
        >
          <div className="h-10 flex items-center justify-between px-3 bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTimeline}
              className="h-8 px-3 text-xs font-medium touch-manipulation"
            >
              {timelineExpanded ? (
                <><ChevronDown className="h-4 w-4 mr-1" />Collapse</>
              ) : (
                <><ChevronUp className="h-4 w-4 mr-1" />Expand</>
              )}
            </Button>
          </div>
          <div className="h-[calc(100%-40px)]">
            <WorkingMobileTimeline expanded={timelineExpanded} onToggleExpand={toggleTimeline} />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Floating UI Elements */}
      <QuickActions />

      {/* Onboarding */}
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
