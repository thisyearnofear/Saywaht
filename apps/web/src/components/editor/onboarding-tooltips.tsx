"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { X, Flame, ChevronRight, Sparkles } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface TooltipStep {
  id: string;
  targetId: string; // DOM element ID to highlight
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

interface OnboardingTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  steps: TooltipStep[];
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export function OnboardingTooltip({
  isOpen,
  onClose,
  currentStep,
  steps,
  onNext,
  onPrevious,
  onSkip,
}: OnboardingTooltipProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (isOpen && currentStepData) {
      const target = document.getElementById(currentStepData.targetId);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      }
    }
  }, [isOpen, currentStep, currentStepData]);

  if (!isOpen || !currentStepData || !targetRect) return null;

  const getPositionStyles = () => {
    const { position } = currentStepData;
    const gap = 12;
    const tooltipWidth = 280;

    switch (position) {
      case "top":
        return {
          top: targetRect.top - gap,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          transform: "translateY(-100%)",
        };
      case "bottom":
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.left - gap - tooltipWidth,
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.right + gap,
        };
      default:
        return {};
    }
  };

  return (
    <>
      {/* Highlight overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 20}px, rgba(0,0,0,0.6) ${Math.max(targetRect.width, targetRect.height) / 2 + 21}px)`,
        }}
      />

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="fixed z-50 w-[280px]"
        style={getPositionStyles()}
      >
        <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <h3 className="font-bold text-sm">{currentStepData.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentStepData.content}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={currentStep === 0}
              className="text-xs"
            >
              Back
            </Button>
            <Button size="sm" onClick={onNext} className="text-xs font-black uppercase tracking-widest">
              {currentStep === steps.length - 1 ? "Got it!" : "Next"}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Arrow */}
        <div
          className={cn(
            "absolute w-3 h-3 bg-background border-l border-t border-border rotate-45",
            currentStepData.position === "top" && "-bottom-1.5 left-1/2 -translate-x-1/2",
            currentStepData.position === "bottom" && "-top-1.5 left-1/2 -translate-x-1/2 rotate-225",
            currentStepData.position === "left" && "-right-1.5 top-1/2 -translate-y-1/2 -rotate-45",
            currentStepData.position === "right" && "-left-1.5 top-1/2 -translate-y-1/2 rotate-135"
          )}
        />
      </motion.div>
    </>
  );
}

// Did you know nudge component
interface DidYouKnowNudgeProps {
  isVisible: boolean;
  message: string;
  onDismiss: () => void;
}

export function DidYouKnowNudge({ isVisible, message, onDismiss }: DidYouKnowNudgeProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-amber-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-sm">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium flex-1">{message}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-6 w-6 rounded-full text-white hover:bg-white/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}