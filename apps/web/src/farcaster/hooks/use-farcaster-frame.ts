"use client";

import { useCallback, useState } from "react";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { FarcasterFrameAction } from "@/farcaster/types";
import { generateFrameActionUrl } from "@/farcaster/utils/frame-utils";

/**
 * Hook for handling Farcaster frame actions
 * Extends existing mobile functionality rather than duplicating
 */
export function useFarcasterFrame() {
  const { setFrameState, frameState } = useFarcasterContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle frame button actions
   */
  const handleFrameAction = useCallback(async (action: FarcasterFrameAction) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Extract action data
      const { buttonIndex, inputText, castId } = action.untrustedData;
      
      // Handle different button actions
      switch (buttonIndex) {
        case 1: // Start recording
          setFrameState({ 
            step: "recording",
            castHash: castId.hash
          });
          break;
          
        case 2: // Create Coin
          setFrameState({ step: "minting" });
          break;
          
        case 3: // Complete and share
          setFrameState({ step: "complete" });
          break;
          
        default:
          console.warn("Unknown frame action:", buttonIndex);
      }
      
      // Send analytics or tracking data
      await fetch(generateFrameActionUrl("track"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action),
      });
      
    } catch (err) {
      console.error("Frame action error:", err);
      setError("Failed to process frame action");
    } finally {
      setIsProcessing(false);
    }
  }, [setFrameState]);

  /**
   * Handle cast integration
   */
  const handleCastIntegration = useCallback(async (castUrl: string) => {
    try {
      // Extract video from cast if available
      setFrameState({
        videoUrl: castUrl,
        step: "recording"
      });
    } catch (err) {
      console.error("Cast integration error:", err);
      setError("Failed to integrate cast");
    }
  }, [setFrameState]);

  return {
    handleFrameAction,
    handleCastIntegration,
    isProcessing,
    error,
    currentStep: frameState.step
  };
}