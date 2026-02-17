"use client";

import { useState, useCallback, useEffect } from "react";
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
  Layers,
  Sparkles
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
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
import { motion, AnimatePresence } from "motion/react";

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
  const { mediaItems } = useMediaStore();
  
  // View mode: 'fullscreen' (default) or 'tools'
  const [viewMode, setViewMode] = useState<'fullscreen' | 'tools'>('fullscreen');
  
  // Active tool when in tools mode - Smart Default: Library if project is empty
  const [activeTab, setActiveTab] = useState<string>("media");

  useEffect(() => {
    if (mediaItems.length === 0) {
      setActiveTab("library");
    }
  }, [mediaItems.length]);
  
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "h-full w-full flex flex-col bg-background overflow-hidden mobile-editor safe-area",
        className
      )}
    >
      {viewMode === 'fullscreen' ? (
        /* Fullscreen mode: video takes most of the screen with floating toolbar */
        <div className="flex-1 relative bg-black">
          {/* Compact header - fixed overlap and improved branding */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
            <div className="text-white font-black tracking-tighter text-2xl italic flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center italic text-sm shadow-lg shadow-primary/20">W</div>
              saywaht
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white/90 hover:text-white hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 shadow-xl"
                onClick={toggleEditorMobileMode}
                aria-label="Switch to desktop"
              >
                <Monitor className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <MobilePreviewPanel showResolution={false} />
          
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
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-2xl border border-white/20 shadow-2xl"
              >
                <Play className="h-12 w-12 text-white fill-white ml-1.5" />
              </motion.div>
            )}
          </button>

          {/* Floating Action Bar - Optimized for thumb reach */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-6 pb-14 bg-gradient-to-t from-black/95 via-black/40 to-transparent">
            {/* Quick action buttons - rounded and accessible */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <Button
                variant="secondary"
                size="lg"
                className="h-16 px-8 rounded-[2rem] bg-white text-black hover:bg-white/90 shadow-2xl touch-manipulation border-none font-black text-base uppercase tracking-widest active:scale-95 transition-all"
                onClick={() => openTool('media')}
              >
                <Mic className="h-6 w-6 mr-3 text-red-500 animate-pulse" />
                Record
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-16 w-16 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-2xl touch-manipulation border border-white/20 active:scale-95 transition-all shadow-xl"
                  onClick={() => openTool('text')}
                  aria-label="Add Text"
                >
                  <Type className="h-7 w-7" />
                </Button>
                <Button
                  variant="secondary" 
                  size="icon"
                  className="h-16 w-16 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-2xl touch-manipulation border border-white/20 active:scale-95 transition-all shadow-xl"
                  onClick={() => openTool('effects')}
                  aria-label="Add Effects"
                >
                  <Layers className="h-7 w-7" />
                </Button>
              </div>
            </div>
            
            {/* Show all tools button - subtle but clear */}
            <button
              className="w-full flex flex-col items-center gap-2 text-white/40 hover:text-white transition-colors touch-manipulation group"
              onClick={toggleViewMode}
            >
              <ChevronUp className="h-6 w-6 animate-bounce-slow group-hover:text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] ml-1">Open Editor</span>
            </button>
          </div>
        </div>
      ) : (
        /* Tools mode: optimized editor layout */
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header with mode toggle - more compact */}
          <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur-md z-30">
            <div className="text-foreground font-black text-xl italic tracking-tighter flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center italic text-[10px] text-white">W</div>
              saywaht
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-black uppercase tracking-widest h-9 px-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-full border border-primary/10"
                onClick={toggleViewMode}
              >
                Full Preview
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-border/50 bg-muted/30"
                onClick={toggleEditorMobileMode}
                aria-label="Switch to desktop mode"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Video Preview - Optimized height for editing */}
            <div className={cn(
              "relative flex-shrink-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) bg-black overflow-hidden",
              timelineExpanded ? "h-[22vh]" : "h-[32vh]"
            )}>
              <MobilePreviewPanel showResolution={true} />
              
              {/* Play/pause overlay */}
              <button
                className="absolute inset-0 flex items-center justify-center bg-transparent touch-manipulation"
                onClick={() => {
                  addHapticFeedback("light");
                  toggle();
                }}
              >
                {!isPlaying && (
                  <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg">
                    <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                  </div>
                )}
              </button>
            </div>

            {/* Tab Navigation - Modern Segmented Control style */}
            <div className="flex-shrink-0 bg-background z-20 border-b border-border/50">
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value);
                  addHapticFeedback("light");
                }}
                className="w-full"
              >
                <div className="px-4 py-3">
                  <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-muted/30 h-14 p-1.5 border border-border/40">
                    <TabsTrigger
                      value="preview"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                    >
                      <Play className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Files</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="media"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                    >
                      <Mic className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Audio</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="text"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                    >
                      <Type className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Text</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="effects"
                      className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                    >
                      <Layers className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">FX</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Content - Optimized scroll area */}
                <div className="flex-1 min-h-0 overflow-hidden bg-background">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <TabsContent value="preview" className="m-0 h-[30vh] data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                          <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-4 border border-border/50">
                            <Play className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                          <h3 className="font-bold text-base mb-1">Project Assets</h3>
                          <p className="text-xs text-muted-foreground max-w-[180px] leading-relaxed">
                            Select media clips to add to your commentary timeline.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="media" className="m-0 h-[30vh] data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <MobileMediaPanel />
                        </div>
                      </TabsContent>

                      <TabsContent value="text" className="m-0 h-[30vh] data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <MobileTextPanel />
                        </div>
                      </TabsContent>

                      <TabsContent value="effects" className="m-0 h-[30vh] data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <MobileEffectsPanel />
                        </div>
                      </TabsContent>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </Tabs>
            </div>

            {/* Timeline - Robust anchoring at bottom */}
            <div 
              data-timeline-area
              className="flex-shrink-0 border-t border-border bg-background transition-all duration-500 ease-in-out mt-auto shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"
              style={{ height: timelineHeight }}
            >
              <div className="h-10 flex items-center justify-between px-4 bg-muted/10 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", isPlaying ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30")} />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Timeline</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTimeline}
                  className="h-8 px-2 text-[9px] font-black uppercase tracking-widest hover:bg-primary/5 touch-manipulation"
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
        </div>
      )}

      {/* Global Onboarding Overlay - Ensured visibility and consistency */}
      <MobileOnboardingOverlay
        isOpen={showOnboarding}
        onClose={skipOnboarding}
        onStartRecording={() => {
          completeOnboarding();
          openTool('media');
        }}
      />

      {/* Quick Actions - Floating above everything else */}
      <div className="hidden md:block">
        <QuickActions />
      </div>
    </motion.div>
  );
}
