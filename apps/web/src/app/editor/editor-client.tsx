"use client";

import nextDynamic from "next/dynamic";
import "./editor.css";
import { WelcomeScreen } from "@/components/editor/welcome-screen";
import { useProjectStore } from "@/stores/project-store";
import { EditorProvider } from "@/components/editor-provider";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useMobileContext } from "@/contexts/mobile-context";
import { Loader2 } from "@/lib/icons";
import { WalletGuard } from "@/components/wallet-guard";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";

// Lazy load heavy components
const DesktopEditorLayout = nextDynamic(
  () => import("@/components/editor/desktop-editor-layout").then((mod) => mod.DesktopEditorLayout),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

const MobileEditorLayout = nextDynamic(
  () =>
    import("@/components/editor/mobile-editor-layout").then((mod) => ({
      default: mod.MobileEditorLayout,
    })),
  { ssr: false }
);

export default function Editor() {
  // Enable keyboard shortcuts
  useEditorShortcuts();

  const { activeProject } = useProjectStore();
  const isMobile = useIsMobile();
  const { isEditorMobileMode } = useMobileContext();
  const { isFarcasterMiniApp } = useFarcasterContext();

  usePlaybackControls();

  if (!activeProject) {
    return (
      <WalletGuard>
        <WelcomeScreen />
      </WalletGuard>
    );
  }

  // Use mobile layout when in mobile mode or in Farcaster Mini App
  if (isEditorMobileMode || isFarcasterMiniApp) {
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
        <DesktopEditorLayout />
      </EditorProvider>
    </WalletGuard>
  );
}
