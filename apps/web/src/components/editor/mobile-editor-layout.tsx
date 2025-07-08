"use client";

import * as React from "react";
import "@/app/editor/mobile-editor.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMobileContext } from "@/contexts/mobile-context";
import { Loader2, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePanelStore } from "@/stores/panel-store";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { StatusBar } from "@/components/editor/status-bar";
import { MobileTimeline } from "@/components/editor/mobile-timeline";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";

// Import components dynamically to match the main editor page
import dynamic from "next/dynamic";

// Lazy load heavy components
const EditorHeader = dynamic(
  () => import("@/components/editor-header").then((mod) => mod.EditorHeader),
  { 
    ssr: false,
    loading: () => (
      <div className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }
);

const MediaPanel = dynamic(
  () => import("@/components/editor/media-panel").then((mod) => ({ default: mod.MediaPanel })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
);

const Timeline = dynamic(
  () => import("@/components/editor/timeline").then((mod) => ({ default: mod.Timeline })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
);

const PreviewPanel = dynamic(
  () => import("@/components/editor/preview-panel").then((mod) => ({ default: mod.PreviewPanel })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-black/10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
);

const QuickActions = dynamic(
  () => import("@/components/editor/quick-actions").then((mod) => ({ default: mod.QuickActions })),
  { ssr: false }
);

interface MobileEditorLayoutProps {
  children?: React.ReactNode;
}

export function MobileEditorLayout({ children }: MobileEditorLayoutProps) {
  const { orientation, isEditorMobileMode, toggleEditorMobileMode } = useMobileContext();
  const [activeTab, setActiveTab] = React.useState("preview");
  const [timelineExpanded, setTimelineExpanded] = React.useState(false);
  
  // Get panel sizes from store
  const { setToolsPanel, setPreviewPanel, setMainContent, setTimeline } = usePanelStore();
  
  // Set up playback controls
  usePlaybackControls();

  // Calculate timeline height based on expanded state
  const timelineHeight = timelineExpanded ? "50vh" : "120px";

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden mobile-editor safe-area">
      {/* Header with mode toggle */}
      <div className="relative">
        <EditorHeader />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2 clickable"
          onClick={toggleEditorMobileMode}
        >
          {isEditorMobileMode ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col portrait-optimize">
        {/* Tabs for mobile view */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-2 w-full rounded-none border-b no-select">
            <TabsTrigger value="preview" className="clickable">Preview</TabsTrigger>
            <TabsTrigger value="media" className="clickable">Media</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col gesture-area">
            <div className="flex-1 min-h-0 prevent-zoom">
              <MobilePreviewPanel />
            </div>
          </TabsContent>
          
          <TabsContent value="media" className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col scrollable hide-scrollbar">
            <div className="flex-1 min-h-0">
              <MobileMediaPanel />
            </div>
          </TabsContent>
        </Tabs>

        {/* Mobile Timeline with expand/collapse control */}
        <MobileTimeline 
          expanded={timelineExpanded} 
          onToggleExpand={() => setTimelineExpanded(!timelineExpanded)} 
        />
      </div>

      {/* Status Bar */}
      <StatusBar />
      
      {/* Floating UI Elements */}
      <QuickActions />
    </div>
  );
}