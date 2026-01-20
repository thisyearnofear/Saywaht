import { PersistStorage } from 'zustand/middleware';

/**
 * SSR-safe storage wrapper for Zustand persist middleware
 * 
 * This prevents "indexedDB is not defined" errors during server-side rendering
 * by checking if we're in a browser environment before accessing storage APIs.
 */
export const createSSRSafeStorage = <T>(): PersistStorage<T> => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  return {
    getItem: (name: string) => {
      if (!isBrowser) {
        return null;
      }
      try {
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Error reading from localStorage for key "${name}":`, error);
        return null;
      }
    },
    setItem: (name: string, value: T) => {
      if (!isBrowser) {
        return;
      }
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error writing to localStorage for key "${name}":`, error);
      }
    },
    removeItem: (name: string) => {
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
