"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMobileContext } from "@/contexts/mobile-context";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/lib/icons";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { motion, AnimatePresence } from "motion/react";

interface MobileEffectsPanelProps {
  className?: string;
}

export function MobileEffectsPanel({ className }: MobileEffectsPanelProps) {
  const { orientation } = useMobileContext();
  const [activeCategory, setActiveCategory] = useState<string>("video");

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

  const handleEffectApply = (effectId: string) => {
    addHapticFeedback("medium");
    console.log("Apply effect:", effectId);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-muted/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Effects & FX</h2>
          <span className="ml-auto text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {activeCategory === "video" ? videoEffects.length : audioEffects.length} FX
          </span>
        </div>

        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/30 h-11 p-1">
            <TabsTrigger value="video" className="rounded-lg text-xs font-bold data-[state=active]:bg-background transition-all">Video FX</TabsTrigger>
            <TabsTrigger value="audio" className="rounded-lg text-xs font-bold data-[state=active]:bg-background transition-all">Audio FX</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeCategory === "video" ? (
              <VideoEffectsContent effects={videoEffects} onApply={handleEffectApply} />
            ) : (
              <AudioEffectsContent effects={audioEffects} onApply={handleEffectApply} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Footer Instructions */}
      <div className="p-3 bg-muted/10 text-center border-t border-border/50">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          Tap an effect to apply
        </p>
      </div>
    </div>
  );
}

interface EffectsContentProps {
  effects: Array<{
    id: string;
    name: string;
    category: string;
    icon: string;
  }>;
  onApply: (effectId: string) => void;
}

function VideoEffectsContent({ effects, onApply }: EffectsContentProps) {
  const categories = {
    transition: effects.filter((e) => e.category === "transition"),
    filter: effects.filter((e) => e.category === "filter"),
    color: effects.filter((e) => e.category === "color"),
    transform: effects.filter((e) => e.category === "transform"),
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-8 pb-10">
        {Object.entries(categories).map(([categoryName, categoryEffects]) => (
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

function AudioEffectsContent({ effects, onApply }: EffectsContentProps) {
  const categories = {
    basic: effects.filter((e) => e.category === "basic"),
    transition: effects.filter((e) => e.category === "transition"),
    effect: effects.filter((e) => e.category === "effect"),
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-8 pb-10">
        {Object.entries(categories).map(([categoryName, categoryEffects]) => (
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

interface EffectCardProps {
  effect: {
    id: string;
    name: string;
    category: string;
    icon: string;
  };
  onApply: (effectId: string) => void;
}

function EffectCard({ effect, onApply }: EffectCardProps) {
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
