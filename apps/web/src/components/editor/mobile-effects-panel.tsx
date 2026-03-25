"use client";

import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { toast } from "sonner";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { TimelineClip } from "@/stores/timeline-store";

interface MobileEffectsPanelProps {
  className?: string;
  onRequestMedia?: () => void;
}

type Effect = { id: string; name: string; icon: string };
type ActiveClipRef = { trackId: string; clip: TimelineClip; mediaType: "video" | "image" | "audio" | "unknown" };

const VIDEO_EFFECTS: Effect[] = [
  { id: "brighten", name: "Brighten", icon: "☀️" },
  { id: "darken", name: "Darken", icon: "🌘" },
  { id: "contrast-up", name: "Contrast+", icon: "🌓" },
  { id: "reset-video", name: "Reset", icon: "↺" },
];

const AUDIO_EFFECTS: Effect[] = [
  { id: "boost", name: "Boost", icon: "🔊" },
  { id: "soften", name: "Soften", icon: "🔉" },
  { id: "reset-audio", name: "Reset", icon: "↺" },
];

const TRANSITIONS: Effect[] = [
  { id: "crossfade", name: "Fade", icon: "✨" },
  { id: "blur", name: "Blur", icon: "💨" },
  { id: "wipe", name: "Wipe", icon: "↔️" },
  { id: "zoom", name: "Zoom", icon: "🔍" },
  { id: "none", name: "None", icon: "✕" },
];

function EffectCard({
  effect,
  onApply,
}: {
  effect: Effect;
  onApply: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onApply(effect.id)}
      className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/40 p-2 transition-colors active:scale-95 active:bg-muted touch-manipulation"
    >
      <div className="flex h-14 w-full items-center justify-center rounded-xl bg-card text-2xl shadow-sm">
        {effect.icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
        {effect.name}
      </span>
    </button>
  );
}

export function MobileEffectsPanel({ className, onRequestMedia }: MobileEffectsPanelProps) {
  const tracks = useTimelineStore((s) => s.tracks);
  const updateClipVisualEffects = useTimelineStore((s) => s.updateClipVisualEffects);
  const updateClipAudioGain = useTimelineStore((s) => s.updateClipAudioGain);
  const updateClipTransition = useTimelineStore((s) => s.updateClipTransition);
  const mediaItems = useMediaStore((s) => s.mediaItems);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const hasTimelineContent = tracks.some((track) => track.clips.length > 0);

  const activeClipRefs = useMemo<ActiveClipRef[]>(() => {
    const refs = tracks.flatMap((track) =>
      track.clips
        .filter((clip) => {
          const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
          // Add 0.1s buffer for better mobile precision
          return currentTime >= clip.startTime - 0.1 && currentTime < clipEnd + 0.1;
        })
        .map((clip) => {
          const media = mediaItems.find((item) => item.id === clip.mediaId);
          return {
            trackId: track.id,
            clip,
            mediaType: (media?.type || "unknown") as ActiveClipRef["mediaType"],
          };
        })
    );
    
    if (refs.length === 0 && tracks.some(t => t.clips.length > 0)) {
      console.log('[Effects] No active clips found at', currentTime, 'Tracks:', tracks.length);
    }
    
    return refs;
  }, [tracks, mediaItems, currentTime]);

  const applyVideoEffect = (effectId: string) => {
    const targets = activeClipRefs.filter((ref) => ref.mediaType === "video" || ref.mediaType === "image");
    if (targets.length === 0) {
      toast.info("Move playhead over a video or image clip.");
      return;
    }
    targets.forEach(({ trackId, clip }) => {
      const brightness = clip.brightness ?? 1;
      const contrast = clip.contrast ?? 1;
      switch (effectId) {
        case "brighten":
          updateClipVisualEffects(trackId, clip.id, { brightness: brightness + 0.15 });
          break;
        case "darken":
          updateClipVisualEffects(trackId, clip.id, { brightness: brightness - 0.15 });
          break;
        case "contrast-up":
          updateClipVisualEffects(trackId, clip.id, { contrast: contrast + 0.15 });
          break;
        case "reset-video":
          updateClipVisualEffects(trackId, clip.id, { brightness: 1, contrast: 1, saturation: 1 });
          break;
      }
    });
    toast.success(`Applied to ${targets.length} clip${targets.length > 1 ? "s" : ""}.`);
  };

  const applyAudioEffect = (effectId: string) => {
    const targets = activeClipRefs.filter((ref) => ref.mediaType === "audio" || ref.mediaType === "video");
    if (targets.length === 0) {
      toast.info("Move playhead over a clip with audio.");
      return;
    }
    targets.forEach(({ trackId, clip }) => {
      const gain = clip.audioGain ?? 1;
      switch (effectId) {
        case "boost":
          updateClipAudioGain(trackId, clip.id, gain + 0.2);
          break;
        case "soften":
          updateClipAudioGain(trackId, clip.id, gain - 0.2);
          break;
        case "reset-audio":
          updateClipAudioGain(trackId, clip.id, 1);
          break;
      }
    });
    toast.success(`Applied to ${targets.length} clip${targets.length > 1 ? "s" : ""}.`);
  };

  const applyTransition = (transitionId: string) => {
    if (activeClipRefs.length === 0) {
      toast.info("Move playhead over a clip.");
      return;
    }
    const type = transitionId as TimelineClip["transitionType"];
    activeClipRefs.forEach(({ trackId, clip }) => {
      updateClipTransition(trackId, clip.id, type, 0.5);
    });
    toast.success(`Transition set to ${transitionId}`);
  };

  const handleEffectApply = (effectId: string) => {
    addHapticFeedback("medium");
    if (effectId === "brighten" || effectId === "darken" || effectId === "contrast-up" || effectId === "reset-video") {
      applyVideoEffect(effectId);
      return;
    }
    if (effectId === "boost" || effectId === "soften" || effectId === "reset-audio") {
      applyAudioEffect(effectId);
      return;
    }
    applyTransition(effectId);
  };

  if (!hasTimelineContent && mediaItems.length === 0) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center bg-background p-6 text-center", className)}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
          <Sparkles className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Add media first</p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Effects work best after you add clips to your project.
        </p>
        <Button
          className="mt-3 h-8 rounded-lg text-[10px] uppercase tracking-widest"
          onClick={onRequestMedia}
        >
          Open Media
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <Tabs defaultValue="video" className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Effects</h2>
          </div>

          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/30 h-11 p-1">
            <TabsTrigger
              value="video"
              className="rounded-lg text-[10px] font-bold data-[state=active]:bg-background transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Video
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="rounded-lg text-[10px] font-bold data-[state=active]:bg-background transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Audio
            </TabsTrigger>
            <TabsTrigger
              value="transitions"
              className="rounded-lg text-[10px] font-bold data-[state=active]:bg-background transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Transitions
            </TabsTrigger>
          </TabsList>
          <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Applies to clips at the current playhead position.
          </p>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="video" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <div className="grid grid-cols-3 gap-3 p-4">
              {VIDEO_EFFECTS.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={handleEffectApply} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audio" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <div className="grid grid-cols-3 gap-3 p-4">
              {AUDIO_EFFECTS.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={handleEffectApply} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transitions" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <div className="grid grid-cols-3 gap-3 p-4">
              {TRANSITIONS.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={handleEffectApply} />
              ))}
            </div>
          </TabsContent>
        </div>

        <div className="flex-shrink-0 p-3 bg-muted/10 text-center border-t border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            Working effects only
          </p>
        </div>
      </Tabs>
    </div>
  );
}
