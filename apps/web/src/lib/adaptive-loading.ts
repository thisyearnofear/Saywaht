// Adaptive loading utilities
// Network-aware and device-aware loading strategies

import { useState, useEffect, useCallback } from "react";

// ============================================================================
// NETWORK CONDITIONS DETECTION
// ============================================================================

export interface NetworkInfo {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Hook for detecting network conditions
 */
export function useNetworkInfo(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
    saveData: false,
  });

  useEffect(() => {
    if (!("connection" in navigator)) {
      return;
    }

    const connection = (navigator as any).connection;

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection.effectiveType || "unknown",
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      });
    };

    updateNetworkInfo();
    connection.addEventListener("change", updateNetworkInfo);

    return () => {
      connection.removeEventListener("change", updateNetworkInfo);
    };
  }, []);

  return networkInfo;
}

/**
 * Determines if the network is considered slow
 */
export function useIsSlowNetwork(): boolean {
  const networkInfo = useNetworkInfo();

  return (
    networkInfo.saveData ||
    networkInfo.effectiveType === "slow-2g" ||
    networkInfo.effectiveType === "2g" ||
    (networkInfo.effectiveType === "3g" && networkInfo.downlink < 1.5)
  );
}

// ============================================================================
// DEVICE CAPABILITIES DETECTION
// ============================================================================

export interface DeviceCapabilities {
  memory: number; // GB
  cores: number;
  isLowEnd: boolean;
  supportsWebP: boolean;
  supportsAVIF: boolean;
  prefersReducedMotion: boolean;
}

/**
 * Hook for detecting device capabilities
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    memory: 4, // Default assumption
    cores: 4,  // Default assumption
    isLowEnd: false,
    supportsWebP: false,
    supportsAVIF: false,
    prefersReducedMotion: false,
  });

  useEffect(() => {
    const detectCapabilities = async () => {
      const newCapabilities: DeviceCapabilities = {
        memory: (navigator as any).deviceMemory || 4,
        cores: navigator.hardwareConcurrency || 4,
        isLowEnd: false,
        supportsWebP: await supportsImageFormat("webp"),
        supportsAVIF: await supportsImageFormat("avif"),
        prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      };

      // Determine if device is low-end
      newCapabilities.isLowEnd =
        newCapabilities.memory <= 2 ||
        newCapabilities.cores <= 2;

      setCapabilities(newCapabilities);
    };

    detectCapabilities();
  }, []);

  return capabilities;
}

/**
 * Checks if browser supports a specific image format
 */
async function supportsImageFormat(format: "webp" | "avif"): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);

    const testImages = {
      webp: "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA",
      avif: "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A="
    };

    img.src = testImages[format];
  });
}

// ============================================================================
// ADAPTIVE LOADING STRATEGIES
// ============================================================================

export type LoadingStrategy = "eager" | "lazy" | "progressive" | "minimal";

/**
 * Determines the optimal loading strategy based on network and device conditions
 */
export function useAdaptiveLoadingStrategy(): LoadingStrategy {
  const isSlowNetwork = useIsSlowNetwork();
  const { isLowEnd, memory } = useDeviceCapabilities();

  return useCallback(() => {
    // Minimal loading for very constrained environments
    if (isLowEnd && isSlowNetwork) {
      return "minimal";
    }

    // Progressive loading for slow networks but capable devices
    if (isSlowNetwork && !isLowEnd) {
      return "progressive";
    }

    // Lazy loading for low-end devices on good networks
    if (isLowEnd && !isSlowNetwork) {
      return "lazy";
    }

    // Eager loading for capable devices on good networks
    return "eager";
  }, [isSlowNetwork, isLowEnd])();
}

/**
 * Adaptive image quality based on network and device conditions
 */
export function useAdaptiveImageQuality(): number {
  const isSlowNetwork = useIsSlowNetwork();
  const { isLowEnd } = useDeviceCapabilities();

  if (isSlowNetwork || isLowEnd) {
    return 60; // Lower quality for constrained environments
  }

  if (isSlowNetwork) {
    return 75; // Medium quality for slow networks
  }

  return 90; // High quality for good conditions
}

/**
 * Adaptive animation preferences
 */
export function useAdaptiveAnimations(): {
  enableAnimations: boolean;
  reducedMotion: boolean;
  animationDuration: number;
} {
  const { prefersReducedMotion, isLowEnd } = useDeviceCapabilities();
  const isSlowNetwork = useIsSlowNetwork();

  return {
    enableAnimations: !prefersReducedMotion && !isLowEnd,
    reducedMotion: prefersReducedMotion,
    animationDuration: isLowEnd || isSlowNetwork ? 150 : 300,
  };
}

// ============================================================================
// ADAPTIVE COMPONENT LOADING
// ============================================================================

/**
 * Adaptive component loader configuration
 * Returns the appropriate component loader based on conditions
 */
export function createAdaptiveLoader<T extends React.ComponentType<any>>(
  components: {
    full: () => Promise<{ default: T }>;
    lite?: () => Promise<{ default: T }>;
    minimal?: () => Promise<{ default: T }>;
  }
) {
  return {
    getLoader: (strategy: LoadingStrategy) => {
      switch (strategy) {
        case "minimal":
          return components.minimal || components.lite || components.full;
        case "progressive":
        case "lazy":
          return components.lite || components.full;
        case "eager":
        default:
          return components.full;
      }
    },
    components,
  };
}

// ============================================================================
// ADAPTIVE RESOURCE LOADING
// ============================================================================

/**
 * Adaptive resource preloading based on network conditions
 */
export class AdaptiveResourceLoader {
  private static preloadQueue: Array<{
    url: string;
    priority: "high" | "medium" | "low";
    type: "script" | "style" | "image" | "font";
  }> = [];

  private static isProcessing = false;

  static addToQueue(
    url: string,
    priority: "high" | "medium" | "low" = "medium",
    type: "script" | "style" | "image" | "font" = "script"
  ): void {
    this.preloadQueue.push({ url, priority, type });
    this.processQueue();
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Sort by priority
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Check network conditions
    const isSlowNetwork = this.isSlowNetwork();
    const maxConcurrent = isSlowNetwork ? 2 : 4;

    while (this.preloadQueue.length > 0) {
      const batch = this.preloadQueue.splice(0, maxConcurrent);

      await Promise.allSettled(
        batch.map(({ url, type }) => this.preloadResource(url, type))
      );

      // Add delay for slow networks
      if (isSlowNetwork) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessing = false;
  }

  private static preloadResource(url: string, type: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = url;
      link.as = type;

      if (type === "font") {
        link.crossOrigin = "anonymous";
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload ${url}`));

      document.head.appendChild(link);
    });
  }

  private static isSlowNetwork(): boolean {
    if (!("connection" in navigator)) {
      return false;
    }

    const connection = (navigator as any).connection;
    return (
      connection.saveData ||
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"
    );
  }
}

// ============================================================================
// ADAPTIVE CACHING STRATEGIES
// ============================================================================

/**
 * Adaptive cache configuration based on device capabilities
 */
export function useAdaptiveCacheConfig(): {
  maxCacheSize: number; // MB
  maxCacheAge: number;  // minutes
  enableServiceWorker: boolean;
} {
  const { memory, isLowEnd } = useDeviceCapabilities();
  const isSlowNetwork = useIsSlowNetwork();

  if (isLowEnd) {
    return {
      maxCacheSize: 10, // 10MB for low-end devices
      maxCacheAge: 60,  // 1 hour
      enableServiceWorker: false,
    };
  }

  if (isSlowNetwork) {
    return {
      maxCacheSize: Math.min(memory * 4, 50), // 4MB per GB of RAM, max 50MB
      maxCacheAge: 240, // 4 hours for slow networks
      enableServiceWorker: true,
    };
  }

  return {
    maxCacheSize: Math.min(memory * 8, 100), // 8MB per GB of RAM, max 100MB
    maxCacheAge: 120, // 2 hours
    enableServiceWorker: true,
  };
}
