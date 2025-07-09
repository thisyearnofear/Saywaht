"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import "./editor.css";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../components/ui/resizable";
import { StatusBar } from "../../components/editor/status-bar";
import { WelcomeScreen } from "@/components/editor/welcome-screen";
import { usePanelStore } from "@/stores/panel-store";
import { useProjectStore } from "@/stores/project-store";
import { EditorProvider } from "@/components/editor-provider";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileContext } from "@/contexts/mobile-context";
import { Loader2 } from "lucide-react";
import { WalletGuard } from "@/components/wallet-guard";

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
    import("../../components/editor/media-panel").then((mod) => ({
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
    import("../../components/editor/timeline").then((mod) => ({
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
    import("../../components/editor/preview-panel").then((mod) => ({
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

const WelcomeModal = dynamic(
  () =>
    import("../../components/onboarding/welcome-modal").then((mod) => ({
      default: mod.WelcomeModal,
    })),
  { ssr: false }
);

const QuickActions = dynamic(
  () =>
    import("../../components/editor/quick-actions").then((mod) => ({
      default: mod.QuickActions,
    })),
  { ssr: false }
);

const MobileEditorLayout = dynamic(
  () =>
    import("@/components/editor/mobile-editor-layout").then((mod) => ({
      default: mod.MobileEditorLayout,
    })),
  { ssr: false }
);

export default function Editor() {
  const {
    toolsPanel,
    previewPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setPreviewPanel,
    setMainContent,
    setTimeline,
  } = usePanelStore();

  const { activeProject, createNewProject } = useProjectStore();
  const isMobile = useIsMobile();
  const { isEditorMobileMode } = useMobileContext();

  usePlaybackControls();

  if (!activeProject) {
    return (
      <WalletGuard>
        <WelcomeScreen />
      </WalletGuard>
    );
  }

  // Use mobile layout when in mobile mode
  if (isEditorMobileMode) {
    return (
      <WalletGuard>
        <EditorProvider>
          <MobileEditorLayout />
        </EditorProvider>
      </WalletGuard>
    );
  }

  // Desktop layout
  return (
    <WalletGuard>
      <EditorProvider>
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

              <ResizableHandle withHandle />

              {/* Timeline */}
              <ResizablePanel
                defaultSize={timeline}
                minSize={15}
                maxSize={70}
                onResize={setTimeline}
                className="min-h-0"
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Status Bar */}
          <StatusBar />

          {/* Floating UI Elements */}
          <WelcomeModal />
          <QuickActions />
        </div>
      </EditorProvider>
    </WalletGuard>
  );
}
