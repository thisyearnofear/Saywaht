"use client";

import { useState } from "react";
import "@/app/editor/mobile-editor.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useMobileContext } from "@/contexts/mobile-context";
import { Loader2, Smartphone, Monitor } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { usePanelStore } from "@/stores/panel-store";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { StatusBar } from "@/components/editor/status-bar";
import { WorkingMobileTimeline } from "@/components/editor/working-mobile-timeline";
import { MobileMediaPanel } from "@/components/editor/mobile-media-panel";
import { MobilePreviewPanel } from "@/components/editor/mobile-preview-panel";
import {
  MobileOnboardingOverlay,
  useMobileOnboarding,
} from "@/components/editor/mobile-onboarding-overlay";

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
    ),
  }
);

const MediaPanel = dynamic(
  () =>
    import("@/components/editor/media-panel").then((mod) => ({
      default: mod.MediaPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
);

const Timeline = dynamic(
  () =>
    import("@/components/editor/timeline").then((mod) => ({
      default: mod.Timeline,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
);

const PreviewPanel = dynamic(
  () =>
    import("@/components/editor/preview-panel").then((mod) => ({
      default: mod.PreviewPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-black/10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

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
}

export function MobileEditorLayout({ children, className }: MobileEditorLayoutProps) {
  const { orientation, isEditorMobileMode, toggleEditorMobileMode } =
    useMobileContext();
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(false);
  const [splitViewMode, setSplitViewMode] = useState<boolean>(true);
  const [gestureStartY, setGestureStartY] = useState<number>(0);
  const [isGesturing, setIsGesturing] = useState<boolean>(false);

  // Onboarding state
  const { showOnboarding, completeOnboarding, skipOnboarding } =
    useMobileOnboarding();

  // Enhanced gesture handling for timeline
  const handleTouchStart = (e: React.TouchEvent) => {
    setGestureStartY(e.touches[0].clientY);
    setIsGesturing(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isGesturing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = gestureStartY - currentY;

    // Swipe up to expand timeline, down to collapse
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0 && !timelineExpanded) {
        setTimelineExpanded(true);
        setIsGesturing(false);
      } else if (deltaY < 0 && timelineExpanded) {
        setTimelineExpanded(false);
        setIsGesturing(false);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsGesturing(false);
  };

  // Quick tab switching with swipe gestures
  const handleTabSwipe = (direction: "left" | "right") => {
    const tabs = ["preview", "media", "timeline"];
    const currentIndex = tabs.indexOf(activeTab);

    if (direction === "left" && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    } else if (direction === "right" && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  // Get panel sizes from store
  const { setToolsPanel, setPreviewPanel, setMainContent, setTimeline } =
    usePanelStore();

  // Set up playback controls
  usePlaybackControls();

  // Calculate timeline height based on expanded state
  const timelineHeight = timelineExpanded ? "50vh" : "120px";

  return (
    <div className={cn("h-full w-full flex flex-col bg-background overflow-hidden mobile-editor safe-area", className)}>
      {/* Header with mode toggle */}
      <div className="relative">
        <EditorHeader />
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-2 clickable z-10 bg-background/80 backdrop-blur-sm"
          onClick={toggleEditorMobileMode}
        >
          {isEditorMobileMode ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col portrait-optimize">
        {/* Mobile interface optimized for video-while-recording workflow */}
        {splitViewMode ? (
          /* Primary UX: Split View - Always see video while recording */
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Video preview - prominent but not overwhelming */}
            <div className="flex-shrink-0 h-40 sm:h-48 prevent-zoom border-b split-view-preview">
              <MobilePreviewPanel />
            </div>

            {/* Recording tools - streamlined for primary workflow */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between border-b px-3 py-2 bg-background/95 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-foreground">
                  🎤 Record Audio
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="clickable px-2 text-xs"
                    onClick={() => setSplitViewMode(false)}
                    title="Switch to full screen tabs"
                  >
                    📱 Tabs
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 scrollable hide-scrollbar">
                <MobileMediaPanel />
              </div>
            </div>
          </div>
        ) : (
          /* Secondary UX: Tab View - For when full screen is needed */
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center border-b no-select bg-background/95 backdrop-blur-sm">
              <TabsList className="grid grid-cols-2 flex-1 rounded-none border-0 bg-transparent">
                <TabsTrigger
                  value="preview"
                  className="clickable data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  🎬 Preview
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="clickable data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  🎤 Record
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                className="clickable px-3 text-xs font-medium"
                onClick={() => setSplitViewMode(true)}
                title="Split view - see video while recording"
              >
                ⚡ Split
              </Button>
            </div>

            <TabsContent
              value="preview"
              className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col gesture-area"
            >
              <div className="flex-1 min-h-0 prevent-zoom">
                <MobilePreviewPanel />
              </div>
            </TabsContent>

            <TabsContent
              value="media"
              className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col scrollable hide-scrollbar"
            >
              <div className="flex-1 min-h-0">
                <MobileMediaPanel />
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* ENHANCEMENT: Working Mobile Timeline with proper touch handling */}
        <WorkingMobileTimeline
          expanded={timelineExpanded}
          onToggleExpand={() => setTimelineExpanded(!timelineExpanded)}
        />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Floating UI Elements */}
      <QuickActions />

      {/* Mobile Onboarding Overlay */}
      <MobileOnboardingOverlay
        isOpen={showOnboarding}
        onClose={skipOnboarding}
        onStartRecording={() => {
          completeOnboarding();
          // Switch to media tab and audio subtab to show recording interface
          setActiveTab("media");
        }}
      />
    </div>
  );
}
