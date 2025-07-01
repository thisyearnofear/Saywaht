import { TProject } from "@/types/project";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { customStorage } from "@/lib/custom-storage";

interface ProjectStore {
  activeProject: TProject | null;

  // Actions
  createNewProject: (name: string) => void;
  closeProject: () => void;
  updateProjectName: (name: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      activeProject: null,

      createNewProject: (name: string) => {
        const newProject: TProject = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
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
    }),
    {
      name: "project-storage", // unique name
      storage: customStorage, // define the storage medium
    }
  )
);
