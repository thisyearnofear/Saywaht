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
import { Share2, ExternalLink, X, Coins, Sparkles, CheckCircle } from "@/lib/icons";

interface DeployCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  coinAddress?: string;
  onShare?: () => void;
  onViewOnExplorer?: () => void;
}

export function DeployCelebration({
  isOpen,
  onClose,
  coinAddress,
  onShare,
  onViewOnExplorer,
}: DeployCelebrationProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti with coin-themed colors
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 70,
          origin: { x: 0 },
          colors: ["#fbbf24", "#f59e0b", "#10b981", "#8b5cf6"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 70,
          origin: { x: 1 },
          colors: ["#fbbf24", "#f59e0b", "#10b981", "#8b5cf6"],
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
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 border-0 text-white overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="text-center py-6 px-4"
            >
              {/* Animated coin icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 mb-6 shadow-2xl shadow-yellow-500/30 relative"
              >
                <Coins className="w-12 h-12 text-amber-900" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <CheckCircle className="w-5 h-5 text-white" />
                </motion.div>
              </motion.div>

              <DialogHeader className="mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                    Coin Deployed! 🪙
                  </DialogTitle>
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
              </DialogHeader>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-sm mb-2"
              >
                Your video is now a tradeable coin on Zora! You&apos;re now part of
                the creator economy.
              </motion.p>

              {coinAddress && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-black/30 rounded-lg p-3 mb-6"
                >
                  <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
                    Contract Address
                  </p>
                  <p className="text-xs font-mono text-white/80 truncate">
                    {coinAddress.slice(0, 6)}...{coinAddress.slice(-4)}
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                {onShare && (
                  <Button
                    onClick={onShare}
                    className="flex-1 bg-white text-emerald-900 hover:bg-white/90 font-black uppercase tracking-widest text-xs rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
                {onViewOnExplorer && (
                  <Button
                    onClick={onViewOnExplorer}
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-black uppercase tracking-widest text-xs rounded-xl"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </Button>
                )}
              </motion.div>

              {/* Social share buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 pt-6 border-t border-white/10"
              >
                <p className="text-xs text-white/50 uppercase tracking-widest mb-3">
                  Share the news
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={onShare}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Share to Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                  <button
                    onClick={onShare}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Share to Warpcast"
                  >
                    <span className="text-lg">🗣️</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}