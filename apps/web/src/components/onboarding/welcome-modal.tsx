"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Video,
  Upload,
  Scissors,
  Coins,
  ArrowRight,
  X,
  Sparkles,
} from "@/lib/icons";

// ============================================================================
// WELCOME MODULE - First-time user onboarding (static modal)
// ============================================================================

const onboardingSteps = [
  {
    icon: Upload,
    title: "Import Your Media",
    description:
      "Drag and drop videos, images, or audio files to get started. We support all major formats.",
    color: "text-blue-500",
  },
  {
    icon: Scissors,
    title: "Edit Like a Pro",
    description:
      "Use our timeline editor to cut, trim, and arrange your content. Add effects and transitions.",
    color: "text-green-500",
  },
  {
    icon: Video,
    title: "Record with Time Limit",
    description:
      "Add your voice commentary with our 10-second recording limit - perfect for concise, impactful messages that fit Zora's format.",
    color: "text-purple-500",
  },
  {
    icon: Coins,
    title: "Deploy as Coin",
    description:
      "Transform your creation into a tradeable Zora Coin. Own your content and earn from trading.",
    color: "text-orange-500",
  },
];

// Storage keys for onboarding state
const ONBOARDING_SEEN_KEY = "saywaht-onboarding-seen";
const ONBOARDING_COMPLETED_KEY = "saywaht-onboarding-completed";

function checkOnboardingStatus(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
}

function setOnboardingStatus(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value ? "true" : "false");
}

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!checkOnboardingStatus(ONBOARDING_SEEN_KEY)) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOnboardingStatus(ONBOARDING_SEEN_KEY, true);
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const skipOnboarding = () => {
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <DialogTitle>saywaht?!</DialogTitle>
            </div>
            <Button
              variant="text"
              size="sm"
              onClick={skipOnboarding}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>Let&apos;s get you started</DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  {React.createElement(onboardingSteps[currentStep].icon, {
                    className: `w-8 h-8 ${onboardingSteps[currentStep].color}`,
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {onboardingSteps[currentStep].title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {onboardingSteps[currentStep].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="text" onClick={skipOnboarding} className="text-sm">
            Skip
          </Button>

          <Button onClick={nextStep} className="text-sm">
            {currentStep === onboardingSteps.length - 1
              ? "Get Started"
              : "Next"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PROGRESSIVE TOOLTIPS - Contextual hints for returning users
// ============================================================================

interface TooltipStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOOLTIP_STEPS: TooltipStep[] = [
  {
    id: "timeline",
    target: "[data-timeline]",
    title: "Timeline",
    content: "Drag clips to reorder. Click to select and trim.",
    position: "top",
  },
  {
    id: "media-panel",
    target: "[data-media-panel]",
    title: "Media Panel",
    content: "Upload videos, images, or audio. Drag directly onto timeline.",
    position: "right",
  },
  {
    id: "export",
    target: "[data-export-button]",
    title: "Export",
    content: "Render your video. First export is free!",
    position: "bottom",
  },
  {
    id: "playback",
    target: "[data-playback-controls]",
    title: "Playback",
    content: "Press Space to play/pause. Scrub to preview.",
    position: "bottom",
  },
];

const DID_YOU_KNOW_TIPS = [
  { id: "space-play", content: "Press Space to play/pause" },
  { id: "delete-clip", content: "Press Delete to remove selected clip" },
  { id: "undo", content: "Press Ctrl+Z to undo any action" },
  { id: "zoom-timeline", content: "Pinch to zoom the timeline" },
  { id: "drag-reorder", content: "Drag clips to reorder in the timeline" },
  { id: "preview-trim", content: "Press I/O to set in/out points" },
  { id: "keyboard-nav", content: "Use ←/→ to move playhead frame by frame" },
  { id: "snap-toggle", content: "Press S to toggle snap-to-grid" },
];

interface ProgressiveTooltipProps {
  isVisible: boolean;
  step: TooltipStep | null;
  onDismiss: () => void;
  onNext: () => void;
}

export function ProgressiveTooltip({
  isVisible,
  step,
  onDismiss,
  onNext,
}: ProgressiveTooltipProps) {
  return (
    <AnimatePresence>
      {isVisible && step && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute z-50 w-64 p-3 bg-background border rounded-xl shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">{step.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{step.content}</p>
            </div>
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <button
            onClick={onNext}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Got it →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { DidYouKnowNudge } from "@/components/editor/onboarding-tooltips";

export function useProgressiveOnboarding() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showDidYouKnow, setShowDidYouKnow] = useState(false);

  useEffect(() => {
    if (!checkOnboardingStatus(ONBOARDING_COMPLETED_KEY)) {
      setIsActive(true);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOOLTIP_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setOnboardingStatus(ONBOARDING_COMPLETED_KEY, true);
      setIsActive(false);
    }
  }, [currentStepIndex]);

  const dismissStep = useCallback((stepId: string) => {
    if (TOOLTIP_STEPS[currentStepIndex]?.id === stepId) {
      nextStep();
    }
  }, [currentStepIndex, nextStep]);

  const completeOnboarding = useCallback(() => {
    setOnboardingStatus(ONBOARDING_COMPLETED_KEY, true);
    setIsActive(false);
  }, []);

  const triggerDidYouKnow = useCallback(() => {
    setShowDidYouKnow(true);
    setTimeout(() => setShowDidYouKnow(false), 8000);
  }, []);

  const dismissDidYouKnow = useCallback(() => {
    setShowDidYouKnow(false);
  }, []);

  return {
    isActive,
    currentStep: TOOLTIP_STEPS[currentStepIndex] || null,
    currentStepIndex,
    nextStep,
    dismissStep,
    completeOnboarding,
    showDidYouKnow,
    triggerDidYouKnow,
    dismissDidYouKnow,
  };
}
