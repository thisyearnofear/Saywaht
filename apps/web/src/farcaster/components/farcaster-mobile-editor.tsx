"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MobileEditorLayout } from "@/components/editor/mobile-editor-layout";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterFrame } from "@/farcaster/hooks/use-farcaster-frame";
import { useSmartNavigation } from "@/hooks/use-smart-navigation";
import { MobileOnboardingOverlay } from "@/components/editor/mobile-onboarding-overlay";
import { MobileTemplateBrowser } from "@/components/templates/mobile-template-browser";
import { TradingFeed } from "@/components/trading/trading-feed";
import { MintWizard } from "@/components/mint/mint-wizard";
import { useMobileOnboarding } from "@/components/editor/mobile-onboarding-overlay";
import { FarcasterClientLogic } from "@/farcaster/components/farcaster-client-logic";
import { CastContextPanel } from "./cast-context-panel";
import { useFarcasterSdk } from "@/lib/farcaster-sdk";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { recordCustomMetric } from "@/lib/performance-monitor";

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
  const { isFarcasterMiniApp, frameState, setFrameState, isInitializing, isReady } = useFarcasterContext();
  const { handleMiniAppNavigation, handleCastIntegration } = useFarcasterFrame();
  const { navigateToTemplates } = useSmartNavigation();
  const { showOnboarding, completeOnboarding, skipOnboarding } =
    useMobileOnboarding();
  const [showFarcasterOnboarding, setShowFarcasterOnboarding] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevStep = useRef(frameState.step);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load SDK safely (returns null during SSR)
  const sdk = useFarcasterSdk();

  // Debug mode toggle (development only)
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey && e.ctrlKey) {
        setDebugMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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

  // Listen for hash changes to update frame state (for hash-based navigation)
  // Only active in Farcaster Mini App — non-Farcaster users use normal routing
  useEffect(() => {
    if (typeof window === 'undefined' || !isFarcasterMiniApp) return;

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the #
      
      if (hash.startsWith('templates')) {
        setFrameState({ step: 'templates' });
      } else if (hash.startsWith('mint')) {
        setFrameState({ step: 'minting' });
      } else if (hash.startsWith('trade')) {
        setFrameState({ step: 'trade' });
      } else if (hash.startsWith('editor')) {
        setFrameState({ step: 'recording' });
      } else if (hash === '' || hash === 'welcome') {
        setFrameState({ step: 'welcome' });
      }
    };

    // Handle initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setFrameState, isFarcasterMiniApp]);

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
        // Navigate to templates using smart navigation (hash-based in Mini App)
        navigateToTemplates();
        break;
      case "create_coin":
        handleMiniAppNavigation('mint');
        break;
      case "browse_coins":
        handleMiniAppNavigation('trade');
        break;
    }
  };

  // Animate page transitions when step changes
  useEffect(() => {
    if (prevStep.current !== frameState.step) {
      console.info("[FarcasterFlow] step-transition", {
        from: prevStep.current,
        to: frameState.step,
      });
      recordCustomMetric("farcaster-step-transition", 1, "count", {
        from: prevStep.current,
        to: frameState.step,
      });
      prevStep.current = frameState.step;
      setIsTransitioning(true);
      const t = setTimeout(() => setIsTransitioning(false), 350);
      return () => clearTimeout(t);
    }
  }, [frameState.step]);

  // While mounting for non-Farcaster users, render the editor directly
  const isShowInitialLoading = !isMounted;

  /**
   * Render the appropriate content based on frame state step
   * This handles hash-based navigation within the Mini App
   */
  const renderContent = () => {
    // Show animated skeleton while mounting or transitioning
    if (isShowInitialLoading || isTransitioning) {
      return (
        <div className="flex-1 min-h-0 flex flex-col gap-4 p-4 animate-pulse">
          <div className="h-8 w-32 bg-white/10 rounded-xl" />
          <div className="h-48 w-full bg-white/10 rounded-3xl" />
          <div className="h-48 w-full bg-white/8 rounded-3xl" />
          <div className="h-32 w-full bg-white/5 rounded-3xl" />
        </div>
      );
    }

    // Render based on current step
    switch (frameState.step) {
      case 'welcome':
        return renderWelcomePage();
      
      case 'templates':
        return renderTemplatesPage();
      
      case 'minting':
        return renderMintingPage();
      
      case 'trade':
        return renderTradePage();
      
      case 'recording':
      default:
        return renderEditorPage();
    }
  };

  /**
   * Render the welcome/landing page
   */
  const renderWelcomePage = () => {
    return (
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto scrollable flex flex-col transition-opacity duration-500",
        "opacity-100 visible"
      )}>
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
              onClick={() => handleMiniAppAction('templates')}
            >
              Browse Templates
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl shadow-lg bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all"
              onClick={() => handleMiniAppAction('start_recording')}
            >
              Coin Commentary
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
                Create Coin
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
      </div>
    );
  };

  /**
   * Render the templates page — uses MobileTemplateBrowser, the purpose-built
   * mobile-optimised component with haptic feedback, video preloading, and
   * Pexels stock categories. Navigation callbacks keep us inside the WebView.
   */
  const renderTemplatesPage = () => {
    return (
      <MobileTemplateBrowser
        onBack={() => setFrameState({ step: 'welcome' })}
        onNavigateToEditor={() => {
          console.info("[FarcasterFlow] navigate-to-editor-requested", {
            from: frameState.step,
            to: "recording",
          });
          recordCustomMetric("farcaster-navigate-to-editor", 1, "count", {
            from: frameState.step,
            to: "recording",
          });
          setFrameState({ step: 'recording' });
        }}
      />
    );
  };

  /**
   * Render the minting page — reuses MintWizard which handles the full
   * mint flow (Details → Preview → Deploy on mobile, 6 steps on desktop).
   */
  const renderMintingPage = () => {
    return (
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto scrollable flex flex-col transition-opacity duration-500",
        "opacity-100 visible"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFrameState({ step: 'welcome' })}
            className="text-white"
          >
            ← Back
          </Button>
          <h2 className="text-lg font-black uppercase tracking-widest">Create Coin</h2>
          <div className="w-16" />{/* Spacer for centering */}
        </div>
        <div className="flex-1 overflow-y-auto">
          <MintWizard />
        </div>
      </div>
    );
  };

  /**
   * Render the trade/market page — reuses TradingFeed which has search,
   * sort, coin cards, and video playback already built.
   */
  const renderTradePage = () => {
    return (
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto scrollable flex flex-col transition-opacity duration-500",
        "opacity-100 visible"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFrameState({ step: 'welcome' })}
            className="text-white"
          >
            ← Back
          </Button>
          <h2 className="text-lg font-black uppercase tracking-widest">Market</h2>
          <div className="w-16" />{/* Spacer for centering */}
        </div>
        <div className="flex-1 overflow-y-auto">
          <TradingFeed />
        </div>
      </div>
    );
  };

  /**
   * Render the main editor page
   */
  const renderEditorPage = () => {
    return (
      <div className={cn(
        "flex-1 min-h-0 overflow-y-auto scrollable flex flex-col transition-opacity duration-500",
        "opacity-100 visible"
      )}>
        {/* Show Cast Context if available */}
        {isMounted && frameState.castHash && (
          <CastContextPanel castHash={frameState.castHash} />
        )}
        <MobileEditorLayout hideOnboarding={isFarcasterMiniApp}>
          {children}
        </MobileEditorLayout>
      </div>
    );
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col bg-background overflow-hidden mobile-editor safe-area ${isFarcasterMiniApp ? 'farcaster-miniapp' : ''}`}
      style={{ backgroundColor: "#000" }}
    >
      {/* Debug Panel — development only */}
      {process.env.NODE_ENV === 'development' && debugMode && (
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

      {/* Main content based on current step */}
      {renderContent()}

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
