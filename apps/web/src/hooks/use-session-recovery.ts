"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { 
  saveEditorState, 
  getEditorState, 
  clearEditorState,
  initIndexedDB 
} from "@/lib/storage-indexeddb";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useTextStore } from "@/stores/text-store";
import { useProjectStore } from "@/stores/project-store";
import { toast } from "sonner";
import { trackEditorEvent } from "@/lib/analytics";

/**
 * Hook to handle "Crash-Proof" session recovery
 * 
 * CORE PRINCIPLES:
 * - PERFORMANT: Uses debounced saves to IndexedDB
 * - CLEAN: Centralizes recovery logic
 * - MODULAR: Independent of the main UI
 */
export function useSessionRecovery() {
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const { tracks, setTracks } = useTimelineStore();
  const { mediaItems, setMediaItems } = useMediaStore();
  const { textElements, setTextElements } = useTextStore();
  const { activeProject } = useProjectStore();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    async function check() {
      const initialized = await initIndexedDB();
      if (!initialized) return;

      // We use a fixed "current-session" key for the active working state
      const savedState = await getEditorState("current-session");
      
      // Only offer recovery if there's actual content and it's newer than some threshold (e.g., 2 hours)
      if (savedState && (savedState.timeline?.tracks?.length > 0 || savedState.media?.mediaItems?.length > 0)) {
        const ageInHours = (Date.now() - savedState.savedAt) / (1000 * 60 * 60);
        if (ageInHours < 24) { // Keep sessions for 24 hours
          setHasRecoverableSession(true);
        }
      }
    }
    check();
  }, []);

  // Auto-save logic
  useEffect(() => {
    // Don't auto-save if the project is empty
    if (tracks.length === 0 && mediaItems.length === 0 && textElements.length === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveEditorState({
          projectId: "current-session",
          timeline: { tracks },
          media: { mediaItems },
          text: { textElements },
          savedAt: Date.now(),
        });
        console.log("💾 Session auto-saved to IndexedDB");
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 5000); // Debounce by 5 seconds

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [tracks, mediaItems, textElements]);

  const recoverSession = useCallback(async () => {
    setIsRecovering(true);
    try {
      const savedState = await getEditorState("current-session");
      if (savedState) {
        if (savedState.timeline?.tracks) setTracks(savedState.timeline.tracks);
        if (savedState.media?.mediaItems) setMediaItems(savedState.media.mediaItems);
        if (savedState.text?.textElements) setTextElements(savedState.text.textElements);
        
        trackEditorEvent("session_recovered");
        toast.success("Project recovered!", {
          description: "We've restored your last session automatically."
        });
      }
    } catch (err) {
      console.error("Recovery failed:", err);
      toast.error("Failed to recover session");
    } finally {
      setIsRecovering(false);
      setHasRecoverableSession(false);
    }
  }, [setTracks, setMediaItems, setTextElements]);

  const discardSession = useCallback(async () => {
    await clearEditorState("current-session");
    setHasRecoverableSession(false);
    toast.info("Previous session discarded");
  }, []);

  return {
    hasRecoverableSession,
    recoverSession,
    discardSession,
    isRecovering
  };
}
