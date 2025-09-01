"use client";

import { useState, useEffect } from "react";
import { MobileEditorLayout } from "@/components/editor/mobile-editor-layout";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterFrame } from "@/farcaster/hooks/use-farcaster-frame";
import { MobileOnboardingOverlay } from "@/components/editor/mobile-onboarding-overlay";
import { useMobileOnboarding } from "@/components/editor/mobile-onboarding-overlay";
import { FarcasterClientLogic } from "@/farcaster/components/farcaster-client-logic";

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
  const { isFarcasterMiniApp, frameState } = useFarcasterContext();
  const { handleFrameAction, handleCastIntegration } = useFarcasterFrame();
  const { showOnboarding, completeOnboarding, skipOnboarding } =
    useMobileOnboarding();
  const [showFarcasterOnboarding, setShowFarcasterOnboarding] = useState(false);

  // Show Farcaster-specific onboarding when in mini app context
  useEffect(() => {
    if (isFarcasterMiniApp && showOnboarding) {
      setShowFarcasterOnboarding(true);
    }
  }, [isFarcasterMiniApp, showOnboarding]);

  // Handle Farcaster-specific actions
  const handleFarcasterAction = (action: string) => {
    switch (action) {
      case "start_recording":
        // Initialize recording with cast context if available
        if (frameState.castHash) {
          handleCastIntegration(
            `https://farcaster.com/casts/${frameState.castHash}`
          );
        }
        break;
      case "create_coin":
        // Trigger coin creation flow
        break;
      case "share_cast":
        // Share to Farcaster
        break;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden mobile-editor safe-area">
      {/* Farcaster client logic */}
      <FarcasterClientLogic />

      {/* Enhanced mobile editor layout with Farcaster features */}
      <MobileEditorLayout>{children}</MobileEditorLayout>

      {/* Farcaster-specific onboarding */}
      {showFarcasterOnboarding && (
        <MobileOnboardingOverlay
          isOpen={showFarcasterOnboarding}
          onClose={() => {
            skipOnboarding();
            setShowFarcasterOnboarding(false);
          }}
          onStartRecording={completeOnboarding}
          isFarcasterMode={true}
          onFarcasterAction={handleFarcasterAction}
        />
      )}
    </div>
  );
}
