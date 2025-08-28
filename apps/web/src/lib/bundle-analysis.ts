// Bundle analysis and optimization utilities
// Tools for monitoring and preventing bundle bloat

// ============================================================================
// DYNAMIC IMPORT UTILITIES
// ============================================================================

/**
 * Creates a dynamic import with error handling and loading states
 */
export function createDynamicImport<T>(
  importFn: () => Promise<T>,
  options: {
    retries?: number;
    retryDelay?: number;
    fallback?: T;
  } = {}
) {
  const { retries = 3, retryDelay = 1000, fallback } = options;

  return async function dynamicImport(): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
    }

    if (fallback) {
      console.warn(`Dynamic import failed after ${retries} retries, using fallback:`, lastError);
      return fallback;
    }

    throw lastError || new Error("Dynamic import failed");
  };
}

/**
 * Preloads modules for better performance
 */
export class ModulePreloader {
  private static preloadedModules = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  static preload<T>(
    moduleId: string,
    importFn: () => Promise<T>
  ): Promise<T> {
    if (this.preloadPromises.has(moduleId)) {
      return this.preloadPromises.get(moduleId)!;
    }

    const promise = importFn().then(module => {
      this.preloadedModules.add(moduleId);
      return module;
    });

    this.preloadPromises.set(moduleId, promise);
    return promise;
  }

  static isPreloaded(moduleId: string): boolean {
    return this.preloadedModules.has(moduleId);
  }

  static getPreloadedModule<T>(moduleId: string): Promise<T> | null {
    return this.preloadPromises.get(moduleId) || null;
  }

  static clearPreloaded(): void {
    this.preloadedModules.clear();
    this.preloadPromises.clear();
  }
}

// ============================================================================
// ROUTE-BASED CODE SPLITTING
// ============================================================================

/**
 * Route-based code splitting configuration
 */
export const ROUTE_CHUNKS = {
  // Core routes (always loaded)
  core: ["/", "/404", "/500"],
  
  // Feature-based chunks
  editor: ["/editor", "/templates"],
  auth: ["/login", "/signup", "/profile"],
  admin: ["/admin"],
  
  // Heavy feature chunks (loaded on demand)
  ai: ["/ai"],
  collaboration: ["/collaborate"],
  analytics: ["/analytics"],
} as const;

/**
 * Determines which chunk a route belongs to
 */
export function getRouteChunk(pathname: string): keyof typeof ROUTE_CHUNKS | "unknown" {
  for (const [chunk, routes] of Object.entries(ROUTE_CHUNKS)) {
    if (routes.some(route => pathname.startsWith(route))) {
      return chunk as keyof typeof ROUTE_CHUNKS;
    }
  }
  return "unknown";
}

/**
 * Preloads route chunks based on user behavior
 */
export class RoutePreloader {
  private static preloadedChunks = new Set<string>();

  static preloadChunk(chunk: keyof typeof ROUTE_CHUNKS): void {
    if (this.preloadedChunks.has(chunk)) return;

    this.preloadedChunks.add(chunk);

    // Preload based on chunk type (commented out non-existent imports)
    switch (chunk) {
      case "editor":
        // ModulePreloader.preload("editor", () => import("@/components/editor"));
        console.log(`Preloading editor chunk: ${chunk}`);
        break;
      case "auth":
        // ModulePreloader.preload("auth", () => import("@/components/auth"));
        console.log(`Preloading auth chunk: ${chunk}`);
        break;
      case "ai":
        // ModulePreloader.preload("ai", () => import("@/lib/ai"));
        console.log(`Preloading AI chunk: ${chunk}`);
        break;
      // Add more chunks as needed
    }
  }

  static preloadOnHover(element: HTMLElement, chunk: keyof typeof ROUTE_CHUNKS): () => void {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        this.preloadChunk(chunk);
      }, 100); // Small delay to avoid unnecessary preloads
    };

    const handleMouseLeave = () => {
      clearTimeout(timeoutId);
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup function
    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timeoutId);
    };
  }
}

// ============================================================================
// BUNDLE SIZE MONITORING
// ============================================================================

/**
 * Bundle size monitoring and alerts
 */
export class BundleSizeMonitor {
  private static readonly SIZE_LIMITS = {
    // Size limits in KB
    total: 1000, // 1MB total
    vendor: 500,  // 500KB for vendor chunks
    page: 200,    // 200KB per page
    component: 50, // 50KB per component
  };

  private static measurements = new Map<string, number>();

  static measureChunkSize(chunkName: string, sizeInBytes: number): void {
    const sizeInKB = sizeInBytes / 1024;
    this.measurements.set(chunkName, sizeInKB);

    if (process.env.NODE_ENV === "development") {
      this.checkSizeLimit(chunkName, sizeInKB);
    }
  }

  private static checkSizeLimit(chunkName: string, sizeInKB: number): void {
    const limit = this.getSizeLimit(chunkName);
    
    if (sizeInKB > limit) {
      console.warn(
        `⚠️ Bundle size warning: ${chunkName} (${sizeInKB.toFixed(1)}KB) exceeds limit (${limit}KB)`
      );
    } else if (sizeInKB > limit * 0.8) {
      console.info(
        `📊 Bundle size info: ${chunkName} (${sizeInKB.toFixed(1)}KB) is approaching limit (${limit}KB)`
      );
    }
  }

  private static getSizeLimit(chunkName: string): number {
    if (chunkName.includes("vendor")) return this.SIZE_LIMITS.vendor;
    if (chunkName.includes("page")) return this.SIZE_LIMITS.page;
    if (chunkName.includes("component")) return this.SIZE_LIMITS.component;
    return this.SIZE_LIMITS.total;
  }

  static getReport(): Record<string, number> {
    return Object.fromEntries(this.measurements);
  }

  static getTotalSize(): number {
    return Array.from(this.measurements.values()).reduce((sum, size) => sum + size, 0);
  }
}

// ============================================================================
// TREE SHAKING OPTIMIZATION
// ============================================================================

/**
 * Tree shaking utilities and helpers
 */
export const TreeShakingHelpers = {
  /**
   * Creates a tree-shakable export map
   */
  createExportMap<T extends Record<string, any>>(exports: T): T {
    // Mark exports for better tree shaking
    if (process.env.NODE_ENV === "development") {
      Object.keys(exports).forEach(key => {
        if (typeof exports[key] === "function") {
          exports[key].displayName = key;
        }
      });
    }
    return exports;
  },

  /**
   * Marks unused exports for development warnings
   */
  markUnused(exportName: string): void {
    if (process.env.NODE_ENV === "development") {
      console.warn(`🌳 Unused export detected: ${exportName} - consider removing for better tree shaking`);
    }
  },

  /**
   * Creates conditional exports based on feature flags
   */
  conditionalExport<T>(condition: boolean, exportValue: T): T | undefined {
    return condition ? exportValue : undefined;
  },
};

// ============================================================================
// DEPENDENCY ANALYSIS
// ============================================================================

/**
 * Analyzes and reports on dependency usage
 */
export class DependencyAnalyzer {
  private static usedDependencies = new Set<string>();
  private static heavyDependencies = new Map<string, number>();

  static markUsed(dependencyName: string, estimatedSizeKB?: number): void {
    this.usedDependencies.add(dependencyName);
    
    if (estimatedSizeKB) {
      this.heavyDependencies.set(dependencyName, estimatedSizeKB);
    }
  }

  static getUsedDependencies(): string[] {
    return Array.from(this.usedDependencies);
  }

  static getHeavyDependencies(threshold: number = 100): Array<[string, number]> {
    return Array.from(this.heavyDependencies.entries())
      .filter(([, size]) => size > threshold)
      .sort(([, a], [, b]) => b - a);
  }

  static generateReport(): {
    totalDependencies: number;
    heavyDependencies: Array<[string, number]>;
    recommendations: string[];
  } {
    const heavy = this.getHeavyDependencies();
    const recommendations: string[] = [];

    // Generate recommendations
    if (heavy.length > 0) {
      recommendations.push("Consider lazy loading heavy dependencies");
    }

    if (this.usedDependencies.size > 50) {
      recommendations.push("Consider splitting into smaller bundles");
    }

    return {
      totalDependencies: this.usedDependencies.size,
      heavyDependencies: heavy,
      recommendations,
    };
  }
}

// ============================================================================
// PERFORMANCE BUDGETS
// ============================================================================

/**
 * Performance budget enforcement
 */
export const PerformanceBudgets = {
  // Time budgets (in milliseconds)
  time: {
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    firstInputDelay: 100,
    cumulativeLayoutShift: 0.1,
  },

  // Size budgets (in KB)
  size: {
    javascript: 500,
    css: 100,
    images: 1000,
    fonts: 200,
    total: 2000,
  },

  // Network budgets
  network: {
    requests: 50,
    domains: 5,
  },

  /**
   * Checks if a metric is within budget
   */
  isWithinBudget(category: "time" | "size" | "network", metric: string, value: number): boolean {
    const budget = this[category] as Record<string, number>;
    const limit = budget[metric];
    return limit ? value <= limit : true;
  },

  /**
   * Generates a budget report
   */
  generateBudgetReport(metrics: Record<string, number>): {
    passed: string[];
    failed: Array<{ metric: string; value: number; limit: number }>;
  } {
    const passed: string[] = [];
    const failed: Array<{ metric: string; value: number; limit: number }> = [];

    Object.entries(metrics).forEach(([metric, value]) => {
      // Find which category this metric belongs to
      for (const [category, budgets] of Object.entries(this)) {
        if (typeof budgets === "object" && metric in budgets) {
          const limit = budgets[metric as keyof typeof budgets] as number;
          if (value <= limit) {
            passed.push(metric);
          } else {
            failed.push({ metric, value, limit });
          }
          break;
        }
      }
    });

    return { passed, failed };
  },
};
