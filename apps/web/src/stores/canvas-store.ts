import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VideoFormat } from "../lib/video-utils";

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasPreset {
  name: string;
  size: CanvasSize;
  aspectRatio: number;
}

// Canvas presets matching the ones in preview-panel.tsx
export const canvasPresets: CanvasPreset[] = [
  {
    name: "9:16 Portrait",
    size: { width: 1080, height: 1920 },
    aspectRatio: 9 / 16,
  },
  {
    name: "1:1 Square",
    size: { width: 1080, height: 1080 },
    aspectRatio: 1,
  },
  {
    name: "16:9 HD",
    size: { width: 1920, height: 1080 },
    aspectRatio: 16 / 9,
  },
];

// Helper function to get format string from canvas size
export function getFormatFromCanvasSize(canvasSize: CanvasSize): VideoFormat {
  const aspectRatio = canvasSize.width / canvasSize.height;
  
  if (Math.abs(aspectRatio - 9/16) < 0.01) {
    return "portrait";
  } else if (Math.abs(aspectRatio - 1) < 0.01) {
    return "square";
  } else if (Math.abs(aspectRatio - 16/9) < 0.01) {
    return "landscape";
  }
  
  // Default to portrait for unknown aspect ratios
  return "portrait" as VideoFormat;
}

interface CanvasState {
  // Canvas dimensions
  canvasSize: CanvasSize;
  
  // Actions
  setCanvasSize: (size: CanvasSize) => void;
  setCanvasPreset: (preset: CanvasPreset) => void;
  getAspectRatio: () => number;
  getFormat: () => VideoFormat;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      // Default to 9:16 Portrait (mobile-first)
      canvasSize: { width: 1080, height: 1920 },

      // Actions
      setCanvasSize: (size) => set({ canvasSize: size }),
      
      setCanvasPreset: (preset) => set({ canvasSize: preset.size }),
      
      getAspectRatio: () => {
        const { canvasSize } = get();
        return canvasSize.width / canvasSize.height;
      },
      
      getFormat: () => {
        const { canvasSize } = get();
        return getFormatFromCanvasSize(canvasSize);
      },
    }),
    {
      name: "canvas-settings",
    }
  )
);