"use client";

import { useCallback, useState } from "react";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { FarcasterFrameAction } from "@/farcaster/types";

/**
 * Hook for handling Farcaster Mini App v2 interactions
 * ENHANCEMENT FIRST: Extends existing mobile functionality
 * CLEAN: Focused on Mini Apps v2 specification only
 */
export function useFarcasterFrame() {
  const { setFrameState, frameState } = useFarcasterContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle Mini App navigation actions
   * MODULAR: State-based navigation without deprecated frame actions
   */
  const handleMiniAppNavigation = useCallback((destination: 'editor' | 'mint' | 'trade') => {
    setIsProcessing(true);
    setError(null);

    try {
      switch (destination) {
        case 'editor':
          setFrameState({
            step: "recording",
            source: "miniapp"
          });
          // Navigate to editor in Mini App context - check for window
          if (typeof window !== 'undefined') {
            window.location.hash = '#editor';
          }
          break;

        case 'mint':
          setFrameState({ step: "minting" });
          if (typeof window !== 'undefined') {
            window.location.hash = '#mint';
          }
          break;

        case 'trade':
          setFrameState({ step: "complete" });
          if (typeof window !== 'undefined') {
            window.location.hash = '#trade';
          }
          break;

        default:
          console.warn("Unknown Mini App destination:", destination);
      }

    } catch (err) {
      console.error("Mini App navigation error:", err);
      setError("Failed to navigate in Mini App");
    } finally {
      setIsProcessing(false);
    }
  }, [setFrameState]);

  /**
   * Handle cast integration from Mini App context
   * DRY: Reuses existing cast integration logic
   */
  const handleCastIntegration = useCallback(async (castUrl: string) => {
    try {
      setFrameState({
        videoUrl: castUrl,
        step: "recording",
        source: "cast"
      });
    } catch (err) {
      console.error("Cast integration error:", err);
      setError("Failed to integrate cast");
    }
  }, [setFrameState]);

  return {
    handleMiniAppNavigation,
    handleCastIntegration,
    isProcessing,
    error,
    currentStep: frameState.step
  };
}
