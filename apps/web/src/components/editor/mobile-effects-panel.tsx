"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";

interface MobileEffectsPanelProps {
  className?: string;
}

const videoEffects = [
  { id: "fade", name: "Fade", category: "transition", icon: "✨" },
  { id: "blur", name: "Blur", category: "filter", icon: "🔍" },
  { id: "brightness", name: "Bright", category: "color", icon: "☀️" },
  { id: "contrast", name: "Contrast", category: "color", icon: "🌓" },
  { id: "vibrance", name: "Vibrance", category: "color", icon: "🌈" },
  { id: "crop", name: "Crop", category: "transform", icon: "✂️" },
  { id: "rotate", name: "Rotate", category: "transform", icon: "🔄" },
  { id: "move", name: "Position", category: "transform", icon: "🎯" },
];

const audioEffects = [
  { id: "volume", name: "Volume", category: "basic", icon: "🔊" },
  { id: "fade-in", name: "Fade In", category: "transition", icon: "📈" },
  { id: "fade-out", name: "Fade Out", category: "transition", icon: "📉" },
  { id: "echo", name: "Echo", category: "effect", icon: "🗣️" },
  { id: "reverb", name: "Reverb", category: "effect", icon: "🏛️" },
];

type Effect = { id: string; name: string; category: string; icon: string };

function groupByCategory(effects: Effect[]) {
  return effects.reduce<Record<string, Effect[]>>((acc, effect) => {
    if (!acc[effect.category]) acc[effect.category] = [];
    acc[effect.category].push(effect);
    return acc;
  }, {});
}

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
      className="flex flex-col items-center gap-2 group touch-manipulation"
    >
      <div className="w-full aspect-square rounded-2xl bg-card border border-border/50 flex items-center justify-center text-2xl shadow-sm group-active:scale-95 group-active:bg-muted transition-all">
        {effect.icon}
      </div>
      <span className="text-[10px] font-bold text-muted-foreground group-active:text-primary transition-colors uppercase tracking-tight">
        {effect.name}
      </span>
    </button>
  );
}

function EffectsGrid({
  effects,
  onApply,
}: {
  effects: Effect[];
  onApply: (id: string) => void;
}) {
  const grouped = groupByCategory(effects);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-8 pb-10">
        {Object.entries(grouped).map(([categoryName, categoryEffects]) => (
          <div key={categoryName} className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              {categoryName}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {categoryEffects.map((effect) => (
                <EffectCard key={effect.id} effect={effect} onApply={onApply} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function MobileEffectsPanel({ className }: MobileEffectsPanelProps) {
  const handleEffectApply = (effectId: string) => {
    addHapticFeedback("medium");
    // TODO: wire up effect application
    console.log("Apply effect:", effectId);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <Tabs defaultValue="video" className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Effects & FX</h2>
          </div>

          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/30 h-11 p-1">
            <TabsTrigger
              value="video"
              className="rounded-lg text-xs font-bold data-[state=active]:bg-background transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Video FX
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="rounded-lg text-xs font-bold data-[state=active]:bg-background transition-all"
              onClick={() => addHapticFeedback("light")}
            >
              Audio FX
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content — properly inside the Tabs context */}
        <div className="flex-1 min-h-0">
          <TabsContent value="video" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <EffectsGrid effects={videoEffects} onApply={handleEffectApply} />
          </TabsContent>

          <TabsContent value="audio" className="m-0 h-full data-[state=active]:flex data-[state=active]:flex-col">
            <EffectsGrid effects={audioEffects} onApply={handleEffectApply} />
          </TabsContent>
        </div>

        {/* Footer hint */}
        <div className="flex-shrink-0 p-3 bg-muted/10 text-center border-t border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            Tap an effect to apply
          </p>
        </div>
      </Tabs>
    </div>
  );
}
