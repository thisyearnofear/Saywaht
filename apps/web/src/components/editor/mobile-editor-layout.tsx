"use client";

import { useState, useCallback, useEffect } from "react";
import "@/app/editor/mobile-editor.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMobileContext } from "@/contexts/mobile-context";
import {
  Monitor,
  ChevronUp,
  ChevronDown,
  Play,
  Mic,
  Type,
  Layers,
  Video,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import { WorkingMobileTimeline } from "@/components/editor/working-mobile-timeline";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";
import { MobileTextPanel } from "@/components/editor/mobile-text-panel";
import { MobileEffectsPanel } from "@/components/editor/mobile-effects-panel";
import {
  MobileOnboardingOverlay,
  useMobileOnboarding,
} from "@/components/editor/mobile-onboarding-overlay";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { motion, AnimatePresence } from "motion/react";

import dynamic from "next/dynamic";

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
  hideOnboarding?: boolean;
}

export function MobileEditorLayout({
  children,
  className,
  hideOnboarding = false
}: MobileEditorLayoutProps) {
  const { isEditorMobileMode, toggleEditorMobileMode } = useMobileContext();
  const { isPlaying, toggle } = usePlaybackStore();
  const { mediaItems } = useMediaStore();

  // View mode: 'fullscreen' (default) or 'tools'
  const [viewMode, setViewMode] = useState<"fullscreen" | "tools">("fullscreen");

  // Active tool tabs:
  //   record  → MobileAudioPanel  (primary: voiceover recording)
  //   media   → MobileMediaPanel  (upload, library, project files)
  //   text    → MobileTextPanel
  //   effects → MobileEffectsPanel
  const [activeTab, setActiveTab] = useState<string>("record");

  // Smart default: if the project is empty, nudge users to add media first
  useEffect(() => {
    if (mediaItems.length === 0) {
      setActiveTab("media");
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
    setTimelineExpanded((prev) => !prev);
    setTimelineHeight((prev) => (prev === 120 ? 280 : 120));
  }, []);

  // Switch to tools view with specific tab
  const openTool = useCallback((tab: string) => {
    addHapticFeedback("medium");
    setActiveTab(tab);
    setViewMode("tools");
  }, []);

  // Toggle between fullscreen and tools
  const toggleViewMode = useCallback(() => {
    addHapticFeedback("medium");
    setViewMode((prev) => (prev === "fullscreen" ? "tools" : "fullscreen"));
  }, []);

  // Controls visibility in fullscreen mode
  const [isFullscreenControlsHidden, setIsFullscreenControlsHidden] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "h-full w-full flex flex-col bg-background overflow-hidden mobile-editor",
        className
      )}
    >
      {viewMode === "fullscreen" ? (
        /* ── Fullscreen mode: video fills the screen with a floating toolbar ── */
        <div className="flex-1 relative bg-black">
          {/* Compact branding header */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          >
            <div className="text-white font-black tracking-tighter text-2xl italic flex items-center gap-2 pb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary/20">
                W
              </div>
              saywaht
            </div>
            <div className="flex items-center gap-2 pb-4">
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

          <MobilePreviewPanel showResolution={false} showControls={false} />

          {/* Full-screen play/pause tap target */}
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

          {/* Floating action bar — safe-area aware, no double padding */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 250 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) {
                setIsFullscreenControlsHidden(true);
                addHapticFeedback("medium");
              }
            }}
            animate={{
              y: isFullscreenControlsHidden ? 300 : 0,
              opacity: isFullscreenControlsHidden ? 0 : 1
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-30 px-6 pt-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent safe-area-bottom"
            style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
          >
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 touch-none" />

            {/* Primary actions */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Button
                variant="secondary"
                size="lg"
                className="h-14 px-6 rounded-2xl bg-white text-black hover:bg-white/90 shadow-xl touch-manipulation border-none font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                onClick={() => openTool("record")}
              >
                <Mic className="h-5 w-5 mr-2 text-destructive animate-pulse" />
                Record
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-2xl touch-manipulation border border-white/20 active:scale-95 transition-all shadow-xl"
                  onClick={() => openTool("text")}
                  aria-label="Add Text"
                >
                  <Type className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-2xl touch-manipulation border border-white/20 active:scale-95 transition-all shadow-xl"
                  onClick={() => openTool("effects")}
                  aria-label="Add Effects"
                >
                  <Layers className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* "Open Tools" chevron button */}
            <button
              className="w-full flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition-colors touch-manipulation group pb-2"
              onClick={toggleViewMode}
            >
              <ChevronUp className="h-5 w-5 animate-bounce group-hover:text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                Open Tools
              </span>
            </button>
          </motion.div>

          {/* Restore Controls Button - visible when hidden */}
          <AnimatePresence>
            {isFullscreenControlsHidden && (
              <motion.button
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 h-12 w-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-2xl active:scale-90 transition-transform"
                onClick={() => {
                  setIsFullscreenControlsHidden(false);
                  addHapticFeedback("light");
                }}
              >
                <ChevronUp className="h-6 w-6" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ── Tools mode: compact preview + tabbed editor panels ── */
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 border-b bg-background/95 backdrop-blur-md z-30"
            style={{
              height: "3.5rem",
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            <div className="text-foreground font-black text-xl italic tracking-tighter flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                W
              </div>
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
            {/* Video preview — shrinks when timeline is expanded */}
            <div
              className={cn(
                "relative flex-shrink-0 bg-black overflow-hidden transition-[height] duration-500 ease-in-out",
                timelineExpanded ? "h-[22vh]" : "h-[32vh]"
              )}
            >
              <MobilePreviewPanel showResolution={true} />

              {/* Tap to play/pause */}
              <button
                className="absolute inset-0 flex items-center justify-center bg-transparent touch-manipulation z-10"
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

            {/* ── Tab Navigation ── */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                addHapticFeedback("light");
              }}
              className="flex-shrink-0 bg-background z-20 border-b border-border/50"
            >
              <div className="px-4 py-3">
                <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-muted/30 h-14 p-1.5 border border-border/40">
                  {/* Record — primary action, always first */}
                  <TabsTrigger
                    value="record"
                    className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                  >
                    <Mic className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Record</span>
                  </TabsTrigger>

                  {/* Media — upload / library / project files */}
                  <TabsTrigger
                    value="media"
                    className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                  >
                    <Video className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Media</span>
                  </TabsTrigger>

                  {/* Text overlays */}
                  <TabsTrigger
                    value="text"
                    className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                  >
                    <Type className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Text</span>
                  </TabsTrigger>

                  {/* Effects */}
                  <TabsTrigger
                    value="effects"
                    className="flex flex-col items-center justify-center gap-0.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg touch-manipulation transition-all duration-300"
                  >
                    <Layers className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">FX</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab content panels */}
              <div className="overflow-hidden bg-background" style={{ height: "30vh" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    className="h-full"
                  >
                    <TabsContent
                      value="record"
                      className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
                    >
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <MobileAudioPanel />
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
                  </motion.div>
                </AnimatePresence>
              </div>
            </Tabs>

            {/* ── Timeline — anchored at the bottom ── */}
            <div
              data-timeline-area
              className="flex-shrink-0 border-t border-border bg-background transition-[height] duration-500 ease-in-out mt-auto shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
              style={{ height: timelineHeight }}
            >
              <div className="h-10 flex items-center justify-between px-4 bg-muted/10 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isPlaying ? "bg-destructive animate-pulse" : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Timeline
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTimeline}
                  className="h-8 px-2 text-[9px] font-black uppercase tracking-widest hover:bg-primary/5 touch-manipulation"
                >
                  {timelineExpanded ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 mr-1" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 mr-1" />
                      Expand
                    </>
                  )}
                </Button>
              </div>
              <div className="h-[calc(100%-40px)]">
                <WorkingMobileTimeline
                  expanded={timelineExpanded}
                  onToggleExpand={toggleTimeline}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Onboarding Overlay */}
      {!hideOnboarding && (
        <MobileOnboardingOverlay
          isOpen={showOnboarding}
          onClose={skipOnboarding}
          onStartRecording={() => {
            completeOnboarding();
            openTool("record");
          }}
        />
      )}

      {/* Quick Actions - desktop only */}
      <div className="hidden md:block">
        <QuickActions />
      </div>
    </motion.div>
  );
}
