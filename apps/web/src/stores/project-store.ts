import { TProject, Scene } from "@/lib/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSSRSafeStorage } from "@/lib/storage-ssr-safe";
import { useMediaStore } from "./media-store";
import { useTimelineStore } from "./timeline-store";
import { usePlaybackStore } from "./playback-store";
import { useCanvasStore, canvasPresets } from "./canvas-store";

interface RecentProject {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail?: string;
  duration?: number;
}

interface ProjectStore {
  activeProject: TProject | null;
  recentProjects: RecentProject[];

  // Actions
  createNewProject: (name: string) => void;
  closeProject: () => void;
  updateProjectName: (name: string) => void;
  updateProject: (project: TProject) => void;  // For scene store integration
  addToRecentProjects: (project: RecentProject) => void;
  removeFromRecentProjects: (projectId: string) => void;
  clearRecentProjects: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => {
      const resetEditorState = () => {
        const mediaStore = useMediaStore.getState();
        const timelineStore = useTimelineStore.getState();
        const playbackStore = usePlaybackStore.getState();
        const canvasStore = useCanvasStore.getState();

        mediaStore.clearAllMedia();
        timelineStore.setTracks([]);
        timelineStore.clearSelectedClips();
        playbackStore.pause();
        playbackStore.setCurrentTime(0);
        playbackStore.setDuration(0);
        playbackStore.resetVideoReady();
        canvasStore.setCanvasPreset(canvasPresets[0]);
      };

      return {
        activeProject: null,
        recentProjects: [],

        createNewProject: (name: string) => {
          // Reset editor state across persisted sibling stores so new projects
          // always start from a true blank slate.
          resetEditorState();

          const sceneId = crypto.randomUUID();
          const mainScene: Scene = {
            id: sceneId,
            name: "Main scene",
            isMain: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const newProject: TProject = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date(),
            updatedAt: new Date(),
            scenes: [mainScene],
            currentSceneId: sceneId,
          };
          set({ activeProject: newProject });
        },

        closeProject: () => {
          resetEditorState();
          set({ activeProject: null });
        },

        updateProjectName: (name: string) => {
          set((state) => ({
            activeProject: state.activeProject
              ? {
                  ...state.activeProject,
                  name,
                  updatedAt: new Date(),
                }
              : null,
          }));
        },

        updateProject: (project: TProject) => {
          set({ activeProject: project });
        },

        addToRecentProjects: (project: RecentProject) => {
          set((state) => {
            // Remove if already exists
            const filtered = state.recentProjects.filter((p) => p.id !== project.id);
            // Add to beginning
            const updated = [project, ...filtered].slice(0, 10); // Keep max 10
            return { recentProjects: updated };
          });
        },

        removeFromRecentProjects: (projectId: string) => {
          set((state) => ({
            recentProjects: state.recentProjects.filter((p) => p.id !== projectId),
          }));
        },

        clearRecentProjects: () => {
          set({ recentProjects: [] });
        },
      };
    },
    {
      name: "project-storage", // unique name
      storage: createSSRSafeStorage(), // define the storage medium
    }
  )
);
