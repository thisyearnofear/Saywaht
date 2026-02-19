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
import { Button } from "@/components/ui/button";
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
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] = useState(false);

  // Hydration guard - crucial for WebViews and Next.js
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stable callback for splash screen to prevent effect re-runs
  const handleSplashComplete = useCallback(() => {
    setIsSplashAnimationComplete(true);
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
    let timeoutId: NodeJS.Timeout;

    const checkOnboarding = () => {
      // Add fallback timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.log("Farcaster initialization timeout");
        if (isFarcasterMiniApp && isInitializing) {
          setShowFarcasterOnboarding(false);
        }
      }, 10000);

      // Show Mini App specific onboarding
      if (isFarcasterMiniApp && showOnboarding && isReady) {
        setShowFarcasterOnboarding(true);
      }
    };

    checkOnboarding();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
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
      case "templates":
        // Direct navigation to templates page
        window.location.href = '/templates';
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
    // PREVENT WHITE FLASH: Use absolute black during hydration
    return <div className="h-screen w-screen bg-[#000000]" />;
  }

  // Determine if we should show the splash screen
  // Show if initializing OR if the animation hasn't finished yet
  const showSplash = isFarcasterMiniApp && (!isReady || !isSplashAnimationComplete);

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
        isVisible={showSplash}
        onComplete={handleSplashComplete}
      />

      {/* Enhanced mobile editor layout with Farcaster features */}
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto scrollable flex flex-col transition-opacity duration-500",
        showSplash ? "opacity-0 invisible" : "opacity-100 visible"
      )}>
        {/* LANDING PAGE: Show if we're in 'welcome' step and no cast is provided */}
        {isFarcasterMiniApp && frameState.step === 'welcome' && !frameState.castHash ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-10 bg-background relative overflow-hidden">
            {/* Edge decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

            <div className="relative group">
              <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center text-5xl font-black text-white shadow-2xl -rotate-3 transition-transform group-hover:rotate-0 duration-500">
                W
              </div>
            </div>

            <div className="space-y-3 relative">
              <h1 className="text-6xl font-black tracking-tighter italic uppercase leading-none">
                SayWAHT<span className="text-primary">!</span>
              </h1>
              <p className="text-xl font-bold text-muted-foreground uppercase tracking-tight">See it. Say it. Coin it.</p>
            </div>

            <div className="w-full max-w-xs space-y-4 pt-2 relative">
              <Button
                size="lg"
                className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all border-none"
                onClick={() => handleMiniAppAction('start_recording')}
              >
                Coin Commentary
              </Button>

              <Button
                size="lg"
                variant="secondary"
                className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl shadow-lg bg-white text-black hover:bg-white/90 active:scale-95 transition-all"
                onClick={() => handleMiniAppAction('templates')}
              >
                Browse Templates
              </Button>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="h-12 text-[10px] font-black uppercase tracking-wider border-2 rounded-xl hover:bg-primary/5 transition-colors"
                  onClick={() => handleMiniAppAction('browse_coins')}
                >
                  Market
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-[10px] font-black uppercase tracking-wider border-2 rounded-xl hover:bg-primary/5 transition-colors"
                  onClick={() => handleMiniAppAction('create_coin')}
                >
                  Trending
                </Button>
              </div>
            </div>

            <div className="pt-6 space-y-2 opacity-60">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.5em] font-black">
                No Permissions • No Watermarks
              </p>
              <p className="text-[9px] text-primary uppercase tracking-[0.3em] font-black">
                Decentralized & Uncensored
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Show Cast Context if available */}
            {isMounted && frameState.castHash && (
              <CastContextPanel castHash={frameState.castHash} />
            )}
            <MobileEditorLayout hideOnboarding={isFarcasterMiniApp}>
              {children}
            </MobileEditorLayout>
          </>
        )}
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

