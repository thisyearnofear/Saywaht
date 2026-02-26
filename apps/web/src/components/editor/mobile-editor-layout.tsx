"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import "@/app/editor/mobile-editor.css";
import { useRouter } from "next/navigation";
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
  Check,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useTextStore } from "@/stores/text-store";
import { useTemplateStore } from "@/stores/template-store"; // NEW: Import template store
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";
import { useEditorHistory } from "@/hooks/use-editor-history";
import { useMobilePlaybackGate } from "@/hooks/use-mobile-playback-gate"; // NEW
import { useVisibilitySync } from "@/hooks/use-visibility-sync"; // NEW
import { useNetworkStatus } from "@/hooks/use-network-status"; // NEW
import { MobileTimeline } from "@/components/editor/mobile-timeline";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";
import { MobileTextPanel } from "@/components/editor/mobile-text-panel";
import { MobileEffectsPanel } from "@/components/editor/mobile-effects-panel";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";

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

export function MobileEditorLayout({
  children,
  className,
  hideOnboarding = false,
}: MobileEditorLayoutProps) {
  const router = useRouter();
  const { isPlaying, isStalled, toggle, play } = usePlaybackStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { tracks } = useTimelineStore();
  const { selectText, textElements } = useTextStore();
  const { isFarcasterMiniApp } = useFarcasterContext();
  const { shareToFarcaster, isSharing } = useFarcasterShare();
  const { undo, redo, canUndo, canRedo } = useEditorHistory();
  const { isApplying: isApplyingTemplate } = useTemplateStore(); // NEW: Track template loading
  const { gatedPlay } = useMobilePlaybackGate(); // NEW: Mobile playback gate
  const { isOnline, isSlowConnection } = useNetworkStatus(); // NEW: Network status
  
  // NEW: Sync playback with visibility changes
  useVisibilitySync();

  // NEW: Show network status warning
  useEffect(() => {
    if (!isOnline) {
      toast.error("No internet connection", {
        description: "Some features may not work offline",
        duration: 5000,
      });
    } else if (isSlowConnection) {
      toast.warning("Slow connection detected", {
        description: "Videos may take longer to load",
        duration: 3000,
      });
    }
  }, [isOnline, isSlowConnection]);

  const [activeTool, setActiveTool] = useState<MobileTool | null>("media");
  const [recordAutoStartNonce, setRecordAutoStartNonce] = useState(0);
  const [isRecordingInProgress, setIsRecordingInProgress] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);
  const [preferredCaptionGroupId, setPreferredCaptionGroupId] = useState<string | null>(null);
  const timelineVisible = activeTool === null || activeTool === "record";
  const hasTimelineClips = tracks.some((track) => track.clips.length > 0);
  const hasVoiceover = tracks.some((t) => t.type === "audio" && t.clips.length > 0);
  const hasText = textElements.length > 0;

  // Track which workflow steps are completed
  const completedSteps = useMemo(() => ({
    media: hasTimelineClips,
    voice: hasVoiceover,
    text: hasText,
  }), [hasTimelineClips, hasVoiceover, hasText]);

  usePlaybackControls();

  useEffect(() => {
    if ((mediaItems.length === 0 || !hasTimelineClips) && activeTool === null) {
      setActiveTool("media");
    }
  }, [activeTool, mediaItems.length, hasTimelineClips]);

  useEffect(() => {
    if (hideOnboarding || typeof window === "undefined") {
      return;
    }
    const hasSeenCoachmark = window.localStorage.getItem("saywaht-mobile-coachmark-v2");
    if (!hasSeenCoachmark) {
      setShowCoachmark(true);
    }
  }, [hideOnboarding]);

  const dismissCoachmark = useCallback(() => {
    setShowCoachmark(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saywaht-mobile-coachmark-v2", "seen");
    }
  }, []);

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

  // Tool-to-tool handoff: suggest next step when timeline gets first clip
  const prevHasClips = useRef(hasTimelineClips);
  useEffect(() => {
    if (!prevHasClips.current && hasTimelineClips && activeTool === "media") {
      toast.success("Clip added! Record a voiceover next?", {
        action: {
          label: "Record",
          onClick: () => openToolSheet("record", { autoStartRecording: true }),
        },
        duration: 4000,
      });
    }
    prevHasClips.current = hasTimelineClips;
  }, [hasTimelineClips, activeTool, openToolSheet]);

  const handleFinish = useCallback(async () => {
    addHapticFeedback("heavy");
    if (!activeProject || !hasTimelineClips) {
      toast.error("Add a clip to your timeline first", {
        action: {
          label: "Open Media",
          onClick: () => openToolSheet("media"),
        },
      });
      return;
    }

    if (isFarcasterMiniApp) {
      await shareToFarcaster();
      return;
    }

    router.push(`/mint/${activeProject.id}`);
  }, [activeProject, hasTimelineClips, isFarcasterMiniApp, shareToFarcaster, router, openToolSheet]);

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
              className={cn(
                "h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest text-white transition-all",
                hasTimelineClips
                  ? "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.4)]"
                  : "bg-muted-foreground/30"
              )}
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
                  <Zap className={cn("mr-1.5 h-3.5 w-3.5", hasTimelineClips && "fill-white")} />
                  Finish
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Workflow Progress Bar */}
        <div className="z-30 flex items-center justify-center gap-3 border-b border-white/5 bg-black/60 px-4 py-1.5 backdrop-blur-sm">
          {[
            { key: "media", label: "Media", done: completedSteps.media },
            { key: "voice", label: "Voice", done: completedSteps.voice },
            { key: "text", label: "Text", done: completedSteps.text },
          ].map((step, i) => (
            <button
              key={step.key}
              className="flex items-center gap-1.5"
              onClick={() => {
                const toolMap: Record<string, MobileTool> = { media: "media", voice: "record", text: "text" };
                openToolSheet(toolMap[step.key]);
              }}
            >
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black transition-colors",
                step.done
                  ? "bg-primary text-white"
                  : "border border-white/20 text-white/40"
              )}>
                {step.done ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider transition-colors",
                step.done ? "text-white/80" : "text-white/30"
              )}>
                {step.label}
              </span>
              {i < 2 && <span className="ml-1.5 text-[8px] text-white/15">›</span>}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "relative flex-1 overflow-hidden",
            isRecordingInProgress && "ring-2 ring-red-500 ring-inset"
          )}
        >
          {hasTimelineClips ? (
            <>
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
                  if (!isPlaying) {
                    gatedPlay(); // Use gated play for mobile
                    return;
                  }
                  toggle();
                }}
                aria-label={isPlaying ? "Pause preview" : "Play preview"}
              >
                {isPlaying && isStalled ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl">
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  </div>
                ) : !isPlaying ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl">
                    <Play className="ml-0.5 h-8 w-8 fill-white text-white" />
                  </div>
                ) : null}
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-neutral-950 via-black to-neutral-950">
              <div className="mx-5 rounded-2xl border border-white/15 bg-black/55 p-5 text-center backdrop-blur">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-black uppercase tracking-tight text-white">
                  Add your first clip
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">
                  Pick a clip from Media, then tap <span className="font-bold text-white/80">Add</span> to place it on the timeline.
                </p>
                <Button
                  size="sm"
                  className="mt-4 h-10 w-full rounded-full text-[10px] font-black uppercase tracking-widest"
                  onClick={() => openToolSheet("media")}
                >
                  <Video className="mr-1.5 h-3.5 w-3.5" />
                  Open Media
                </Button>
              </div>
            </div>
          )}

          {isRecordingInProgress && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
              Recording
            </div>
          )}
        </div>

        {/* Tool Drawer */}
        <Drawer open={!!activeTool} onOpenChange={(open) => !open && setActiveTool(null)}>
          <DrawerContent className={cn(
            "bg-background border-white/10 flex flex-col transition-all duration-500",
            activeTool === "record" ? "h-[45vh]" : "h-[75vh]"
          )}>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 shrink-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {activeTool === "record" ? "Voiceover" : `Editing • ${activeTool}`}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={closeToolSheet}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
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
                {activeTool === "media" && (
                  <MobileMediaPanel 
                    onMediaAdded={() => {
                      // Auto-close drawer after media is added
                      closeToolSheet();
                    }}
                  />
                )}
                {activeTool === "text" && (
                  <MobileTextPanel preferredCaptionGroupId={preferredCaptionGroupId} />
                )}
                {activeTool === "effects" && (
                  <MobileEffectsPanel onRequestMedia={() => openToolSheet("media")} />
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Compact Timeline */}
        <AnimatePresence>
          {(activeTool === null || activeTool === "record") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="z-20 overflow-hidden border-t border-white/10 bg-background/95 shrink-0"
            >
              <MobileTimeline compact />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <div
          className="z-30 border-t border-white/10 bg-black/95 px-3 pb-safe shrink-0"
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
                <p className="text-xs font-semibold text-foreground">
                  {!hasTimelineClips
                    ? "Start by adding media to your timeline."
                    : !hasVoiceover
                      ? "Nice! Now tap Record to add your voiceover."
                      : "Looking good! Add text or tap Finish when ready."}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {!hasTimelineClips
                    ? "Open Media → choose a clip → tap Add."
                    : !hasVoiceover
                      ? "Your voice is recorded over the video preview."
                      : "Captions were auto-generated from your recording."}
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

      {/* Template Loading Overlay */}
      <AnimatePresence>
        {isApplyingTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest text-white">
                  Loading Template
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Preparing your video...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
