/**
 * Store Sync Utility
 * 
 * Provides automatic synchronization between Zustand stores and IndexedDB
 * for offline persistence and crash recovery.
 * 
 * Features:
 * - Debounced auto-save
 * - State recovery on app load
 * - Project-specific state isolation
 * - Memory-efficient state snapshots
 */

import { StateCreator } from 'zustand';
import {
  saveEditorState,
  getEditorState,
  saveProject,
  getProject,
  getAllProjects,
  deleteProject,
  ProjectData,
  EditorState,
} from './storage-indexeddb';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Store state types
export interface StoreState {
  project?: any;
  timeline?: any;
  canvas?: any;
  text?: any;
  media?: any;
  playback?: any;
  scene?: any;
}

// Sync configuration
interface SyncConfig {
  autoSaveDelay: number; // ms to wait before saving after change
  maxStateAge: number; // ms to keep state in IndexedDB
  enabled: boolean;
}

const DEFAULT_CONFIG: SyncConfig = {
  autoSaveDelay: 1000, // 1 second
  maxStateAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  enabled: true,
};

class StoreSyncManager {
  private config: SyncConfig;
  private currentProjectId: string | null = null;
  private saveQueue: Map<string, () => void> = new Map();
  private initialized: boolean = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Import IndexedDB to trigger initialization
      await import('./storage-indexeddb');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize store sync:', error);
      return false;
    }
  }

  /**
   * Set the current project ID for state isolation
   */
  setProjectId(projectId: string | null) {
    this.currentProjectId = projectId;
  }

  /**
   * Create a debounced save function for a store
   */
  private createDebouncedSave(storeName: string) {
    return debounce(async (state: any) => {
      if (!this.config.enabled || !this.currentProjectId) return;

      try {
        // Get existing state or create new
        const existingState = await this.getStoredState();
        
        const newState: EditorState = {
          ...existingState,
          projectId: this.currentProjectId,
          [storeName]: state,
          savedAt: Date.now(),
        };

        await saveEditorState(newState);
      } catch (error) {
        console.error(`Failed to save ${storeName} state:`, error);
      }
    }, this.config.autoSaveDelay);
  }

  /**
   * Get stored editor state for current project
   */
  async getStoredState(): Promise<EditorState | null> {
    if (!this.currentProjectId) return null;
    return await getEditorState(this.currentProjectId);
  }

  /**
   * Restore state from IndexedDB
   */
  async restoreState(): Promise<StoreState | null> {
    const state = await this.getStoredState();
    if (!state) return null;

    return {
      timeline: state.timeline || null,
      canvas: state.canvas || null,
      text: state.text || null,
      media: state.media || null,
      playback: state.playback || null,
      scene: state.scene || null,
    };
  }

  /**
   * Create a Zustand middleware for auto-syncing a store
   */
  createSyncMiddleware<T extends object>(storeName: string) {
    const debouncedSave = this.createDebouncedSave(storeName);

    return (
      config: StateCreator<T, [], []>,
      options: { name?: string; skipKeys?: string[] } = {}
    ): StateCreator<T, [], []> => {
      return (set, get, api) => {
        const originalSet = set;

        const syncedSet = (partial: any) => {
          const state = get();
          originalSet(partial as Partial<T>);

          // Get updated state
          const updatedState = get();

          // Filter out skipped keys
          if (options.skipKeys) {
            const filteredState = { ...updatedState };
            options.skipKeys.forEach((key) => {
              delete (filteredState as any)[key];
            });
            debouncedSave(filteredState);
          } else {
            debouncedSave(updatedState);
          }
        };

        return config(syncedSet, get, api);
      };
    };
  }

  /**
   * Save complete project data
   */
  async saveProjectData(
    id: string,
    name: string,
    data: any,
    thumbnail?: string
  ): Promise<void> {
    const project: ProjectData = {
      id,
      name,
      data,
      thumbnail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    await saveProject(project);
  }

  /**
   * Get all saved projects
   */
  async getAllSavedProjects(): Promise<ProjectData[]> {
    return await getAllProjects();
  }

  /**
   * Get a specific project
   */
  async getSavedProject(id: string): Promise<ProjectData | null> {
    return await getProject(id);
  }

  /**
   * Delete a project and its state
   */
  async deleteSavedProject(id: string): Promise<void> {
    await deleteProject(id);
  }

  /**
   * Clear all stored state
   */
  async clearAllState(): Promise<void> {
    const { clearAllStorage } = await import('./storage-indexeddb');
    await clearAllStorage();
  }

  /**
   * Enable/disable auto-save
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  /**
   * Force save current state immediately
   */
  async forceSave(state: StoreState): Promise<void> {
    if (!this.currentProjectId) return;

    const editorState: EditorState = {
      projectId: this.currentProjectId,
      timeline: state.timeline || null,
      canvas: state.canvas || null,
      text: state.text || null,
      media: state.media || null,
      playback: state.playback || null,
      scene: state.scene || null,
      savedAt: Date.now(),
    };

    await saveEditorState(editorState);
  }
}

// Singleton instance
export const storeSyncManager = new StoreSyncManager();

/**
 * Hook to get sync middleware for a store
 */
export function createStoreSyncMiddleware<T extends object>(storeName: string) {
  return storeSyncManager.createSyncMiddleware<T>(storeName);
}

/**
 * Initialize store sync on app load
 */
export async function initializeStoreSync(): Promise<boolean> {
  return storeSyncManager.initialize();
}

/**
 * Restore state from IndexedDB
 */
export async function restoreStoreState(): Promise<StoreState | null> {
  return storeSyncManager.restoreState();
}

/**
 * Set current project for state isolation
 */
export function setSyncProjectId(projectId: string | null) {
  storeSyncManager.setProjectId(projectId);
}
