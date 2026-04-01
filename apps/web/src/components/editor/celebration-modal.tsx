"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, X, Sparkles, Award } from "@/lib/icons";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export function CelebrationModal({
  isOpen,
  onClose,
  onDownload,
  onShare,
}: CelebrationModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Show content after confetti starts
      setTimeout(() => setShowContent(true), 300);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900 border-0 text-white overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="h-4 w-4" />
        </Button>

        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="text-center py-6"
            >
              {/* Animated icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-6 shadow-lg shadow-orange-500/30"
              >
                <Award className="w-10 h-10 text-white" />
              </motion.div>

              <DialogHeader className="mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                    Your First Video is Live! 🎉
                  </DialogTitle>
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
              </DialogHeader>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-sm mb-6"
              >
                Congratulations on exporting your first video! You&apos;ve taken
                the first step into the creator economy.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                {onDownload && (
                  <Button
                    onClick={onDownload}
                    className="flex-1 bg-white text-purple-900 hover:bg-white/90 font-black uppercase tracking-widest text-xs rounded-xl"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                {onShare && (
                  <Button
                    onClick={onShare}
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-black uppercase tracking-widest text-xs rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Hook to track and trigger celebrations
export function useCelebrations() {
  const [showFirstExportCelebration, setShowFirstExportCelebration] =
    useState(false);
  const [showDeployCelebration, setShowDeployCelebration] = useState(false);

  const triggerFirstExport = () => {
    const hasExportedBefore = localStorage.getItem("saywaht-has-exported");
    if (!hasExportedBefore) {
      localStorage.setItem("saywaht-has-exported", "true");
      setShowFirstExportCelebration(true);
    }
  };

  const triggerDeploy = () => {
    const hasDeployedBefore = localStorage.getItem("saywaht-has-deployed");
    if (!hasDeployedBefore) {
      localStorage.setItem("saywaht-has-deployed", "true");
      setShowDeployCelebration(true);
    }
  };

  const closeFirstExportCelebration = () => {
    setShowFirstExportCelebration(false);
  };

  const closeDeployCelebration = () => {
    setShowDeployCelebration(false);
  };

  return {
    showFirstExportCelebration,
    showDeployCelebration,
    triggerFirstExport,
    triggerDeploy,
    closeFirstExportCelebration,
    closeDeployCelebration,
  };
}