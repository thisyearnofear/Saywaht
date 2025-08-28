// Performance optimization utilities
// Adaptive loading, caching, and resource optimization

import React, { useEffect, useRef, useState, useCallback } from "react";

// ============================================================================
// LAZY LOADING & CODE SPLITTING
// ============================================================================

/**
 * Creates a lazy-loaded component with loading state
 * Note: This function returns a component factory for use in React components
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return React.lazy(importFn);
}

/**
 * Preloads a component for better performance
 */
export function preloadComponent(importFn: () => Promise<any>) {
  const componentImport = importFn();
  return componentImport;
}

// ============================================================================
// INTERSECTION OBSERVER (VIEWPORT OPTIMIZATION)
// ============================================================================

/**
 * Hook for intersection observer with performance optimizations
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [hasIntersected, options]);

  return { targetRef, isIntersecting, hasIntersected };
}

/**
 * Hook for lazy loading images with intersection observer
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || "");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const { targetRef, hasIntersected } = useIntersectionObserver();

  useEffect(() => {
    if (!hasIntersected) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setIsError(true);
    };
    img.src = src;
  }, [hasIntersected, src]);

  return { targetRef, imageSrc, isLoaded, isError };
}

// ============================================================================
// MEMORY OPTIMIZATION
// ============================================================================

/**
 * Memoized callback with dependency optimization
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, [callback, ...deps]);
}

/**
 * Debounced state for performance optimization
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue];
}

/**
 * Throttled state for high-frequency updates
 */
export function useThrottledState<T>(
  initialValue: T,
  limit: number = 100
): [T, (value: T) => void] {
  const [value, setValue] = useState(initialValue);
  const lastRun = useRef(Date.now());

  const throttledSetValue = useCallback(
    (newValue: T) => {
      if (Date.now() - lastRun.current >= limit) {
        setValue(newValue);
        lastRun.current = Date.now();
      }
    },
    [limit]
  );

  return [value, throttledSetValue];
}

// ============================================================================
// RESOURCE OPTIMIZATION
// ============================================================================

/**
 * Optimized image loading with multiple formats
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  formats?: string[];
  sizes?: string;
  priority?: boolean;
}

export function getOptimizedImageUrl(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}
): string {
  const { width, height, quality = 75, format = "webp" } = options;

  // For Next.js Image Optimization API
  const params = new URLSearchParams();
  if (width) params.set("w", width.toString());
  if (height) params.set("h", height.toString());
  params.set("q", quality.toString());
  params.set("f", format);

  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

/**
 * Preloads critical resources
 */
export function preloadResource(
  href: string,
  as: "script" | "style" | "image" | "font" = "script"
) {
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;

  if (as === "font") {
    link.crossOrigin = "anonymous";
  }

  document.head.appendChild(link);
}

// ============================================================================
// CACHING UTILITIES
// ============================================================================

/**
 * Simple in-memory cache with TTL
 */
class MemoryCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();

  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const memoryCache = new MemoryCache();

/**
 * Hook for cached API calls
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cachedData = memoryCache.get(key) as T | null;
    if (cachedData) {
      setData(cachedData);
      return;
    }

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        memoryCache.set(key, result, ttl);
        setData(result);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, ttl, fetcher]);

  return { data, loading, error };
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static start(name: string): void {
    this.measurements.set(name, performance.now());
  }

  static end(name: string): number {
    const start = this.measurements.get(name);
    if (!start) {
      console.warn(`Performance measurement "${name}" was not started`);
      return 0;
    }

    const duration = performance.now() - start;
    this.measurements.delete(name);

    if (process.env.NODE_ENV === "development") {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static measure<T>(name: string, fn: () => T): T {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }
}

/**
 * Hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔄 ${componentName} render #${renderCount.current} (${timeSinceLastRender.toFixed(2)}ms since last)`
      );
    }
  });

  return renderCount.current;
}
