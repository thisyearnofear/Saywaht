"use client";

import { useEffect, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useTextStore } from "@/stores/text-store";
import { useHistoryStore } from "@/stores/history-store";
import { useEditorHistory } from "@/hooks/use-editor-history";

export function HistorySync() {
  const { tracks } = useTimelineStore();
  const { textElements } = useTextStore();
  const { pushState } = useHistoryStore();
  const { undo, redo } = useEditorHistory();
  
  // Track previous state to avoid redundant pushes
  const lastStateRef = useRef<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    // Override the pushHistory implementation in the stores
    useTimelineStore.setState({
      pushHistory: () => {
        const state = {
          tracks: useTimelineStore.getState().tracks,
          textElements: useTextStore.getState().textElements,
        };
        const stateStr = JSON.stringify(state);
        if (stateStr !== lastStateRef.current) {
          pushState(state);
          lastStateRef.current = stateStr;
        }
      }
    });

    useTextStore.setState({
      pushHistory: () => {
        const state = {
          tracks: useTimelineStore.getState().tracks,
          textElements: useTextStore.getState().textElements,
        };
        const stateStr = JSON.stringify(state);
        if (stateStr !== lastStateRef.current) {
          pushState(state);
          lastStateRef.current = stateStr;
        }
      }
    });

    // Defer initial state capture to avoid blocking mount
    const timer = requestAnimationFrame(() => {
      const initialState = {
        tracks: useTimelineStore.getState().tracks,
        textElements: useTextStore.getState().textElements,
      };
      lastStateRef.current = JSON.stringify(initialState);
      pushState(initialState);
    });

    return () => cancelAnimationFrame(timer);
  }, [pushState]);

  return null;
}
