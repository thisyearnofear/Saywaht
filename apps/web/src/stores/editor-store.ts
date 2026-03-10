import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSSRSafeStorage } from "@/lib/storage-ssr-safe";

interface EditorState {
  // Loading states
  isInitializing: boolean;
  isPanelsReady: boolean;

  // Video display preferences
  videoObjectFit: "contain" | "cover";
  previewZoom: number;

  // Actions
  setInitializing: (loading: boolean) => void;
  setPanelsReady: (ready: boolean) => void;
  setVideoObjectFit: (fit: "contain" | "cover") => void;
  toggleVideoObjectFit: () => void;
  setPreviewZoom: (zoom: number) => void;
  resetPreviewZoom: () => void;
  initializeApp: () => Promise<void>;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial states
      isInitializing: true,
      isPanelsReady: false,
      videoObjectFit: "contain",
      previewZoom: 1,

      // Actions
      setInitializing: (loading) => {
        set({ isInitializing: loading });
      },

      setPanelsReady: (ready) => {
        set({ isPanelsReady: ready });
      },

      setVideoObjectFit: (fit) => {
        set({ videoObjectFit: fit });
      },

      toggleVideoObjectFit: () => {
        const currentFit = get().videoObjectFit;
        set({ videoObjectFit: currentFit === "contain" ? "cover" : "contain" });
      },

      setPreviewZoom: (zoom) => {
        set({ previewZoom: Math.max(0.25, Math.min(3, zoom)) }); // Clamp between 25% and 300%
      },

      resetPreviewZoom: () => {
        set({ previewZoom: 1 });
      },

      initializeApp: async () => {
        console.log("Initializing video editor...");
        set({ isPanelsReady: true, isInitializing: false });
        console.log("Video editor ready");
      },
    }),
    {
      name: "editor-preferences",
      storage: createSSRSafeStorage(),
      // Only persist user preferences, not app state
      partialize: (state) => ({
        videoObjectFit: state.videoObjectFit,
        previewZoom: state.previewZoom,
      }),
      // Prevent rehydration from resetting transient app state
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<EditorState>),
        // Always preserve runtime state — never overwrite from storage
        isInitializing: currentState.isInitializing,
        isPanelsReady: currentState.isPanelsReady,
      }),
    }
  )
);
