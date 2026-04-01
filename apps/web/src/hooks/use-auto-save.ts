"use client";

import { useState, useEffect, useCallback } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useTextStore } from "@/stores/text-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { saveEditorState, getEditorState, initIndexedDB } from "@/lib/storage-indexeddb";

const AUTO_SAVE_DELAY = 5000; // 5 seconds debounce

/**
 * Hook for auto-save with visual timeline indicator
 * Provides real-time feedback on save status
 */
export function useAutoSave() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { textElements } = useTextStore();
  const { activeProject } = useProjectStore();
  const { preferences } = useUserPreferencesStore();
  
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const saveTimeoutRef = useCallback(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    return {
      set: (cb: () => void, delay: number) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(cb, delay);
      },
      clear: () => {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
  }, [])();

  // Auto-save effect
  useEffect(() => {
    // Don't auto-save if disabled in preferences or project is empty
    if (!preferences.autoSave) return;
    if (tracks.length === 0 && mediaItems.length === 0 && textElements.length === 0) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      setSaveError(null);
      
      try {
        const initialized = await initIndexedDB();
        if (!initialized) throw new Error("Failed to initialize storage");
        
        await saveEditorState({
          projectId: activeProject?.id || "current-session",
          timeline: { tracks },
          media: { mediaItems },
          text: { textElements },
          savedAt: Date.now(),
        });
        
        setLastSavedAt(Date.now());
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveError("Save failed");
      } finally {
        setIsSaving(false);
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [tracks, mediaItems, textElements, activeProject?.id, preferences.autoSave]);

  // Load last saved time on mount
  useEffect(() => {
    async function loadLastSaved() {
      const initialized = await initIndexedDB();
      if (!initialized) return;
      
      const savedState = await getEditorState("current-session");
      if (savedState?.savedAt) {
        setLastSavedAt(savedState.savedAt);
      }
    }
    loadLastSaved();
  }, []);

  const formatTimeAgo = useCallback((timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  return {
    lastSavedAt,
    isSaving,
    saveError,
    formattedTimeAgo: lastSavedAt ? formatTimeAgo(lastSavedAt) : null,
  };
}