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
  Share2,
  Zap,
  Loader2,
  Undo2,
  Redo2,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";
import { useEditorHistory } from "@/hooks/use-editor-history";
import { MobileTimeline } from "@/components/editor/mobile-timeline";
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
import { toast } from "sonner";

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
  const { isEditorMobileMode, toggleEditorMobileMode, orientation } = useMobileContext();
  const { isPlaying, toggle } = usePlaybackStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { tracks } = useTimelineStore();
  const { isFarcasterMiniApp } = useFarcasterContext();
  const { shareToFarcaster, isSharing } = useFarcasterShare();
  const { undo, redo, canUndo, canRedo } = useEditorHistory();

  // View mode: 'fullscreen' (default) or 'tools'
  const [viewMode, setViewMode] = useState<"fullscreen" | "tools">("fullscreen");

  // Cinematic mode: auto-hide tools/timeline in landscape
  const isCinematicMode = orientation === "landscape";

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

  // Tools section state
  const [isToolsCollapsed, setIsToolsCollapsed] = useState<boolean>(false);
  const [isToolsMaximized, setIsToolsMaximized] = useState<boolean>(false);

  // Onboarding state
  const { showOnboarding, completeOnboarding, skipOnboarding } = useMobileOnboarding();

  // Set up playback controls
  usePlaybackControls();

  // Handle Finish / Share
  const handleFinish = useCallback(async () => {
    addHapticFeedback("heavy");
    if (!activeProject || tracks.length === 0) {
      toast.error("Add some content first!");
      return;
    }

    if (isFarcasterMiniApp) {
      await shareToFarcaster();
    } else {
      // Redirect to minting page or handle deployment
      toast.info("Preparing to launch...");
      window.location.href = `/mint/${activeProject.id}`;
    }
  }, [activeProject, tracks.length, isFarcasterMiniApp, shareToFarcaster]);

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
    setIsToolsCollapsed(false);
    setIsToolsMaximized(false);
  }, []);

  // Toggle between fullscreen and tools
  const toggleViewMode = useCallback(() => {
    addHapticFeedback("medium");
    setViewMode((prev) => (prev === "fullscreen" ? "tools" : "fullscreen"));
    // Always ensure tools are in a sane state when entering tools mode
    setIsToolsCollapsed(false);
    setIsToolsMaximized(false);
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
        isCinematicMode && "cinematic-mode",
        className
      )}
    >
      {/* View Mode Wrapper */}
      <AnimatePresence mode="wait">
        {viewMode === "fullscreen" || isCinematicMode ? (
          /* ── Fullscreen mode: video fills the screen with a floating toolbar ── */
          <motion.div
            key="fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 relative bg-black"
          >
            {/* Compact branding header */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 bg-gradient-to-b from-black/80 via-black/20 to-transparent pt-safe"
            >
              <div className="text-white font-black tracking-tighter text-2xl italic flex items-center gap-2 py-4">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-sm font-bold text-white shadow-2xl shadow-primary/40">
                  W
                </div>
                saywaht
              </div>

              <div className="flex items-center gap-2 py-4">
                {!isCinematicMode && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-widest px-6 shadow-xl active:scale-95 transition-all"
                    onClick={handleFinish}
                    disabled={isSharing}
                  >
                    {isSharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFarcasterMiniApp ? (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2 fill-white" />
                        Finish
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <MobilePreviewPanel
              showResolution={false}
              showControls={!isCinematicMode}
              controlsVariant="overlay"
              isFullscreen={true}
              onToggleFullscreen={toggleViewMode}
            />

            {/* Full-screen play/pause tap target */}
            <button
              className="absolute inset-0 flex items-center justify-center touch-manipulation z-10"
              onClick={() => {
                addHapticFeedback("light");
                toggle();
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
              onDoubleClick={(e) => {
                e.preventDefault();
                toggleViewMode();
              }}
            >
              {!isPlaying && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                >
                  <Play className="h-12 w-12 text-white fill-white ml-2" />
                </motion.div>
              )}
            </button>

            {/* Floating action bar — hidden in cinematic mode */}
            {!isCinematicMode && (
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
                className="absolute bottom-0 left-0 right-0 z-30 px-6 pt-6 glass-overlay safe-area-bottom rounded-t-[40px] border-t border-white/10"
                style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom) + 1.5rem))" }}
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
            )}

            {/* Restore Controls Button - visible when hidden */}
            <AnimatePresence>
              {isFullscreenControlsHidden && !isCinematicMode && (
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
          </motion.div>
        ) : (
          /* ── Tools mode: compact preview + tabbed editor panels ── */
          <motion.div
            key="tools"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex-1 min-h-0 flex flex-col bg-black overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-black z-30 pt-safe"
              style={{ height: "calc(3.5rem + env(safe-area-inset-top))" }}
            >
              <div className="text-white font-black text-xl italic tracking-tighter flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-primary/20">
                  W
                </div>
                <span>saywaht</span>
              </div>

              {/* History Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => {
                    addHapticFeedback("light");
                    undo();
                  }}
                  disabled={!canUndo()}
                  aria-label="Undo"
                >
                  <Undo2 className={cn("h-4 w-4", !canUndo() && "opacity-20")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => {
                    addHapticFeedback("light");
                    redo();
                  }}
                  disabled={!canRedo()}
                  aria-label="Redo"
                >
                  <Redo2 className={cn("h-4 w-4", !canRedo() && "opacity-20")} />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-widest h-9 px-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-full border border-primary/10"
                  onClick={toggleViewMode}
                >
                  Preview
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 rounded-full bg-primary text-white font-black text-[9px] uppercase tracking-widest px-4 shadow-lg active:scale-95 transition-all"
                  onClick={handleFinish}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isFarcasterMiniApp ? (
                    <>
                      <Share2 className="h-3 w-3 mr-1.5" />
                      Share
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1.5 fill-white" />
                      Finish
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Video preview — shrinks when timeline is expanded */}
              <div
                className={cn(
                  "relative flex-shrink-0 bg-black overflow-hidden transition-[height] duration-500 ease-in-out",
                  isToolsMaximized
                    ? "h-0"
                    : isToolsCollapsed
                      ? (timelineExpanded ? "h-[50vh]" : "h-[62vh]")
                      : (timelineExpanded ? "h-[22vh]" : "h-[32vh]")
                )}
              >
                <MobilePreviewPanel
                  showResolution={true}
                  onToggleFullscreen={toggleViewMode}
                />

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

                {/* Floating Record FAB in Tools View */}
                {viewMode === "tools" && !isToolsMaximized && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-red-500 text-white shadow-2xl flex items-center justify-center border-4 border-background"
                    onClick={() => openTool("record")}
                  >
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20" />
                    <Mic className="h-6 w-6 relative z-10" />
                  </motion.button>
                )}
              </div>

              {/* ── Tab Navigation ── */}
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value);
                  addHapticFeedback("light");
                  if (isToolsCollapsed) setIsToolsCollapsed(false);
                }}
                className="flex-shrink-0 bg-black z-20"
              >
                <motion.div
                  className="px-4 py-2 flex flex-col items-center gap-2 touch-none"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.1}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 40) {
                      // Dragged down
                      if (isToolsMaximized) {
                        setIsToolsMaximized(false);
                        addHapticFeedback("medium");
                      } else if (!isToolsCollapsed) {
                        setIsToolsCollapsed(true);
                        addHapticFeedback("medium");
                      }
                    } else if (info.offset.y < -40) {
                      // Dragged up
                      if (isToolsCollapsed) {
                        setIsToolsCollapsed(false);
                        addHapticFeedback("medium");
                      } else if (!isToolsMaximized) {
                        setIsToolsMaximized(true);
                        addHapticFeedback("medium");
                      }
                    }
                  }}
                >
                  <div className="w-10 h-1 bg-white/20 rounded-full mb-1" />

                  <div className="w-full flex items-center gap-2">
                    <TabsList className="mobile-tabs-list flex-1 h-14">
                      {/* Record — primary action, always first */}
                      <TabsTrigger
                        value="record"
                        className="mobile-tabs-trigger flex-1 h-full"
                      >
                        Record
                      </TabsTrigger>

                      {/* Media — upload / library / project files */}
                      <TabsTrigger
                        value="media"
                        className="mobile-tabs-trigger flex-1 h-full"
                      >
                        Media
                      </TabsTrigger>

                      {/* Text overlays */}
                      <TabsTrigger
                        value="text"
                        className="mobile-tabs-trigger flex-1 h-full"
                      >
                        Text
                      </TabsTrigger>

                      {/* Effects */}
                      <TabsTrigger
                        value="effects"
                        className="mobile-tabs-trigger flex-1 h-full"
                      >
                        FX
                      </TabsTrigger>
                    </TabsList>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-10 flex-shrink-0 rounded-xl hover:bg-muted/50"
                      onClick={() => {
                        if (isToolsMaximized) {
                          setIsToolsMaximized(false);
                        } else if (isToolsCollapsed) {
                          setIsToolsCollapsed(false);
                        } else {
                          setIsToolsCollapsed(true);
                        }
                        addHapticFeedback("light");
                      }}
                      aria-label={isToolsCollapsed ? "Expand Tools" : "Collapse Tools"}
                    >
                      {isToolsCollapsed ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </motion.div>

                {/* Tab content panels */}
                <AnimatePresence mode="wait">
                  {!isToolsCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: isToolsMaximized ? "calc(100vh - 12rem)" : "30vh",
                        opacity: 1
                      }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden bg-black"
                    >
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </Tabs>

              {/* ── Timeline — anchored at the bottom ── */}
              <div
                data-timeline-area
                className="flex-shrink-0 border-t border-white/5 bg-black transition-[height] duration-500 ease-in-out mt-auto shadow-[0_-8px_24px_rgba(0,0,0,0.1)]"
                style={{ height: timelineHeight }}
              >
                <div className="h-10 flex items-center justify-between px-6 bg-white/[0.02] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isPlaying ? "bg-red-500 animate-pulse" : "bg-white/20"
                      )}
                    />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
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
                  <MobileTimeline expanded={timelineExpanded} onToggleExpand={toggleTimeline} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
