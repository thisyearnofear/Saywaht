"use client";

import { useState } from "@/lib/hooks-provider";
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

interface MobileEffectsPanelProps {
  className?: string;
}

export function MobileEffectsPanel({ className }: MobileEffectsPanelProps) {
  const { orientation } = useMobileContext();
  const [activeCategory, setActiveCategory] = useState<string>("video");

  const videoEffects = [
    { id: "fade", name: "Fade", category: "transition" },
    { id: "blur", name: "Blur", category: "filter" },
    { id: "brightness", name: "Brightness", category: "color" },
    { id: "contrast", name: "Contrast", category: "color" },
    { id: "vibrance", name: "Vibrance", category: "color" },
    { id: "crop", name: "Crop", category: "transform" },
    { id: "rotate", name: "Rotate", category: "transform" },
    { id: "move", name: "Position", category: "transform" },
  ];

  const audioEffects = [
    { id: "volume", name: "Volume", category: "basic" },
    { id: "fade-in", name: "Fade In", category: "transition" },
    { id: "fade-out", name: "Fade Out", category: "transition" },
    { id: "echo", name: "Echo", category: "effect" },
    { id: "reverb", name: "Reverb", category: "effect" },
  ];

  const handleEffectApply = (effectId: string) => {
    console.log("Apply effect:", effectId);
    // Handle effect application logic
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 text-primary">✨</div>
            <h2 className="text-lg font-semibold">Effects</h2>
          </div>
          <div className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs">
            {activeCategory === "video"
              ? videoEffects.length
              : audioEffects.length}{" "}
            effects
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="flex-1 mt-0">
          <VideoEffectsContent
            effects={videoEffects}
            onApply={handleEffectApply}
          />
        </TabsContent>

        <TabsContent value="audio" className="flex-1 mt-0">
          <AudioEffectsContent
            effects={audioEffects}
            onApply={handleEffectApply}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EffectsContentProps {
  effects: Array<{
    id: string;
    name: string;
    category: string;
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
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {Object.entries(categories).map(([categoryName, categoryEffects]) => (
          <div key={categoryName}>
            <h3 className="text-sm font-medium mb-3 capitalize flex items-center gap-2">
              {getCategoryIcon(categoryName)}
              {categoryName}
            </h3>
            <div className="grid grid-cols-2 gap-2">
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
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {Object.entries(categories).map(([categoryName, categoryEffects]) => (
          <div key={categoryName}>
            <h3 className="text-sm font-medium mb-3 capitalize flex items-center gap-2">
              {getCategoryIcon(categoryName)}
              {categoryName}
            </h3>
            <div className="grid grid-cols-2 gap-2">
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
  };
  onApply: (effectId: string) => void;
}

function EffectCard({ effect, onApply }: EffectCardProps) {
  return (
    <Card className="overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-95">
      <CardContent className="p-3">
        <Button
          variant="ghost"
          className="w-full h-auto p-0 flex flex-col gap-2"
          onClick={() => onApply(effect.id)}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-lg">✨</span>
          </div>
          <span className="text-xs font-medium">{effect.name}</span>
        </Button>
      </CardContent>
    </Card>
  );
}

function getCategoryIcon(category: string) {
  const icons: Record<string, any> = {
    transition: <span className="h-4 w-4">👁️</span>,
    filter: <span className="h-4 w-4">🔍</span>,
    color: <span className="h-4 w-4">🎨</span>,
    transform: <span className="h-4 w-4">📏</span>,
    basic: <span className="h-4 w-4">🔊</span>,
    effect: <span className="h-4 w-4">✨</span>,
  };

  return icons[category] || <span className="h-4 w-4">⚡</span>;
}
