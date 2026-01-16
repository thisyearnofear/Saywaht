import { TProject, Scene } from "@/lib/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { customStorage } from "@/lib/utils";

interface ProjectStore {
  activeProject: TProject | null;

  // Actions
  createNewProject: (name: string) => void;
  closeProject: () => void;
  updateProjectName: (name: string) => void;
  updateProject: (project: TProject) => void;  // For scene store integration
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      activeProject: null,

      createNewProject: (name: string) => {
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
    }),
    {
      name: "project-storage", // unique name
      storage: customStorage, // define the storage medium
    }
  )
);
