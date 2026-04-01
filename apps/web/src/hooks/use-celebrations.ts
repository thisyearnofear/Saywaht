"use client";

import { useState, useCallback } from "react";

interface CelebrationState {
  showFirstExport: boolean;
  showFirstDeploy: boolean;
  showTemplateApplied: boolean;
}

export function useCelebrations() {
  const [celebrationState, setCelebrationState] = useState<CelebrationState>({
    showFirstExport: false,
    showFirstDeploy: false,
    showTemplateApplied: false,
  });

  // Check if this is the first export
  const checkFirstExport = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    const hasExported = localStorage.getItem("saywaht-has-exported");
    return !hasExported;
  }, []);

  // Check if this is the first deploy
  const checkFirstDeploy = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    const hasDeployed = localStorage.getItem("saywaht-has-deployed");
    return !hasDeployed;
  }, []);

  // Trigger first export celebration
  const triggerFirstExport = useCallback(() => {
    if (checkFirstExport()) {
      localStorage.setItem("saywaht-has-exported", "true");
      setCelebrationState((prev) => ({ ...prev, showFirstExport: true }));
    }
  }, [checkFirstExport]);

  // Trigger first deploy celebration
  const triggerFirstDeploy = useCallback(() => {
    if (checkFirstDeploy()) {
      localStorage.setItem("saywaht-has-deployed", "true");
      setCelebrationState((prev) => ({ ...prev, showFirstDeploy: true }));
    }
  }, [checkFirstDeploy]);

  // Trigger template applied animation (always plays)
  const triggerTemplateApplied = useCallback(() => {
    setCelebrationState((prev) => ({ ...prev, showTemplateApplied: true }));
    // Auto-hide after animation
    setTimeout(() => {
      setCelebrationState((prev) => ({ ...prev, showTemplateApplied: false }));
    }, 2000);
  }, []);

  // Close celebration modals
  const closeFirstExport = useCallback(() => {
    setCelebrationState((prev) => ({ ...prev, showFirstExport: false }));
  }, []);

  const closeFirstDeploy = useCallback(() => {
    setCelebrationState((prev) => ({ ...prev, showFirstDeploy: false }));
  }, []);

  // Reset celebrations (for testing)
  const resetCelebrations = useCallback(() => {
    localStorage.removeItem("saywaht-has-exported");
    localStorage.removeItem("saywaht-has-deployed");
    setCelebrationState({
      showFirstExport: false,
      showFirstDeploy: false,
      showTemplateApplied: false,
    });
  }, []);

  return {
    celebrationState,
    triggerFirstExport,
    triggerFirstDeploy,
    triggerTemplateApplied,
    closeFirstExport,
    closeFirstDeploy,
    resetCelebrations,
    checkFirstExport,
    checkFirstDeploy,
  };
}

// Helper to format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}