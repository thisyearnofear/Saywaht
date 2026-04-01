"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Clock, ArrowRight } from "@/lib/icons";
import { formatRelativeTime } from "@/hooks/use-celebrations";

interface UnsavedBannerProps {
  isVisible: boolean;
  onContinue: () => void;
  onStartFresh: () => void;
  lastSavedAt?: number;
}

export function UnsavedBanner({
  isVisible,
  onContinue,
  onStartFresh,
  lastSavedAt,
}: UnsavedBannerProps) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (lastSavedAt) {
      setTimeAgo(formatRelativeTime(lastSavedAt));
      
      // Update every minute
      const interval = setInterval(() => {
        setTimeAgo(formatRelativeTime(lastSavedAt));
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [lastSavedAt]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-amber-500/10 border-b border-amber-500/30"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  You have an unsaved project
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lastSavedAt ? `Last saved ${timeAgo}` : "Session found"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onStartFresh}
                className="h-8 text-xs font-medium border-amber-500/30 text-amber-700 hover:bg-amber-500/20"
              >
                Start fresh
              </Button>
              <Button
                size="sm"
                onClick={onContinue}
                className="h-8 text-xs font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white"
              >
                Continue editing
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage unsaved banner state
export function useUnsavedBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>();

  const checkForUnsavedSession = async () => {
    if (typeof window === "undefined") return;

    try {
      const { getEditorState } = await import("@/lib/storage-indexeddb");
      const savedState = await getEditorState("current-session");
      
      if (savedState && (savedState.timeline?.tracks?.length > 0 || savedState.media?.mediaItems?.length > 0)) {
        const ageInHours = (Date.now() - savedState.savedAt) / (1000 * 60 * 60);
        if (ageInHours < 24) {
          setLastSavedAt(savedState.savedAt);
          setShowBanner(true);
        }
      }
    } catch (err) {
      console.error("Failed to check for unsaved session:", err);
    }
  };

  const hideBanner = () => {
    setShowBanner(false);
  };

  const updateLastSaved = (timestamp: number) => {
    setLastSavedAt(timestamp);
  };

  return {
    showBanner,
    lastSavedAt,
    checkForUnsavedSession,
    hideBanner,
    updateLastSaved,
  };
}