"use client";

import { useState } from "@/lib/hooks-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaPanel } from "@/components/editor/media-panel";
import { MobileAudioPanel } from "@/components/editor/mobile-audio-panel";
import { useMobileContext } from "@/contexts/mobile-context";
import { cn } from "@/lib/utils";

interface MobileMediaPanelProps {
  className?: string;
}

export function MobileMediaPanel({ className }: MobileMediaPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("record"); // Default to recording
  const { orientation } = useMobileContext();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Simplified two-tab interface */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid grid-cols-2 w-full rounded-none border-b bg-muted/30">
          <TabsTrigger
            value="record"
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            🎤 Record
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            📁 Files
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="record"
          className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          {/* Pure recording interface - no distractions */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MobileAudioPanel />
          </div>
        </TabsContent>

        <TabsContent
          value="media"
          className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          {/* Media files for import/management */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MediaPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
