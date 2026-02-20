"use client";

import { useState, useCallback, useEffect } from "react";
import "@/app/editor/mobile-editor.css";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Type,
  Layers,
  Video,
  Share2,
  Zap,
  Loader2,
  Undo2,
  Redo2,
  Play,
  X,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useTextStore } from "@/stores/text-store";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";
import { useEditorHistory } from "@/hooks/use-editor-history";
import { MobileTimeline } from "@/components/editor/mobile-timeline";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";
import { MobileTextPanel } from "@/components/editor/mobile-text-panel";
import { MobileEffectsPanel } from "@/components/editor/mobile-effects-panel";
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

type MobileTool = "record" | "media" | "text" | "effects";

const MOBILE_TOOL_CONFIG: Array<{ id: MobileTool; label: string; icon: typeof Mic }> = [
  { id: "record", label: "Record", icon: Mic },
  { id: "media", label: "Media", icon: Video },
  { id: "text", label: "Text", icon: Type },
  { id: "effects", label: "Effects", icon: Layers },
];

const COACHMARK_STORAGE_KEY = "saywaht-mobile-coachmark-v2";
const TOOL_SHEET_SIZES: Record<MobileTool, string> = {
  record: "h-[40vh] min-h-[250px] max-h-[430px]",
  media: "h-[64vh] min-h-[360px] max-h-[620px]",
  text: "h-[62vh] min-h-[340px] max-h-[600px]",
  effects: "h-[56vh] min-h-[300px] max-h-[540px]",
};

export function MobileEditorLayout({
  children,
  className,
  hideOnboarding = false,
}: MobileEditorLayoutProps) {
  const { isPlaying, toggle, play } = usePlaybackStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { tracks } = useTimelineStore();
  const { selectText } = useTextStore();
  const { isFarcasterMiniApp } = useFarcasterContext();
  const { shareToFarcaster, isSharing } = useFarcasterShare();
  const { undo, redo, canUndo, canRedo } = useEditorHistory();

  const [activeTool, setActiveTool] = useState<MobileTool | null>(null);
  const [recordAutoStartNonce, setRecordAutoStartNonce] = useState(0);
  const [isRecordingInProgress, setIsRecordingInProgress] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);
  const [preferredCaptionGroupId, setPreferredCaptionGroupId] = useState<string | null>(null);
  const [hasAutoOpenedMedia, setHasAutoOpenedMedia] = useState(false);
  const timelineVisible = activeTool === null || activeTool === "record";
  const hasTimelineClips = tracks.some((track) => track.clips.length > 0);

  usePlaybackControls();

  useEffect(() => {
    if (hasAutoOpenedMedia) {
      return;
    }
    if (mediaItems.length === 0 || !hasTimelineClips) {
      setActiveTool("media");
      setHasAutoOpenedMedia(true);
    }
  }, [hasAutoOpenedMedia, mediaItems.length, hasTimelineClips]);

  useEffect(() => {
    if (hideOnboarding || typeof window === "undefined") {
      return;
    }
    const hasSeenCoachmark = window.localStorage.getItem(COACHMARK_STORAGE_KEY);
    if (!hasSeenCoachmark) {
      setShowCoachmark(true);
    }
  }, [hideOnboarding]);

  const dismissCoachmark = useCallback(() => {
    setShowCoachmark(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COACHMARK_STORAGE_KEY, "seen");
    }
  }, []);

  const handleFinish = useCallback(async () => {
    addHapticFeedback("heavy");
    if (!activeProject || !hasTimelineClips) {
      toast.error("Add some content first!");
      return;
    }

    if (isFarcasterMiniApp) {
      await shareToFarcaster();
      return;
    }

    toast.info("Preparing to launch...");
    window.location.href = `/mint/${activeProject.id}`;
  }, [activeProject, hasTimelineClips, isFarcasterMiniApp, shareToFarcaster]);

  const openToolSheet = useCallback((tool: MobileTool, options?: { autoStartRecording?: boolean }) => {
    addHapticFeedback("medium");
    setActiveTool(tool);
    if (tool === "record" && options?.autoStartRecording) {
      setRecordAutoStartNonce((prev) => prev + 1);
    }
  }, []);

  const closeToolSheet = useCallback(() => {
    addHapticFeedback("light");
    setActiveTool(null);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black text-white mobile-editor",
        className
      )}
    >
      <div className="absolute inset-0 flex flex-col">
        <div
          className="z-30 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-md pt-safe"
          style={{ minHeight: "calc(3rem + env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-white">
              W
            </div>
            <span className="text-sm font-black uppercase tracking-tight">saywaht</span>
          </div>

          <div className="flex items-center gap-1 py-2">
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
              <Undo2 className={cn("h-4 w-4", !canUndo() && "opacity-25")} />
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
              <Redo2 className={cn("h-4 w-4", !canRedo() && "opacity-25")} />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 rounded-full bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-white"
              onClick={handleFinish}
              disabled={isSharing}
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFarcasterMiniApp ? (
                <>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  Share
                </>
              ) : (
                <>
                  <Zap className="mr-1.5 h-3.5 w-3.5 fill-white" />
                  Finish
                </>
              )}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "relative flex-1 overflow-hidden border-b border-white/10",
            isRecordingInProgress && "ring-2 ring-red-500 ring-inset"
          )}
        >
          <MobilePreviewPanel
            showResolution={false}
            showControls={false}
            controlsVariant="overlay"
            isFullscreen={true}
            onTextElementTap={(textId) => {
              addHapticFeedback("light");
              selectText(textId);
              setActiveTool("text");
            }}
          />

          <button
            className="absolute inset-0 z-10 flex items-center justify-center touch-manipulation"
            onClick={() => {
              addHapticFeedback("light");
              if (!hasTimelineClips) {
                openToolSheet("media");
                return;
              }
              if (!isPlaying) {
                play();
                return;
              }
              toggle();
            }}
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
          >
            {!isPlaying && (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl">
                <Play className="ml-0.5 h-8 w-8 fill-white text-white" />
              </div>
            )}
          </button>

          {isRecordingInProgress && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
              Recording
            </div>
          )}

          {!hasTimelineClips && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20">
              <div className="pointer-events-auto rounded-2xl border border-white/15 bg-black/65 p-3 backdrop-blur-md">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white">
                  Add media to timeline
                </p>
                <p className="mt-1 text-[10px] text-white/75">
                  Pick a project clip, then tap Add so it can preview here.
                </p>
                <Button
                  size="sm"
                  className="mt-2 h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => openToolSheet("media")}
                >
                  Open Media
                </Button>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {activeTool && (
            <motion.section
              key={activeTool}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "z-20 flex flex-col border-t border-white/10 bg-background",
                TOOL_SHEET_SIZES[activeTool]
              )}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Editing • {activeTool}
                  </div>
                  {activeTool === "record" && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        isRecordingInProgress
                          ? "bg-red-500/15 text-red-500"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isRecordingInProgress ? "Now recording" : "Ready"}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={closeToolSheet}
                  aria-label="Close tool"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1">
                {activeTool === "record" && (
                  <MobileAudioPanel
                    autoStartRecordingNonce={recordAutoStartNonce}
                    onRecordingStateChange={(state) => {
                      setIsRecordingInProgress(state === "recording");
                    }}
                    onCaptionsGenerated={({ groupId, count }) => {
                      setPreferredCaptionGroupId(groupId);
                      setActiveTool("text");
                      toast.success(`Generated ${count} captions. Edit them in Text.`);
                    }}
                  />
                )}
                {activeTool === "media" && <MobileMediaPanel />}
                {activeTool === "text" && (
                  <MobileTextPanel preferredCaptionGroupId={preferredCaptionGroupId} />
                )}
                {activeTool === "effects" && (
                  <MobileEffectsPanel onRequestMedia={() => openToolSheet("media")} />
                )}
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-border/60 px-3 py-2">
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
                  <Undo2 className={cn("h-4 w-4", !canUndo() && "opacity-25")} />
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
                  <Redo2 className={cn("h-4 w-4", !canRedo() && "opacity-25")} />
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {timelineVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="z-20 overflow-hidden border-t border-white/10 bg-background/95"
            >
              <MobileTimeline compact />
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="z-30 border-t border-white/10 bg-black/95 px-3 pb-safe"
          style={{ paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.35rem))" }}
        >
          <div className="grid grid-cols-4 gap-1.5 py-1.5">
            {MOBILE_TOOL_CONFIG.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  className={cn(
                    "flex h-12.5 flex-col items-center justify-center rounded-lg border text-white transition-all active:scale-95",
                    isActive
                      ? "border-primary bg-primary/15"
                      : "border-white/10 bg-white/[0.03]"
                  )}
                  onClick={() => {
                    if (tool.id === "record") {
                      openToolSheet("record", { autoStartRecording: true });
                    } else {
                      openToolSheet(tool.id);
                    }
                  }}
                  aria-label={tool.label}
                >
                  <Icon className={cn("h-5 w-5", tool.id === "record" && "text-red-500")} />
                  <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em]">
                    {tool.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCoachmark && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-24 left-3 right-3 z-40 rounded-2xl border border-primary/20 bg-background/95 p-3 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Tap Record to start instantly.</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Editing tools open as a bottom sheet while your preview stays visible.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={dismissCoachmark}
                aria-label="Dismiss tip"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden md:block">
        <QuickActions />
      </div>
      {children}
    </motion.div>
  );
}
