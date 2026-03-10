"use client";

console.log("🚀 EditorClient module evaluating...");


import nextDynamic from "next/dynamic";
import "./editor.css";
const WelcomeScreen = nextDynamic(
  () =>
    import("@/components/editor/welcome-screen").then((mod) => ({
      default: mod.WelcomeScreen,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);
import { useProjectStore } from "@/stores/project-store";
const EditorProvider = nextDynamic(
  () =>
    import("@/components/editor-provider").then((mod) => ({
      default: mod.EditorProvider,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    ),
  }
);
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { useIsMobile, useMounted } from "@/hooks/use-mobile";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useMobileContext } from "@/contexts/mobile-context";
import { Loader2 } from "@/lib/icons";
const WalletGuard = nextDynamic(
  () =>
    import("@/components/wallet-guard").then((mod) => ({
      default: mod.WalletGuard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";

// Lazy load heavy components
const DesktopEditorLayout = nextDynamic(
  () =>
    import("@/components/editor/desktop-editor-layout").then((mod) => ({
      default: mod.DesktopEditorLayout,
    })),
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
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse scale-150" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-white/50 animate-pulse">
          Launching Studio
        </p>
      </div>
    ),
  }
);

export default function Editor() {
  const mounted = useMounted();
  // Enable keyboard shortcuts
  useEditorShortcuts();

  const { activeProject } = useProjectStore();
  const isMobile = useIsMobile();
  const { isEditorMobileMode } = useMobileContext();
  const { isFarcasterMiniApp } = useFarcasterContext();

  usePlaybackControls();

  if (!mounted) {
    return null;
  }

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
