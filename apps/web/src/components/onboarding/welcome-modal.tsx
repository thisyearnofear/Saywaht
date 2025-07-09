"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

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
    title: "Preview in Real-Time",
    description:
      "See your changes instantly with our real-time preview. No waiting, no rendering delays.",
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

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem("saywhat-onboarding-seen");
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("saywhat-onboarding-seen", "true");
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
              <DialogTitle>Welcome to SayWhat!</DialogTitle>
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
          <DialogDescription>
            Let&apos;s get you started with creating amazing content
          </DialogDescription>
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
