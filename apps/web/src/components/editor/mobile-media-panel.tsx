"use client";

import { useState } from "@/lib/hooks-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaPanel } from "@/components/editor/media-panel";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { MobileEffectsPanel } from "@/components/editor/mobile-effects-panel";
import { useMobileContext } from "@/contexts/mobile-context";
import { cn } from "@/lib/utils";

interface MobileMediaPanelProps {
  className?: string;
}

export function MobileMediaPanel({ className }: MobileMediaPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("media");
  const { orientation } = useMobileContext();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid grid-cols-3 w-full rounded-none border-b">
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
        </TabsList>

        <TabsContent
          value="media"
          className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <MediaPanel />
          </div>
        </TabsContent>

        <TabsContent
          value="audio"
          className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <MobileAudioPanel />
          </div>
        </TabsContent>

        <TabsContent
          value="effects"
          className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <MobileEffectsPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
