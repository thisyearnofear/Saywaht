import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSSRSafeStorage } from "@/lib/storage-ssr-safe";
import { TimelineTrack } from "./timeline-store";
import { TextElement } from "@/lib/types";

interface EditorState {
  tracks: TimelineTrack[];
  textElements: TextElement[];
}

interface HistoryStore {
  past: EditorState[];
  present: EditorState | null;
  future: EditorState[];

  // Actions
  pushState: (state: EditorState) => void;
  undo: () => EditorState | null;
  redo: () => EditorState | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      past: [],
      present: null,
      future: [],

      pushState: (state) => {
        const { present, past } = get();
        
        // If the new state is same as present, ignore
        if (JSON.stringify(state) === JSON.stringify(present)) {
          return;
        }

        set({
          past: present ? [...past, present].slice(-50) : past, // Keep last 50 states
          present: state,
          future: [], // Clear redo stack on new action
        });
      },

      undo: () => {
        const { past, present, future } = get();
        if (past.length === 0) return null;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        set({
          past: newPast,
          present: previous,
          future: present ? [present, ...future] : future,
        });

        return previous;
      },

      redo: () => {
        const { past, present, future } = get();
        if (future.length === 0) return null;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
          past: present ? [...past, present] : past,
          present: next,
          future: newFuture,
        });

        return next;
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      clearHistory: () => {
        set({
          past: [],
          present: null,
          future: [],
        });
      },
    }),
    {
      name: "editor-history-storage",
      storage: createSSRSafeStorage(),
    }
  )
);
