"use client";

import { useState, useEffect, useCallback } from "react";

interface TooltipStep {
  id: string;
  targetId: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const defaultSteps: TooltipStep[] = [
  {
    id: "timeline",
    targetId: "timeline-panel",
    title: "Timeline Editor",
    content: "This is your timeline. Drag clips to reorder, trim edges to adjust duration, and layer multiple tracks for complex edits.",
    position: "top",
  },
  {
    id: "media",
    targetId: "media-panel",
    title: "Media Library",
    content: "Import videos, images, and audio from your device or browse stock media. Drag files directly onto the timeline.",
    position: "right",
  },
  {
    id: "export",
    targetId: "export-button",
    title: "Export Your Video",
    content: "Ready to share? Click here to export your video as MP4 or deploy it as a tradeable coin on Zora!",
    position: "bottom",
  },
];

const didYouKnowTips = [
  "Press Space to play/pause your video",
  "Drag clips on the timeline to reorder them",
  "Press Delete to remove selected clips",
  "Use Ctrl+Z to undo your last action",
  "Shift+Arrow keys seek by 5 seconds",
  "Press T to toggle the timeline visibility",
  "Pinch to zoom on the timeline for precision",
  "Double-click a clip to split it at the playhead",
];

interface UseOnboardingTooltipsReturn {
  showOnboarding: boolean;
  currentStep: number;
  showDidYouKnow: boolean;
  didYouKnowMessage: string;
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  dismissDidYouKnow: () => void;
  setCurrentStep: (step: number) => void;
}

export function useOnboardingTooltips(): UseOnboardingTooltipsReturn {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDidYouKnow, setShowDidYouKnow] = useState(false);
  const [didYouKnowMessage, setDidYouKnowMessage] = useState("");
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [onboardingKey, setOnboardingKey] = useState(0);

  // Check if user has seen onboarding
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenOnboarding = localStorage.getItem("saywaht-onboarding-completed");
    if (!hasSeenOnboarding) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Show random "Did you know?" tip after certain actions
  const showRandomTip = useCallback(() => {
    const availableTips = didYouKnowTips.filter((tip) => !dismissedTips.has(tip));
    if (availableTips.length === 0) {
      // Reset dismissed tips if all have been shown
      setDismissedTips(new Set());
      return;
    }

    const randomTip = availableTips[Math.floor(Math.random() * availableTips.length)];
    setDidYouKnowMessage(randomTip);
    setShowDidYouKnow(true);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setShowDidYouKnow(false);
    }, 5000);
  }, [dismissedTips]);

  // Listen for keyboard shortcuts to show tips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show tip when user presses Space for the first few times
      if (e.code === "Space" && !showOnboarding) {
        const spacePressedCount = parseInt(
          localStorage.getItem("saywaht-space-pressed-count") || "0"
        );
        if (spacePressedCount < 3) {
          localStorage.setItem("saywaht-space-pressed-count", String(spacePressedCount + 1));
          if (spacePressedCount === 0 || spacePressedCount === 2) {
            showRandomTip();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showOnboarding, showRandomTip]);

  const startOnboarding = useCallback(() => {
    setShowOnboarding(true);
    setCurrentStep(0);
    setOnboardingKey((k) => k + 1);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < defaultSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Onboarding complete
      if (typeof window !== "undefined") {
        localStorage.setItem("saywaht-onboarding-completed", "true");
      }
      setShowOnboarding(false);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const skipOnboarding = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("saywaht-onboarding-completed", "skipped");
    }
    setShowOnboarding(false);
  }, []);

  const dismissDidYouKnow = useCallback(() => {
    setShowDidYouKnow(false);
    if (didYouKnowMessage) {
      setDismissedTips((prev) => new Set([...prev, didYouKnowMessage]));
    }
  }, [didYouKnowMessage]);

  return {
    showOnboarding,
    currentStep,
    showDidYouKnow,
    didYouKnowMessage,
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    dismissDidYouKnow,
    setCurrentStep,
  };
}

// Export default steps for use in component
export { defaultSteps as onboardingSteps };