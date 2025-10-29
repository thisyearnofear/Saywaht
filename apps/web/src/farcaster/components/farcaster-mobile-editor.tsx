"use client";

import { useState, useEffect } from "react";
import { MobileEditorLayout } from "@/components/editor/mobile-editor-layout";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterFrame } from "@/farcaster/hooks/use-farcaster-frame";
import { MobileOnboardingOverlay } from "@/components/editor/mobile-onboarding-overlay";
import { FarcasterSplashScreen } from "./farcaster-splash-screen";
import { useMobileOnboarding } from "@/components/editor/mobile-onboarding-overlay";
import { FarcasterClientLogic } from "@/farcaster/components/farcaster-client-logic";
import { sdk } from '@farcaster/miniapp-sdk';

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

  // Initialize Mini App SDK with proper error handling and context detection
  useEffect(() => {
    const initializeMiniApp = async () => {
      if (isFarcasterMiniApp && isReady && !isInitializing) {
        try {
          // Check if we're actually in a Mini App context
          const context = await sdk.context;
          if (context) {
            console.log('Mini App context detected:', context);
            // Hide splash screen once app is ready
            await sdk.actions.ready();
          }
        } catch (error) {
          console.warn('Failed to initialize Mini App SDK:', error);
          // App can still function without Mini App features
        }
      }
    };

    initializeMiniApp();

    // Show Mini App specific onboarding
    if (isFarcasterMiniApp && showOnboarding) {
      setShowFarcasterOnboarding(true);
    }
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

  return (
    <div className={`h-screen w-screen flex flex-col bg-background overflow-hidden mobile-editor safe-area ${
      isFarcasterMiniApp ? 'farcaster-miniapp' : ''
    }`}>
      {/* Farcaster client logic */}
      <FarcasterClientLogic />

      {/* Farcaster Mini App Splash Screen */}
       <FarcasterSplashScreen
         isVisible={isFarcasterMiniApp && isInitializing}
         onComplete={() => {
           // Splash screen completion is handled by the provider
           console.log("Farcaster splash screen completed");
         }}
       />

      {/* Enhanced mobile editor layout with Farcaster features - only show when ready */}
      {(!isFarcasterMiniApp || isReady) && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollable">
          <MobileEditorLayout>{children}</MobileEditorLayout>
        </div>
      )}

      {/* Farcaster-specific onboarding */}
      {showFarcasterOnboarding && isFarcasterMiniApp && isReady && (
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
