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
      className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-3 transition-all active:scale-95 active:bg-white/[0.08] group"
    >
      <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-white/5 text-2xl shadow-inner group-active:scale-90 transition-transform">
        {effect.icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
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
      toast.info("Move playhead over a clip.");
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
      toast.info("Move playhead over audio.");
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
      <div className={cn("flex h-full flex-col items-center justify-center bg-transparent p-10 text-center", className)}>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.03] border border-white/5">
          <Sparkles className="h-7 w-7 text-white/10" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Add media first</p>
        <p className="mt-2 text-[10px] text-white/30 uppercase tracking-widest leading-relaxed px-8">
          Effects work best after you add clips to your project.
        </p>
        <Button
          className="mt-6 h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white"
          onClick={onRequestMedia}
        >
          Open Media
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-transparent", className)}>
      <Tabs defaultValue="video" className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-2 pb-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Effects</h2>
          </div>

          <TabsList className="grid w-full grid-cols-3 rounded-[1.25rem] bg-white/[0.05] h-12 p-1 border border-white/5">
            <TabsTrigger
              value="video"
              className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Video
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Audio
            </TabsTrigger>
            <TabsTrigger
              value="transitions"
              className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Motion
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <TabsContent value="video" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <div className="grid grid-cols-2 gap-4 p-6">
              {VIDEO_EFFECTS.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={handleEffectApply} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audio" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <div className="grid grid-cols-2 gap-4 p-6">
              {AUDIO_EFFECTS.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={handleEffectApply} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transitions" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <div className="grid grid-cols-2 gap-4 p-6">
              {TRANSITIONS.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={handleEffectApply} />
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
