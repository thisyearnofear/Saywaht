"use client";

import { useState, useEffect, useCallback } from "react";
import { MobileEditorLayout } from "@/components/editor/mobile-editor-layout";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterFrame } from "@/farcaster/hooks/use-farcaster-frame";
import { MobileOnboardingOverlay } from "@/components/editor/mobile-onboarding-overlay";
import { FarcasterSplashScreen } from "./farcaster-splash-screen";
import { useMobileOnboarding } from "@/components/editor/mobile-onboarding-overlay";
import { FarcasterClientLogic } from "@/farcaster/components/farcaster-client-logic";
import { CastContextPanel } from "./cast-context-panel";
import { useFarcasterSdk } from "@/lib/farcaster-sdk";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

/**
 * Farcaster-enhanced mobile editor layout
 * Extends existing mobile layout with Farcaster-specific functionality
 * Following ENHANCEMENT FIRST principle - builds on existing components
 */
export function FarcasterMobileEditorLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { isFarcasterMiniApp, frameState, isInitializing, isReady } = useFarcasterContext();
  const { handleMiniAppNavigation, handleCastIntegration } = useFarcasterFrame();
  const { showOnboarding, completeOnboarding, skipOnboarding } =
    useMobileOnboarding();
  const [showFarcasterOnboarding, setShowFarcasterOnboarding] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Hydration guard - crucial for WebViews and Next.js
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stable callback for splash screen to prevent effect re-runs
  const handleSplashComplete = useCallback(() => {
    console.log("Farcaster splash screen completed");
  }, []);

  // Load SDK safely (returns null during SSR)
  const sdk = useFarcasterSdk();

  // Debug mode toggle (for development) - only in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey && e.ctrlKey) {
        setDebugMode(prev => !prev);
        console.log("Debug mode:", !debugMode);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [debugMode]);

  // Initialize Mini App SDK with proper error handling and context detection
  useEffect(() => {
    const initializeMiniApp = async () => {
      // Add fallback timeout to prevent infinite loading
      const fallbackTimeout = setTimeout(() => {
        console.log("Farcaster initialization timeout, showing editor anyway");
        if (isFarcasterMiniApp && isInitializing) {
          // Force show the editor if initialization takes too long
          setShowFarcasterOnboarding(false);
        }
      }, 10000); // 10 second fallback

      // Show Mini App specific onboarding
      if (isFarcasterMiniApp && showOnboarding && isReady) {
        setShowFarcasterOnboarding(true);
      }

      return () => clearTimeout(fallbackTimeout);
    };

    const cleanup = initializeMiniApp();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [isFarcasterMiniApp, isReady, isInitializing, showOnboarding]);

  // Handle Mini App navigation actions
  const handleMiniAppAction = (action: string) => {
    switch (action) {
      case "start_recording":
        handleMiniAppNavigation('editor');
        // Initialize recording with cast context if available
        if (frameState.castHash) {
          handleCastIntegration(
            `https://farcaster.com/casts/${frameState.castHash}`
          );
        }
        break;
      case "create_coin":
        handleMiniAppNavigation('mint');
        break;
      case "browse_coins":
        handleMiniAppNavigation('trade');
        break;
    }
  };

  if (!isMounted) {
    return <div className="h-screen w-screen bg-background" />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col bg-background overflow-hidden mobile-editor safe-area ${isFarcasterMiniApp ? 'farcaster-miniapp' : ''
      }`}>
      {/* Debug Panel */}
      {debugMode && (
        <div className="fixed top-0 left-0 z-50 bg-black/90 text-white p-2 text-xs max-w-sm">
          <div>isFarcasterMiniApp: {String(isFarcasterMiniApp)}</div>
          <div>isInitializing: {String(isInitializing)}</div>
          <div>isReady: {String(isReady)}</div>
          <div>showOnboarding: {String(showOnboarding)}</div>
          <div>frameState: {JSON.stringify(frameState)}</div>
          <button
            onClick={() => setDebugMode(false)}
            className="mt-2 px-2 py-1 bg-red-500 rounded text-xs"
          >
            Close Debug
          </button>
        </div>
      )}

      {/* Farcaster client logic wrapped in Suspense for Next.js compat */}
      <Suspense fallback={null}>
        <FarcasterClientLogic />
      </Suspense>

      {/* Farcaster Mini App Splash Screen */}
      <FarcasterSplashScreen
        isVisible={isFarcasterMiniApp && isInitializing}
        onComplete={handleSplashComplete}
      />

      {/* Enhanced mobile editor layout with Farcaster features */}
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto scrollable flex flex-col transition-opacity duration-300",
        (isFarcasterMiniApp && isInitializing && !isReady) ? "opacity-0 invisible" : "opacity-100 visible"
      )}>
        {/* Show Cast Context if available */}
        {isMounted && frameState.castHash && (
          <CastContextPanel castHash={frameState.castHash} />
        )}
        <MobileEditorLayout>{children}</MobileEditorLayout>
      </div>

      {/* Farcaster-specific onboarding */}
      {showFarcasterOnboarding && isFarcasterMiniApp && (isReady || !isInitializing) && (
        <MobileOnboardingOverlay
          isOpen={showFarcasterOnboarding}
          onClose={() => {
            skipOnboarding();
            setShowFarcasterOnboarding(false);
          }}
          onStartRecording={completeOnboarding}
          isFarcasterMode={true}
          onFarcasterAction={handleMiniAppAction}
        />
      )}
    </div>
  );
}

