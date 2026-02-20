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
  getCaptionGroupIds: () => string[];
  getCaptionElements: (groupId?: string) => TextElement[];
  deleteCaptionGroup: (groupId: string) => void;
  updateCaptionGroup: (groupId: string, updates: Partial<TextElement>) => void;
  
  // Utilities
  clearAllText: () => void;

  // State management
  setTextElements: (elements: TextElement[]) => void;
  pushHistory: () => void;
}

export const useTextStore = create<TextStore>((set, get) => ({
  textElements: [],
  selectedTextId: null,

  pushHistory: () => {
    // Coordinate with history-store
  },

  setTextElements: (elements) => set({ textElements: elements }),

  addTextElement: (element) => {
    get().pushHistory();
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
    get().pushHistory();
    set((state) => ({
      textElements: state.textElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  deleteTextElement: (id) => {
    get().pushHistory();
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

  getCaptionGroupIds: () => {
    const ids = get()
      .textElements
      .map((el) => el.captionGroupId)
      .filter((id): id is string => Boolean(id));
    return Array.from(new Set(ids));
  },

  getCaptionElements: (groupId) => {
    const elements = get().textElements.filter((el) => el.isAutoCaption);
    if (!groupId) return elements;
    return elements.filter((el) => el.captionGroupId === groupId);
  },

  deleteCaptionGroup: (groupId) => {
    get().pushHistory();
    set((state) => ({
      textElements: state.textElements.filter((el) => el.captionGroupId !== groupId),
      selectedTextId:
        state.selectedTextId &&
        state.textElements.find((el) => el.id === state.selectedTextId)?.captionGroupId === groupId
          ? null
          : state.selectedTextId,
    }));
  },

  updateCaptionGroup: (groupId, updates) => {
    get().pushHistory();
    set((state) => ({
      textElements: state.textElements.map((el) =>
        el.captionGroupId === groupId ? { ...el, ...updates } : el
      ),
    }));
  },

  clearAllText: () => {
    get().pushHistory();
    set({
      textElements: [],
      selectedTextId: null,
    });
  },
}));
