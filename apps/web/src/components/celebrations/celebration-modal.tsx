"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { X, Download, Share2, ExternalLink, Sparkles } from "@/lib/icons";
import { triggerCelebration, triggerCoinCelebration } from "@/lib/confetti";
import { cn } from "@/lib/utils";

export type CelebrationType = "first-export" | "coin-deployed" | "template-applied";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CelebrationType;
  title?: string;
  message?: string;
  shareUrl?: string;
  showConfetti?: boolean;
}

const celebrationConfig = {
  "first-export": {
    title: "Your first video is live! 🎉",
    message: "You've exported your first video. Great job creating something awesome!",
    icon: "🎬",
    primaryAction: "Download Again",
    secondaryAction: "Create Another",
    confetti: true,
  },
  "coin-deployed": {
    title: "Coin Deployed! 🪙",
    message: "Your video is now a live tradeable coin on Zora.",
    icon: "🚀",
    primaryAction: "View on Zora",
    secondaryAction: "Share on Warpcast",
    confetti: true,
  },
  "template-applied": {
    title: "Template Applied! ✨",
    message: "Your video is looking fresh. Keep editing!",
    icon: "📱",
    primaryAction: "Continue Editing",
    secondaryAction: undefined,
    confetti: false,
  },
};

export function CelebrationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  shareUrl,
  showConfetti = true,
}: CelebrationModalProps) {
  const config = celebrationConfig[type];
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  useEffect(() => {
    if (isOpen && showConfetti && config.confetti) {
      // Trigger confetti based on type
      if (type === "coin-deployed") {
        triggerCoinCelebration();
      } else {
        triggerCelebration();
      }

      // Play satisfying whoosh sound for template
      if (type === "template-applied" && !hasPlayedSound) {
        playWhooshSound();
        setHasPlayedSound(true);
      }
    }
  }, [isOpen, type, config.confetti, showConfetti, hasPlayedSound]);

  const playWhooshSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not supported
    }
  };

  const handlePrimaryAction = () => {
    if (type === "first-export") {
      // Trigger download
      onClose();
    } else if (type === "coin-deployed" && shareUrl) {
      window.open(shareUrl, "_blank");
      onClose();
    } else {
      onClose();
    }
  };

  const handleSecondaryAction = () => {
    if (type === "coin-deployed") {
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
        "I just created my first commentary video on SayWaht! 🎬"
      )}`;
      window.open(warpcastUrl, "_blank");
    } else {
      // Create another project or template
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-3xl",
              "bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900",
              "border border-white/20 shadow-2xl",
              "text-white"
            )}
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white h-10 w-10 rounded-full bg-white/5"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Content */}
            <div className="relative p-8 text-center space-y-6">
              {/* Icon with glow */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 shadow-lg"
              >
                <span className="text-4xl">{config.icon}</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold"
              >
                {title || config.title}
              </motion.h2>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-sm leading-relaxed"
              >
                {message || config.message}
              </motion.p>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-3 pt-2"
              >
                <Button
                  onClick={handlePrimaryAction}
                  className="w-full h-12 bg-white text-indigo-900 hover:bg-white/90 font-bold rounded-xl transition-all"
                >
                  {type === "first-export" && <Download className="mr-2 h-4 w-4" />}
                  {type === "coin-deployed" && <ExternalLink className="mr-2 h-4 w-4" />}
                  {config.primaryAction}
                </Button>

                {config.secondaryAction && (
                  <Button
                    variant="ghost"
                    onClick={handleSecondaryAction}
                    className="w-full h-10 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    {type === "coin-deployed" && <Share2 className="mr-2 h-4 w-4" />}
                    {config.secondaryAction}
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage celebration state
export function useCelebration(type: CelebrationType) {
  const [isOpen, setIsOpen] = useState(false);

  const showCelebration = () => setIsOpen(true);
  const hideCelebration = () => setIsOpen(false);

  return {
    isOpen,
    showCelebration,
    hideCelebration,
    CelebrationModal: () => (
      <CelebrationModal isOpen={isOpen} onClose={hideCelebration} type={type} />
    ),
  };
}