"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Mic, Play } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface MobileOnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  isFarcasterMode?: boolean;
  onFarcasterAction?: (action: string) => void;
}

export function MobileOnboardingOverlay({
  isOpen,
  onClose,
  onStartRecording,
  isFarcasterMode = false,
  onFarcasterAction,
}: MobileOnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = isFarcasterMode ? [
    {
      title: "Say it like it is. ⚡️",
      description:
        "Your meme, your moment. Turn any viral clip into your own tradeable commentary.",
      icon: "📢",
      action: "Let's Go",
    },
    {
      title: "See it. Say it. Coin it. 👀",
      description:
        "Watch any moment and record your instant reaction. Authenticity is the only rule.",
      icon: "▶️",
      action: "Got it!",
    },
    {
      title: "Coin Your Commentary",
      description:
        "Speak your truth. Your voice is minted directly on Zora as a permanent piece of the culture.",
      icon: "🪙",
      action: "Ready!",
    },
    {
      title: "No Permissions. No Watermarks. 🚀",
      description:
        "Export as MP4, share anywhere, or keep it on-chain. Decentralized, uncensored, and you earn your keep.",
      icon: "✨",
      action: "SayWAHT! LFG",
    },
  ] : [
    {
      title: "Welcome to saywaht! 🎬",
      description:
        "Turn any video into your own commentary in just 3 simple steps",
      icon: "🎤",
      action: "Get Started",
    },
    {
      title: "See it. Say it. Coin it. 👀",
      description:
        "Watch any moment and record your instant reaction. Authenticity is the only rule.",
      icon: "▶️",
      action: "Got it!",
    },
    {
      title: "Say it like it is 🎙️",
      description:
        "Speak your truth. Your voice is minted directly on Zora as a permanent piece of the culture.",
      icon: "🔴",
      action: "Ready to Record!",
    },
    {
      title: "Earn Your Keep 🪙",
      description:
        "Once you're happy with your recording, you can mint it as a tradeable coin on Zora!",
      icon: "✨",
      action: "SayWAHT! LFG",
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - start recording
      if (isFarcasterMode && onFarcasterAction) {
        onFarcasterAction("start_recording");
      }
      onStartRecording();
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl max-w-sm w-full p-6 text-center relative shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground h-9 w-9 rounded-full"
          onClick={handleSkip}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Step indicator */}
        <div className="flex justify-center space-x-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "w-6 bg-primary"
                  : index < currentStep
                    ? "w-2 bg-primary/40"
                    : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="text-4xl mb-2">{currentStepData.icon}</div>

          <h2 className="text-xl font-bold text-foreground">
            {currentStepData.title}
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            className="w-full h-12 font-semibold"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Mic className="w-4 h-4 mr-2" />
                {currentStepData.action}
              </>
            ) : (
              <>
                {currentStepData.action}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {currentStep < steps.length - 1 && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSkip}
            >
              Skip Tutorial
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to manage onboarding state
export function useMobileOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    if (typeof window !== "undefined") {
      const hasSeenOnboarding = localStorage.getItem("saywaht-mobile-onboarding");

      if (!hasSeenOnboarding) {
        // Show onboarding after a short delay
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, []);

  const completeOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("saywaht-mobile-onboarding", "completed");
    }
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("saywaht-mobile-onboarding", "skipped");
    }
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("saywaht-mobile-onboarding");
    }
  };

  const showOnboardingNow = () => {
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    showOnboardingNow,
  };
}
