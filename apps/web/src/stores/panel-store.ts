import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSSRSafeStorage } from "@/lib/storage-ssr-safe";

interface PanelState {
  // Panel sizes as percentages
  toolsPanel: number;
  previewPanel: number;
  propertiesPanel: number;
  mainContent: number;
  timeline: number;

  // Panel visibility states
  isTimelineCollapsed: boolean;

  // Actions
  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  toggleTimelineCollapse: () => void;
  setTimelineCollapsed: (collapsed: boolean) => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set, get) => ({
      // Default sizes - optimized for responsiveness
      toolsPanel: 25,
      previewPanel: 75,
      propertiesPanel: 20,
      mainContent: 70,
      timeline: 30,

      // Panel visibility - collapsed by default on smaller screens
      isTimelineCollapsed: false,

      // Actions
      setToolsPanel: (size) => set({ toolsPanel: size }),
      setPreviewPanel: (size) => set({ previewPanel: size }),
      setPropertiesPanel: (size) => set({ propertiesPanel: size }),
      setMainContent: (size) => set({ mainContent: size }),
      setTimeline: (size) => set({ timeline: size }),
      toggleTimelineCollapse: () =>
        set({ isTimelineCollapsed: !get().isTimelineCollapsed }),
      setTimelineCollapsed: (collapsed) =>
        set({ isTimelineCollapsed: collapsed }),
    }),
    {
      name: "panel-preferences",
      storage: createSSRSafeStorage(),
      // Persist panel sizes and visibility
      partialize: (state) => ({
        toolsPanel: state.toolsPanel,
        previewPanel: state.previewPanel,
        propertiesPanel: state.propertiesPanel,
        mainContent: state.mainContent,
        timeline: state.timeline,
        isTimelineCollapsed: state.isTimelineCollapsed,
      }),
    }
  )
);
