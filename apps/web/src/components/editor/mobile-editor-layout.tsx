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
        {/* Compact header - minimal impact on content */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white font-bold tracking-tight text-lg">saywaht</div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white/90 hover:text-white hover:bg-white/10 rounded-full"
              onClick={toggleEditorMobileMode}
            >
              <Monitor className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Full video preview with minimal UI */}
        <div className="flex-1 relative">
          <MobilePreviewPanel />
          
          {/* Play/pause overlay with bigger target */}
          <button
            className="absolute inset-0 flex items-center justify-center touch-manipulation z-10"
            onClick={() => {
              addHapticFeedback("light");
              toggle();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {!isPlaying && (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-2xl">
                <Play className="h-10 w-10 text-white fill-white ml-1" />
              </div>
            )}
          </button>
        </div>

        {/* Floating Action Bar - Optimized for thumb reach */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6 pb-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Quick action buttons - rounded and accessible */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="secondary"
              size="lg"
              className="h-16 px-6 rounded-2xl bg-white text-black hover:bg-white/90 shadow-xl touch-manipulation border-none font-bold"
              onClick={() => openTool('media')}
            >
              <Mic className="h-6 w-6 mr-2" />
              Record
            </Button>
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="icon"
                className="h-14 w-14 rounded-full bg-white/15 text-white hover:bg-white/25 backdrop-blur-md touch-manipulation border border-white/20"
                onClick={() => openTool('text')}
                aria-label="Add Text"
              >
                <Type className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary" 
                size="icon"
                className="h-14 w-14 rounded-full bg-white/15 text-white hover:bg-white/25 backdrop-blur-md touch-manipulation border border-white/20"
                onClick={() => openTool('effects')}
                aria-label="Add Effects"
              >
                <Layers className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          {/* Show all tools button - subtle but clear */}
          <button
            className="w-full flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors touch-manipulation pb-2"
            onClick={toggleViewMode}
          >
            <ChevronUp className="h-5 w-5 animate-bounce-slow" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Editor Mode</span>
          </button>
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

  // Tools mode: optimized editor layout
  return (
    <div 
      className={cn(
        "h-full w-full flex flex-col bg-background overflow-hidden mobile-editor safe-area",
        className
      )}
    >
      {/* Header with mode toggle - more compact */}
      <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur-md z-30">
        <div className="text-foreground font-bold text-base">saywaht</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold h-9 px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-full"
            onClick={toggleViewMode}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={toggleEditorMobileMode}
            aria-label="Switch to desktop mode"
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Video Preview - Optimized height for editing */}
        <div className={cn(
          "relative flex-shrink-0 transition-all duration-300 ease-in-out bg-black",
          timelineExpanded ? "h-[20vh]" : "h-[30vh]"
        )}>
          <MobilePreviewPanel />
          
          {/* Play/pause overlay */}
          <button
            className="absolute inset-0 flex items-center justify-center bg-transparent touch-manipulation"
            onClick={() => {
              addHapticFeedback("light");
              toggle();
            }}
          >
            {!isPlaying && (
              <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              </div>
            )}
          </button>
        </div>

        {/* Tab Navigation - Modern Segmented Control style */}
        <div className="flex-shrink-0 bg-background z-20">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              addHapticFeedback("light");
            }}
            className="w-full"
          >
            <div className="px-3 py-2">
              <TabsList className="w-full grid grid-cols-4 rounded-xl bg-muted/50 h-12 p-1 border border-border/50">
                <TabsTrigger
                  value="preview"
                  className="flex items-center justify-center rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation transition-all"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  <span className="text-[11px] font-bold">Files</span>
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="flex items-center justify-center rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation transition-all"
                >
                  <Mic className="h-4 w-4 mr-1.5" />
                  <span className="text-[11px] font-bold">Audio</span>
                </TabsTrigger>
                <TabsTrigger
                  value="text"
                  className="flex items-center justify-center rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation transition-all"
                >
                  <Type className="h-4 w-4 mr-1.5" />
                  <span className="text-[11px] font-bold">Text</span>
                </TabsTrigger>
                <TabsTrigger
                  value="effects"
                  className="flex items-center justify-center rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm touch-manipulation transition-all"
                >
                  <Layers className="h-4 w-4 mr-1.5" />
                  <span className="text-[11px] font-bold">FX</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content - Improved space utilization */}
            <div className="flex-1 min-h-0 overflow-hidden bg-background">
              <TabsContent value="preview" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col border-t border-border/50">
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Play className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Project Files</h3>
                  <p className="text-sm text-muted-foreground max-w-[200px]">
                    Manage your clips and media assets here.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="media" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col border-t border-border/50">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileMediaPanel />
                </div>
              </TabsContent>

              <TabsContent value="text" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col border-t border-border/50">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileTextPanel />
                </div>
              </TabsContent>

              <TabsContent value="effects" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col border-t border-border/50">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MobileEffectsPanel />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Timeline - Fixed height for better control */}
        <div 
          data-timeline-area
          className="flex-shrink-0 border-t border-border bg-background transition-all duration-300 ease-in-out mt-auto"
          style={{ height: timelineHeight }}
        >
          <div className="h-10 flex items-center justify-between px-4 bg-muted/20 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Timeline</span>
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <span className="text-[10px] font-medium text-muted-foreground">{isPlaying ? "Playing" : "Paused"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTimeline}
              className="h-8 px-2 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 touch-manipulation"
            >
              {timelineExpanded ? (
                <><ChevronDown className="h-3.5 w-3.5 mr-1" />Collapse</>
              ) : (
                <><ChevronUp className="h-3.5 w-3.5 mr-1" />Expand</>
              )}
            </Button>
          </div>
          <div className="h-[calc(100%-40px)]">
            <WorkingMobileTimeline expanded={timelineExpanded} onToggleExpand={toggleTimeline} />
          </div>
        </div>
      </div>

      {/* Status Bar - hidden or minimal on mobile */}
      <div className="hidden md:block">
        <StatusBar />
      </div>

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
