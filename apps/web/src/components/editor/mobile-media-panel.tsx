"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaPanel } from "@/components/editor/media-panel";
import { useMobileContext } from "@/contexts/mobile-context";
import { cn } from "@/lib/utils";

interface MobileMediaPanelProps {
  className?: string;
}

export function MobileMediaPanel({ className }: MobileMediaPanelProps) {
  const [activeTab, setActiveTab] = React.useState("media");
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
            {/* This would be a filtered view of MediaPanel showing only audio */}
            <MediaPanel />
          </div>
        </TabsContent>
        
        <TabsContent 
          value="effects" 
          className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* This would be a filtered view of MediaPanel showing only effects */}
            <MediaPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}