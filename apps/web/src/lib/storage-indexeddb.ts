/**
 * IndexedDB Storage Utility
 * 
 * Provides persistent offline storage for editor state, projects, and media
 * with automatic cleanup and size management.
 * 
 * Features:
 * - Promise-based API
 * - Automatic versioning and migrations
 * - Size-based cleanup (LRU eviction)
 * - SSR-safe (graceful degradation)
 */

const DB_NAME = 'saywaht-offline-storage';
const DB_VERSION = 1;
const STORES = {
  PROJECTS: 'projects',
  EDITOR_STATE: 'editor-state',
  MEDIA_CACHE: 'media-cache',
  SETTINGS: 'settings',
};

const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit
const MAX_PROJECTS = 10; // Keep last 10 projects

export interface ProjectData {
  id: string;
  name: string;
  data: any;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
}

export interface EditorState {
  projectId?: string;
  timeline?: any;
  canvas?: any;
  text?: any;
  media?: any;
  playback?: any;
  scene?: any;
  savedAt: number;
}

export interface MediaCacheEntry {
  url: string;
  blob: Blob;
  type: string;
  size: number;
  accessedAt: number;
  expiresAt?: number;
}

interface StorageDB {
  db: IDBDatabase | null;
  isOpen: boolean;
}

const storage: StorageDB = {
  db: null,
  isOpen: false,
};

/**
 * Initialize IndexedDB connection
 */
export async function initIndexedDB(): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.warn('IndexedDB not available: running on server');
    return false;
  }

  if (storage.isOpen && storage.db) {
    return true;
  }

  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        storage.db = request.result;
        storage.isOpen = true;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          projectStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.EDITOR_STATE)) {
          db.createObjectStore(STORES.EDITOR_STATE, { keyPath: 'projectId' });
        }

        if (!db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
          const mediaStore = db.createObjectStore(STORES.MEDIA_CACHE, { keyPath: 'url' });
          mediaStore.createIndex('accessedAt', 'accessedAt', { unique: false });
          mediaStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  } catch (error) {
    console.error('IndexedDB initialization error:', error);
    return false;
  }
}

/**
 * Get database instance (ensures initialization)
 */
async function getDB(): Promise<IDBDatabase | null> {
  if (storage.isOpen && storage.db) {
    return storage.db;
  }
  
  const initialized = await initIndexedDB();
  return initialized ? storage.db : null;
}

/**
 * Generic IndexedDB operation helper
 */
async function dbOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await getDB();
  if (!db) {
    throw new Error('IndexedDB not available');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('Transaction aborted'));

    let result: T;

    operation(store).then((r) => {
      result = r;
    }).catch(reject);
  });
}

/**
 * Project Storage Operations
 */

export async function saveProject(project: ProjectData): Promise<void> {
  const now = Date.now();
  const projectWithTimestamps = {
    ...project,
    createdAt: project.createdAt || now,
    updatedAt: now,
    lastAccessedAt: now,
  };

  await dbOperation(STORES.PROJECTS, 'readwrite', async (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put(projectWithTimestamps);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });

  // Cleanup old projects if exceeding limit
  await cleanupOldProjects();
}

export async function getProject(id: string): Promise<ProjectData | null> {
  return dbOperation(STORES.PROJECTS, 'readonly', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update last accessed time
          result.lastAccessedAt = Date.now();
          store.put(result);
        }
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getAllProjects(): Promise<ProjectData[]> {
  return dbOperation(STORES.PROJECTS, 'readonly', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = request.result || [];
        // Sort by last accessed, most recent first
        projects.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
        resolve(projects);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function deleteProject(id: string): Promise<void> {
  await dbOperation(STORES.PROJECTS, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

async function cleanupOldProjects(): Promise<void> {
  await dbOperation(STORES.PROJECTS, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = request.result || [];
        if (projects.length > MAX_PROJECTS) {
          // Sort by last accessed, oldest first
          projects.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
          
          // Delete oldest projects
          const toDelete = projects.slice(0, projects.length - MAX_PROJECTS);
          toDelete.forEach((project) => {
            store.delete(project.id);
          });
        }
        resolve(undefined);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Editor State Operations
 */

export async function saveEditorState(state: EditorState): Promise<void> {
  const stateWithTimestamp = {
    ...state,
    savedAt: Date.now(),
  };

  await dbOperation(STORES.EDITOR_STATE, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(stateWithTimestamp);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getEditorState(projectId: string): Promise<EditorState | null> {
  return dbOperation(STORES.EDITOR_STATE, 'readonly', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(projectId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function clearEditorState(projectId: string): Promise<void> {
  await dbOperation(STORES.EDITOR_STATE, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(projectId);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Media Cache Operations
 */

export async function cacheMedia(
  url: string,
  blob: Blob,
  type: string,
  ttlMs?: number
): Promise<void> {
  const entry: MediaCacheEntry = {
    url,
    blob,
    type,
    size: blob.size,
    accessedAt: Date.now(),
    expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
  };

  await dbOperation(STORES.MEDIA_CACHE, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });

  // Check storage size and cleanup if needed
  await cleanupMediaCache();
}

export async function getCachedMedia(url: string): Promise<Blob | null> {
  return dbOperation(STORES.MEDIA_CACHE, 'readonly', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update access time
          result.accessedAt = Date.now();
          store.put(result);
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function clearExpiredMediaCache(): Promise<void> {
  const now = Date.now();
  
  await dbOperation(STORES.MEDIA_CACHE, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = request.result || [];
        entries.forEach((entry) => {
          if (entry.expiresAt && entry.expiresAt < now) {
            store.delete(entry.url);
          }
        });
        resolve(undefined);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

async function cleanupMediaCache(): Promise<void> {
  await dbOperation(STORES.MEDIA_CACHE, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = request.result || [];
        let totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

        if (totalSize > MAX_STORAGE_SIZE) {
          // Sort by access time, oldest first
          entries.sort((a, b) => a.accessedAt - b.accessedAt);
          
          // Delete oldest entries until under limit
          for (const entry of entries) {
            if (totalSize <= MAX_STORAGE_SIZE) break;
            store.delete(entry.url);
            totalSize -= entry.size;
          }
        }
        resolve(undefined);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function clearAllMediaCache(): Promise<void> {
  await dbOperation(STORES.MEDIA_CACHE, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Settings Operations
 */

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  await dbOperation(STORES.SETTINGS, 'readwrite', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, updatedAt: Date.now() });
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getSetting<T>(key: string): Promise<T | null> {
  return dbOperation(STORES.SETTINGS, 'readonly', async (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Utility Functions
 */

export async function getStorageStats(): Promise<{
  projects: number;
  editorStates: number;
  mediaCacheSize: number;
  totalSize: number;
}> {
  const db = await getDB();
  if (!db) {
    return { projects: 0, editorStates: 0, mediaCacheSize: 0, totalSize: 0 };
  }

  const [projects, editorStates, mediaEntries] = await Promise.all([
    dbOperation(STORES.PROJECTS, 'readonly', async (store) => {
      return new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }),
    dbOperation(STORES.EDITOR_STATE, 'readonly', async (store) => {
      return new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }),
    dbOperation(STORES.MEDIA_CACHE, 'readonly', async (store) => {
      return new Promise<MediaCacheEntry[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    }),
  ]);

  const mediaCacheSize = mediaEntries.reduce((sum, entry) => sum + entry.size, 0);

  return {
    projects,
    editorStates,
    mediaCacheSize,
    totalSize: mediaCacheSize,
  };
}

export async function clearAllStorage(): Promise<void> {
  const db = await getDB();
  if (!db) return;

  await Promise.all([
    dbOperation(STORES.PROJECTS, 'readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }),
    dbOperation(STORES.EDITOR_STATE, 'readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }),
    dbOperation(STORES.MEDIA_CACHE, 'readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }),
    dbOperation(STORES.SETTINGS, 'readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }),
  ]);
}

/**
 * Auto-initialize on first import (SSR-safe)
 */
if (typeof window !== 'undefined') {
  initIndexedDB().catch(console.error);
}
