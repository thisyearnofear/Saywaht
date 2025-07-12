"use client";

import { useState, useEffect } from "@/lib/hooks-provider";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Mic, Play } from "@/lib/icons-provider";
import { cn } from "@/lib/utils";

interface MobileOnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: () => void;
}

export function MobileOnboardingOverlay({ 
  isOpen, 
  onClose, 
  onStartRecording 
}: MobileOnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to SayWhat! 🎬",
      description: "Turn any video into your own commentary in just 3 simple steps",
      icon: "🎤",
      action: "Get Started"
    },
    {
      title: "Step 1: Watch the Video 👀",
      description: "First, watch the video to understand what's happening. You can see it playing in the background.",
      icon: "▶️",
      action: "Got it!"
    },
    {
      title: "Step 2: Record Your Voice 🎙️",
      description: "Tap the big red 'Record Your Voice' button and add your commentary while watching the video.",
      icon: "🔴",
      action: "Ready to Record!"
    },
    {
      title: "Step 3: Create Your Coin 🪙",
      description: "Once you're happy with your recording, you can mint it as a tradeable coin on Zora!",
      icon: "✨",
      action: "Start Recording Now"
    }
  ];
  
  const currentStepData = steps[currentStep];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - start recording
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
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center relative">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
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
                "w-2 h-2 rounded-full transition-all",
                index <= currentStep ? "bg-red-500" : "bg-gray-300"
              )}
            />
          ))}
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          <div className="text-4xl mb-2">{currentStepData.icon}</div>
          
          <h2 className="text-xl font-bold text-gray-900">
            {currentStepData.title}
          </h2>
          
          <p className="text-gray-600 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>
        
        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3"
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
              className="w-full text-gray-500"
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
    const hasSeenOnboarding = localStorage.getItem('saywaht-mobile-onboarding');
    
    if (!hasSeenOnboarding) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const completeOnboarding = () => {
    localStorage.setItem('saywaht-mobile-onboarding', 'completed');
    setShowOnboarding(false);
  };
  
  const skipOnboarding = () => {
    localStorage.setItem('saywaht-mobile-onboarding', 'skipped');
    setShowOnboarding(false);
  };
  
  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding
  };
}
