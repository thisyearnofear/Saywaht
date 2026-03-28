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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 transition-all duration-500">
      <div className="bg-black/40 border border-white/10 rounded-[2.5rem] max-w-sm w-full p-8 text-center relative shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white/30 hover:text-white h-10 w-10 rounded-full bg-white/5"
          onClick={handleSkip}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Step indicator */}
        <div className="flex justify-center space-x-2.5 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                index === currentStep
                  ? "w-8 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  : index < currentStep
                    ? "w-2 bg-primary/30"
                    : "w-2 bg-white/10"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="text-5xl mb-4 transform hover:scale-110 transition-transform duration-500">{currentStepData.icon}</div>

          <h2 className="text-2xl font-black uppercase tracking-tight text-white/90">
            {currentStepData.title}
          </h2>

          <p className="text-white/40 text-[13px] font-bold uppercase tracking-widest leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-10 space-y-4">
          <Button
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
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
              className="w-full h-12 text-white/20 font-black uppercase tracking-widest text-[9px] hover:text-white/40"
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
