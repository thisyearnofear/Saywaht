import React from '@/lib/hooks-provider';
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { groveStorage } from "@/lib/grove-storage";
import { useWalletAuth } from "@opencut/auth";
import { useEffect } from '@/lib/hooks-provider';

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  walletAddress: string;
  
  // Timeline data
  tracks: any[]; // From timeline store
  mediaItems: any[]; // From media store
  settings: {
    duration: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  
  // IPFS storage info
  ipfsUri?: string; // Grove URI for the project
  ipfsGatewayUrl?: string; // Direct access URL
  lastSyncedAt?: string;
  isDirty: boolean; // Has unsaved changes
}

interface ProjectIPFSStore {
  // Current project
  currentProject: ProjectData | null;
  
  // Project cache (local storage)
  projectCache: Record<string, ProjectData>;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isLoadingFromIPFS: boolean;
  
  // Actions
  createProject: (name: string, walletAddress: string) => ProjectData;
  updateProject: (updates: Partial<ProjectData>) => void;
  saveToIPFS: () => Promise<void>;
  loadFromIPFS: (ipfsUri: string) => Promise<void>;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  
  // Auto-save functionality
  markDirty: () => void;
  getProjectList: (walletAddress: string) => ProjectData[];
}

export const useProjectIPFSStore = create<ProjectIPFSStore>()(
  persist(
    (set, get) => ({
      currentProject: null,
      projectCache: {},
      isLoading: false,
      isSaving: false,
      isLoadingFromIPFS: false,

      createProject: (name: string, walletAddress: string) => {
        const project: ProjectData = {
          id: crypto.randomUUID(),
          name,
          description: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          walletAddress,
          tracks: [],
          mediaItems: [],
          settings: {
            duration: 30,
            fps: 30,
            resolution: { width: 1920, height: 1080 },
          },
          isDirty: true,
        };

        set((state) => ({
          currentProject: project,
          projectCache: {
            ...state.projectCache,
            [project.id]: project,
          },
        }));

        return project;
      },

      updateProject: (updates) => {
        set((state) => {
          if (!state.currentProject) return state;

          const updatedProject = {
            ...state.currentProject,
            ...updates,
            updatedAt: new Date().toISOString(),
            isDirty: true,
          };

          return {
            currentProject: updatedProject,
            projectCache: {
              ...state.projectCache,
              [updatedProject.id]: updatedProject,
            },
          };
        });
      },

      saveToIPFS: async () => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({ isSaving: true });

        try {
          console.log("💾 Saving project to IPFS...");

          // Prepare project data for IPFS
          const projectData = {
            ...currentProject,
            savedAt: new Date().toISOString(),
            version: "1.0",
            platform: "SayWhat",
          };

          // Upload to Grove/IPFS
          const result = await groveStorage.uploadMetadata(projectData);

          // Update project with IPFS info
          const updatedProject = {
            ...currentProject,
            ipfsUri: result.uri,
            ipfsGatewayUrl: result.gatewayUrl,
            lastSyncedAt: new Date().toISOString(),
            isDirty: false,
          };

          set((state) => ({
            currentProject: updatedProject,
            projectCache: {
              ...state.projectCache,
              [updatedProject.id]: updatedProject,
            },
            isSaving: false,
          }));

          console.log("✅ Project saved to IPFS:", result.uri);
        } catch (error) {
          console.error("❌ Failed to save project to IPFS:", error);
          set({ isSaving: false });
          throw error;
        }
      },

      loadFromIPFS: async (ipfsUri: string) => {
        set({ isLoadingFromIPFS: true });

        try {
          console.log("📥 Loading project from IPFS:", ipfsUri);

          // Convert IPFS URI to gateway URL for fetching
          const gatewayUrl = ipfsUri.replace('ipfs://', 'https://api.grove.storage/');
          
          const response = await fetch(gatewayUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch project: ${response.statusText}`);
          }

          const projectData: ProjectData = await response.json();

          // Validate project data
          if (!projectData.id || !projectData.name) {
            throw new Error("Invalid project data");
          }

          // Update with current IPFS info
          const loadedProject = {
            ...projectData,
            ipfsUri,
            ipfsGatewayUrl: gatewayUrl,
            lastSyncedAt: new Date().toISOString(),
            isDirty: false,
          };

          set((state) => ({
            currentProject: loadedProject,
            projectCache: {
              ...state.projectCache,
              [loadedProject.id]: loadedProject,
            },
            isLoadingFromIPFS: false,
          }));

          console.log("✅ Project loaded from IPFS");
        } catch (error) {
          console.error("❌ Failed to load project from IPFS:", error);
          set({ isLoadingFromIPFS: false });
          throw error;
        }
      },

      loadProject: (projectId: string) => {
        const { projectCache } = get();
        const project = projectCache[projectId];

        if (project) {
          set({ currentProject: project });
        }
      },

      deleteProject: (projectId: string) => {
        set((state) => {
          const newCache = { ...state.projectCache };
          delete newCache[projectId];

          return {
            projectCache: newCache,
            currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
          };
        });
      },

      markDirty: () => {
        set((state) => {
          if (!state.currentProject) return state;

          return {
            currentProject: {
              ...state.currentProject,
              isDirty: true,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      getProjectList: (walletAddress: string) => {
        const { projectCache } = get();
        return Object.values(projectCache)
          .filter(project => project.walletAddress === walletAddress)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      },
    }),
    {
      name: "saywhat-project-ipfs-store",
      partialize: (state) => ({
        projectCache: state.projectCache,
      }),
    }
  )
);

// Auto-save hook
export function useAutoSave() {
  const { currentProject, saveToIPFS, isSaving } = useProjectIPFSStore();
  
  // Auto-save every 30 seconds if project is dirty
  useEffect(() => {
    if (!currentProject?.isDirty || isSaving) return;

    const interval = setInterval(() => {
      if (currentProject.isDirty && !isSaving) {
        saveToIPFS().catch(console.error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [currentProject?.isDirty, isSaving, saveToIPFS]);
}
