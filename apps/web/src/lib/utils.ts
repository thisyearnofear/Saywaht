// Enhanced utility functions - Single source of truth for common operations
// Organized by domain for better maintainability

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Address } from "./types";

// ============================================================================
// STYLING UTILITIES
// ============================================================================

/**
 * Combines class names with Tailwind CSS conflict resolution
 * Enhanced version with better type safety
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates conditional class names based on state
 */
export function conditionalClass(
  baseClass: string,
  condition: boolean,
  conditionalClass: string
): string {
  return cn(baseClass, condition && conditionalClass);
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalizes first letter of each word
 */
export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Converts camelCase to kebab-case
 */
export function kebabCase(text: string): string {
  return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// ============================================================================
// NUMBER & FORMATTING UTILITIES
// ============================================================================

/**
 * Formats numbers with appropriate suffixes (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toString();
}

/**
 * Formats file sizes in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Alias for formatDuration - formats time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  return formatDuration(seconds);
}

// ============================================================================
// BLOCKCHAIN UTILITIES
// ============================================================================

/**
 * Truncates Ethereum address for display
 */
export function truncateAddress(address: Address, startLength = 6, endLength = 4): string {
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Validates Ethereum address format
 */
export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Resolves IPFS or Lens URIs to public gateway URLs
 */
export function resolveIpfsUrl(uri: string): string {
  if (!uri) return uri;
  
  // Already a HTTP(S) URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  
  // IPFS URI
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    // Prefer Grove gateway for better performance/reliability if configured
    return `https://ipfs.io/ipfs/${hash}`;
  }
  
  // Lens URI (storage-client uses lens:// prefix)
  if (uri.startsWith('lens://')) {
    const hash = uri.replace('lens://', '');
    return `https://api.grove.storage/ipfs/${hash}`;
  }
  
  return uri;
}

// ============================================================================
// ARRAY & OBJECT UTILITIES
// ============================================================================

/**
 * Removes duplicates from array based on key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Groups array items by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key]);
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Deep clone object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === "object") {
    const clonedObj = {} as T;
    for (const key in obj) {
      clonedObj[key] = deepClone(obj[key]);
    }
    return clonedObj;
  }
  return obj;
}

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

/**
 * Creates a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounces function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttles function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================================================
// STORAGE UTILITIES (Consolidated from custom-storage.ts)
// ============================================================================

/**
 * Enhanced localStorage wrapper with JSON serialization
 */
export const customStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to parse localStorage item "${name}":`, error);
      return null;
    }
  },
  setItem: (name: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to set localStorage item "${name}":`, error);
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${name}":`, error);
    }
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  },
};
