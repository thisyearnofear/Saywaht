import { PersistStorage } from 'zustand/middleware';

/**
 * SSR-safe storage wrapper for Zustand persist middleware
 * 
 * This prevents "indexedDB is not defined" errors during server-side rendering
 * by checking if we're in a browser environment before accessing storage APIs.
 * 
 * IMPORTANT: This must be called lazily (inside the persist config) to avoid
 * evaluation during server-side bundle creation.
 */
export const createSSRSafeStorage = <T>(): PersistStorage<T> | undefined => {
  // Return undefined during SSR - Zustand will handle this gracefully
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Only create the storage object in browser environment
  return {
    getItem: (name: string) => {
      try {
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Error reading from localStorage for key "${name}":`, error);
        return null;
      }
    },
    setItem: (name: string, value: unknown) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error writing to localStorage for key "${name}":`, error);
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn(`Error removing from localStorage for key "${name}":`, error);
      }
    },
  };
};
