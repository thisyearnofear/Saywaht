"use client";

import nextDynamic from "next/dynamic";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { StatusBar } from "@/components/editor/status-bar";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { QuickActions } from "@/components/editor/quick-actions";
import { usePanelStore } from "@/stores/panel-store";
import { Loader2 } from "@/lib/icons";

// Lazy load heavy components
const EditorHeader = nextDynamic(
  () =>
    import("@/components/editor-header").then((mod) => ({
      default: mod.EditorHeader,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    ),
  }
);

const MediaPanel = nextDynamic(
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

const Timeline = nextDynamic(
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

const PreviewPanel = nextDynamic(
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

export function DesktopEditorLayout() {
  const {
    toolsPanel,
    previewPanel,
    mainContent,
    timeline,
    isTimelineCollapsed,
    setToolsPanel,
    setPreviewPanel,
    setMainContent,
    setTimeline,
  } = usePanelStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <EditorHeader />
      <div className="flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup direction="vertical" className="h-full w-full">
          <ResizablePanel
            defaultSize={mainContent}
            minSize={30}
            maxSize={85}
            onResize={setMainContent}
            className="min-h-0"
          >
            {/* Main content area */}
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full w-full"
            >
              {/* Tools Panel */}
              <ResizablePanel
                defaultSize={toolsPanel}
                minSize={15}
                maxSize={40}
                onResize={setToolsPanel}
                className="min-w-0"
              >
                <MediaPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Preview Area */}
              <ResizablePanel
                defaultSize={previewPanel}
                minSize={30}
                onResize={setPreviewPanel}
                className="min-w-0 min-h-0 flex-1"
              >
                <PreviewPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {!isTimelineCollapsed && <ResizableHandle withHandle />}

          {/* Timeline */}
          {!isTimelineCollapsed && (
            <ResizablePanel
              defaultSize={timeline}
              minSize={15}
              maxSize={70}
              onResize={setTimeline}
              className="min-h-0"
            >
              <Timeline />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Floating UI Elements */}
      <WelcomeModal />
      <QuickActions />
    </div>
  );
}
