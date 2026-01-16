import { create } from "zustand";
import { Scene } from "@/lib/types";
import { useProjectStore } from "./project-store";
import { useTimelineStore } from "./timeline-store";

/**
 * Scene Store - Manages multi-scene editing
 * 
 * Adapted from upstream OpenCut but simplified for our IPFS architecture.
 * Follows Core Principles: minimal, DRY, no bloat.
 */

// Helper: Get main scene from scenes array
export function getMainScene(scenes: Scene[]): Scene | null {
  return scenes.find((scene) => scene.isMain) || null;
}

// Helper: Ensure at least one main scene exists
function ensureMainScene(scenes: Scene[]): Scene[] {
  const hasMain = scenes.some((scene) => scene.isMain);
  if (!hasMain && scenes.length > 0) {
    // Make first scene the main one
    return scenes.map((scene, i) => ({
      ...scene,
      isMain: i === 0,
    }));
  }
  return scenes;
}

interface SceneStore {
  // State
  currentScene: Scene | null;
  scenes: Scene[];

  // Actions
  createScene: (name: string) => string;
  deleteScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  switchToScene: (sceneId: string) => void;
  
  // Utilities
  getMainScene: () => Scene | null;
  getCurrentScene: () => Scene | null;
  
  // Integration
  initializeScenes: (scenes: Scene[], currentSceneId?: string) => void;
  clearScenes: () => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  currentScene: null,
  scenes: [],

  createScene: (name: string) => {
    const { scenes } = get();
    
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name,
      isMain: scenes.length === 0, // First scene is main
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedScenes = [...scenes, newScene];

    // Update project store
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (activeProject) {
      projectStore.updateProject({
        ...activeProject,
        scenes: updatedScenes,
        updatedAt: new Date(),
      });
    }

    set({ scenes: updatedScenes });
    return newScene.id;
  },

  deleteScene: (sceneId: string) => {
    const { scenes, currentScene } = get();
    const sceneToDelete = scenes.find((s) => s.id === sceneId);

    if (!sceneToDelete) {
      console.warn("Scene not found:", sceneId);
      return;
    }

    if (sceneToDelete.isMain) {
      console.error("Cannot delete main scene");
      return;
    }

    const updatedScenes = scenes.filter((s) => s.id !== sceneId);

    // If we're deleting the current scene, switch to main
    let newCurrentScene = currentScene;
    if (currentScene?.id === sceneId) {
      newCurrentScene = getMainScene(updatedScenes);
    }

    // Update project store
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (activeProject) {
      projectStore.updateProject({
        ...activeProject,
        scenes: updatedScenes,
        currentSceneId: newCurrentScene?.id,
        updatedAt: new Date(),
      });
    }

    set({
      scenes: updatedScenes,
      currentScene: newCurrentScene,
    });
  },

  renameScene: (sceneId: string, name: string) => {
    const { scenes } = get();
    const updatedScenes = scenes.map((scene) =>
      scene.id === sceneId 
        ? { ...scene, name, updatedAt: new Date() } 
        : scene
    );

    // Update project store
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (activeProject) {
      projectStore.updateProject({
        ...activeProject,
        scenes: updatedScenes,
        updatedAt: new Date(),
      });
    }

    set({
      scenes: updatedScenes,
      currentScene: updatedScenes.find((s) => s.id === sceneId) || null,
    });
  },

  switchToScene: (sceneId: string) => {
    const { scenes } = get();
    const targetScene = scenes.find((s) => s.id === sceneId);

    if (!targetScene) {
      console.warn("Scene not found:", sceneId);
      return;
    }

    // Update project store
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (activeProject) {
      projectStore.updateProject({
        ...activeProject,
        currentSceneId: sceneId,
        updatedAt: new Date(),
      });
    }

    set({ currentScene: targetScene });

    // Future: Load scene-specific timeline
    // const timelineStore = useTimelineStore.getState();
    // timelineStore.loadSceneTimeline(sceneId);
  },

  getMainScene: () => {
    const { scenes } = get();
    return getMainScene(scenes);
  },

  getCurrentScene: () => {
    return get().currentScene;
  },

  initializeScenes: (scenes: Scene[], currentSceneId?: string) => {
    const validScenes = ensureMainScene(scenes);
    const currentScene = currentSceneId
      ? validScenes.find((s) => s.id === currentSceneId) || getMainScene(validScenes)
      : getMainScene(validScenes);

    set({
      scenes: validScenes,
      currentScene,
    });
  },

  clearScenes: () => {
    set({
      scenes: [],
      currentScene: null,
    });
  },
}));
