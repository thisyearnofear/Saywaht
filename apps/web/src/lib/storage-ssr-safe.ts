import { StateStorage } from 'zustand/middleware';

/**
 * SSR-safe storage wrapper for Zustand persist middleware
 * 
 * This prevents "indexedDB is not defined" errors during server-side rendering
 * by checking if we're in a browser environment before accessing storage APIs.
 */
export const createSSRSafeStorage = (): StateStorage => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  return {
    getItem: (name: string): string | null => {
      if (!isBrowser) {
        return null;
      }
      try {
        return localStorage.getItem(name);
      } catch (error) {
        console.warn(`Error reading from localStorage for key "${name}":`, error);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      if (!isBrowser) {
        return;
      }
      try {
        localStorage.setItem(name, value);
      } catch (error) {
        console.warn(`Error writing to localStorage for key "${name}":`, error);
      }
    },
    removeItem: (name: string): void => {
      if (!isBrowser) {
        return;
      }
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn(`Error removing from localStorage for key "${name}":`, error);
      }
    },
  };
};
