"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface FarcasterSplashScreenProps {
  isVisible: boolean;
  onComplete: () => void;
  className?: string;
}

/**
 * Farcaster Mini App Splash Screen
 * Shows during SDK initialization with proper loading states
 * Follows Farcaster design guidelines for mini apps
 */
export function FarcasterSplashScreen({
  isVisible,
  onComplete,
  className,
}: FarcasterSplashScreenProps) {
  const [loadingStage, setLoadingStage] = useState<
    "initializing" | "connecting" | "ready"
  >("initializing");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Maximum splash screen duration - prevent infinite loading
    const maxTimeout = setTimeout(() => {
      console.log("Splash screen max timeout reached, proceeding to app");
      onComplete();
    }, 8000); // 8 second maximum

    const stages = [
      { stage: "initializing" as const, duration: 800, progress: 33 },
      { stage: "connecting" as const, duration: 1000, progress: 66 },
      { stage: "ready" as const, duration: 500, progress: 100 },
    ];

    let currentStageIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const progressStage = () => {
      if (currentStageIndex >= stages.length) {
        // Complete the splash screen
        setTimeout(() => {
          clearTimeout(maxTimeout);
          onComplete();
        }, 300);
        return;
      }

      const currentStage = stages[currentStageIndex];
      setLoadingStage(currentStage.stage);
      setProgress(currentStage.progress);

      timeoutId = setTimeout(() => {
        currentStageIndex++;
        progressStage();
      }, currentStage.duration);
    };

    // Start the loading sequence
    progressStage();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(maxTimeout);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const getLoadingMessage = () => {
    switch (loadingStage) {
      case "initializing":
        return "Initializing Saywaht...";
      case "connecting":
        return "Connecting to Farcaster...";
      case "ready":
        return "Ready to create!";
      default:
        return "Loading...";
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background",
        "transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
    >
      {/* Farcaster-style gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 pointer-events-none" />

      {/* Main content */}
      <div className="relative flex flex-col items-center space-y-8 px-8 text-center">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* Animated logo container */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
              <span className="text-2xl font-bold text-white">S</span>
            </div>

            {/* Pulsing ring animation */}
            <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/30 animate-ping" />
            <div className="absolute inset-0 rounded-2xl border border-blue-500/20 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Saywaht</h1>
            <p className="text-sm text-muted-foreground">Video Commentary Coins</p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center space-y-4 w-full max-w-xs">
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Loading message with spinner */}
          <div className="flex items-center space-x-3">
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
            <span className="text-sm text-muted-foreground font-medium">
              {getLoadingMessage()}
            </span>
          </div>
        </div>

        {/* Farcaster Mini App indicator */}
        <div className="flex items-center space-x-2 px-4 py-2 bg-muted/50 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">
            Farcaster Mini App
          </span>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Farcaster • Built for creators
        </p>
      </div>
    </div>
  );
}