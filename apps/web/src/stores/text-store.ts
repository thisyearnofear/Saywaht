import { create } from "zustand";
import { TextElement } from "@/lib/types";

/**
 * Text Store - Manages text elements and editing state
 * 
 * Simplified from upstream - only essential features.
 * Following Core Principles: minimal, DRY, no bloat.
 */

// Default fonts (limited to essentials)
export const AVAILABLE_FONTS = [
  "Inter",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Comic Sans MS",
] as const;

export const DEFAULT_TEXT_PROPERTIES: Omit<TextElement, "id" | "startTime" | "endTime"> = {
  content: "Double-click to edit",
  fontSize: 48,
  fontFamily: "Inter",
  color: "#FFFFFF",
  x: 0.5,    // Center X
  y: 0.5,    // Center Y
  textAlign: "center",
  fontWeight: "bold",
  opacity: 1,
};

interface TextStore {
  // State
  textElements: TextElement[];
  selectedTextId: string | null;
  
  // Actions
  addTextElement: (element: Omit<TextElement, "id">) => string;
  updateTextElement: (id: string, updates: Partial<TextElement>) => void;
  deleteTextElement: (id: string) => void;
  selectText: (id: string | null) => void;
  getTextElement: (id: string) => TextElement | null;
  
  // Utilities
  clearAllText: () => void;
}

export const useTextStore = create<TextStore>((set, get) => ({
  textElements: [],
  selectedTextId: null,

  addTextElement: (element) => {
    const newElement: TextElement = {
      ...element,
      id: crypto.randomUUID(),
    };

    set((state) => ({
      textElements: [...state.textElements, newElement],
      selectedTextId: newElement.id,
    }));

    return newElement.id;
  },

  updateTextElement: (id, updates) => {
    set((state) => ({
      textElements: state.textElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  deleteTextElement: (id) => {
    set((state) => ({
      textElements: state.textElements.filter((el) => el.id !== id),
      selectedTextId: state.selectedTextId === id ? null : state.selectedTextId,
    }));
  },

  selectText: (id) => {
    set({ selectedTextId: id });
  },

  getTextElement: (id) => {
    return get().textElements.find((el) => el.id === id) || null;
  },

  clearAllText: () => {
    set({
      textElements: [],
      selectedTextId: null,
    });
  },
}));
