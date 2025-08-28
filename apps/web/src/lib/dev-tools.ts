// Development tools for monitoring performance and preventing bloat
// Only active in development mode

import React from "react";

// ============================================================================
// DEVELOPMENT PERFORMANCE MONITOR
// ============================================================================

class DevPerformanceMonitor {
  private static instance: DevPerformanceMonitor;
  private measurements = new Map<string, number[]>();
  private componentRenders = new Map<string, number>();
  private bundleSizes = new Map<string, number>();

  static getInstance(): DevPerformanceMonitor {
    if (!this.instance) {
      this.instance = new DevPerformanceMonitor();
    }
    return this.instance;
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number): void {
    if (process.env.NODE_ENV !== "development") return;

    const currentCount = this.componentRenders.get(componentName) || 0;
    this.componentRenders.set(componentName, currentCount + 1);

    const measurements = this.measurements.get(componentName) || [];
    measurements.push(renderTime);
    this.measurements.set(componentName, measurements);

    // Warn about excessive renders
    if (currentCount > 10 && currentCount % 10 === 0) {
      console.warn(
        `🔄 Component "${componentName}" has rendered ${currentCount} times. Consider optimization.`
      );
    }

    // Warn about slow renders
    if (renderTime > 16) {
      console.warn(
        `⚠️ Slow render detected: "${componentName}" took ${renderTime.toFixed(2)}ms`
      );
    }
  }

  // Track bundle sizes
  trackBundleSize(bundleName: string, sizeInBytes: number): void {
    if (process.env.NODE_ENV !== "development") return;

    const sizeInKB = sizeInBytes / 1024;
    this.bundleSizes.set(bundleName, sizeInKB);

    // Warn about large bundles
    if (sizeInKB > 500) {
      console.warn(
        `📦 Large bundle detected: "${bundleName}" is ${sizeInKB.toFixed(1)}KB`
      );
    }
  }

  // Generate performance report
  generateReport(): {
    componentStats: Array<{
      name: string;
      renders: number;
      avgRenderTime: number;
      maxRenderTime: number;
    }>;
    bundleStats: Array<{
      name: string;
      sizeKB: number;
    }>;
    recommendations: string[];
  } {
    const componentStats = Array.from(this.componentRenders.entries()).map(
      ([name, renders]) => {
        const measurements = this.measurements.get(name) || [];
        const avgRenderTime = measurements.length > 0 
          ? measurements.reduce((sum, time) => sum + time, 0) / measurements.length
          : 0;
        const maxRenderTime = measurements.length > 0 
          ? Math.max(...measurements)
          : 0;

        return { name, renders, avgRenderTime, maxRenderTime };
      }
    );

    const bundleStats = Array.from(this.bundleSizes.entries()).map(
      ([name, sizeKB]) => ({ name, sizeKB })
    );

    const recommendations = this.generateRecommendations(componentStats, bundleStats);

    return { componentStats, bundleStats, recommendations };
  }

  private generateRecommendations(
    componentStats: any[],
    bundleStats: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Component recommendations
    const slowComponents = componentStats.filter(c => c.avgRenderTime > 10);
    if (slowComponents.length > 0) {
      recommendations.push(
        `Optimize slow components: ${slowComponents.map(c => c.name).join(", ")}`
      );
    }

    const frequentlyRenderingComponents = componentStats.filter(c => c.renders > 20);
    if (frequentlyRenderingComponents.length > 0) {
      recommendations.push(
        `Consider memoization for: ${frequentlyRenderingComponents.map(c => c.name).join(", ")}`
      );
    }

    // Bundle recommendations
    const largeBundles = bundleStats.filter(b => b.sizeKB > 300);
    if (largeBundles.length > 0) {
      recommendations.push(
        `Consider code splitting for: ${largeBundles.map(b => b.name).join(", ")}`
      );
    }

    const totalBundleSize = bundleStats.reduce((sum, b) => sum + b.sizeKB, 0);
    if (totalBundleSize > 1000) {
      recommendations.push("Total bundle size exceeds 1MB - consider aggressive optimization");
    }

    return recommendations;
  }

  // Clear all data
  clear(): void {
    this.measurements.clear();
    this.componentRenders.clear();
    this.bundleSizes.clear();
  }
}

// ============================================================================
// DEVELOPMENT HOOKS
// ============================================================================

/**
 * Hook for tracking component performance in development
 */
export function useDevPerformanceTracking(componentName: string) {
  if (process.env.NODE_ENV !== "development") return;

  const monitor = DevPerformanceMonitor.getInstance();
  const startTime = performance.now();

  React.useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    monitor.trackComponentRender(componentName, renderTime);
  });
}

/**
 * Hook for detecting memory leaks in development
 */
export function useDevMemoryTracking(componentName: string) {
  if (process.env.NODE_ENV !== "development") return;

  React.useEffect(() => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return () => {
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDiff = finalMemory - initialMemory;

      if (memoryDiff > 1024 * 1024) { // 1MB
        console.warn(
          `🧠 Potential memory leak in "${componentName}": ${(memoryDiff / 1024 / 1024).toFixed(2)}MB increase`
        );
      }
    };
  }, [componentName]);
}

// ============================================================================
// BUNDLE ANALYSIS TOOLS
// ============================================================================

/**
 * Analyzes and reports on bundle composition
 */
export class DevBundleAnalyzer {
  private static loadedModules = new Set<string>();
  private static moduleLoadTimes = new Map<string, number>();

  static trackModuleLoad(moduleName: string, loadTime: number): void {
    if (process.env.NODE_ENV !== "development") return;

    this.loadedModules.add(moduleName);
    this.moduleLoadTimes.set(moduleName, loadTime);

    if (loadTime > 100) {
      console.warn(`⏱️ Slow module load: "${moduleName}" took ${loadTime.toFixed(2)}ms`);
    }
  }

  static getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }

  static getSlowModules(threshold: number = 50): Array<[string, number]> {
    return Array.from(this.moduleLoadTimes.entries())
      .filter(([, time]) => time > threshold)
      .sort(([, a], [, b]) => b - a);
  }

  static generateBundleReport(): {
    totalModules: number;
    slowModules: Array<[string, number]>;
    recommendations: string[];
  } {
    const slowModules = this.getSlowModules();
    const recommendations: string[] = [];

    if (slowModules.length > 0) {
      recommendations.push("Consider lazy loading slow modules");
    }

    if (this.loadedModules.size > 100) {
      recommendations.push("Consider code splitting - too many modules loaded");
    }

    return {
      totalModules: this.loadedModules.size,
      slowModules,
      recommendations,
    };
  }
}

// ============================================================================
// DEPENDENCY TRACKING
// ============================================================================

/**
 * Tracks dependency usage for optimization insights
 */
export class DevDependencyTracker {
  private static usedDependencies = new Map<string, {
    count: number;
    firstUsed: number;
    lastUsed: number;
    components: Set<string>;
  }>();

  static trackUsage(dependency: string, component: string): void {
    if (process.env.NODE_ENV !== "development") return;

    const now = Date.now();
    const existing = this.usedDependencies.get(dependency);

    if (existing) {
      existing.count++;
      existing.lastUsed = now;
      existing.components.add(component);
    } else {
      this.usedDependencies.set(dependency, {
        count: 1,
        firstUsed: now,
        lastUsed: now,
        components: new Set([component]),
      });
    }
  }

  static getUnusedDependencies(timeThreshold: number = 5 * 60 * 1000): string[] {
    const now = Date.now();
    return Array.from(this.usedDependencies.entries())
      .filter(([, data]) => now - data.lastUsed > timeThreshold)
      .map(([dependency]) => dependency);
  }

  static getHeavilyUsedDependencies(countThreshold: number = 10): Array<[string, number]> {
    return Array.from(this.usedDependencies.entries())
      .filter(([, data]) => data.count > countThreshold)
      .map(([dependency, data]) => [dependency, data.count] as [string, number])
      .sort(([, a], [, b]) => b - a);
  }

  static generateDependencyReport(): {
    totalDependencies: number;
    unused: string[];
    heavilyUsed: Array<[string, number]>;
    recommendations: string[];
  } {
    const unused = this.getUnusedDependencies();
    const heavilyUsed = this.getHeavilyUsedDependencies();
    const recommendations: string[] = [];

    if (unused.length > 0) {
      recommendations.push(`Consider removing unused dependencies: ${unused.join(", ")}`);
    }

    if (heavilyUsed.length > 0) {
      recommendations.push("Consider optimizing heavily used dependencies");
    }

    return {
      totalDependencies: this.usedDependencies.size,
      unused,
      heavilyUsed,
      recommendations,
    };
  }
}

// ============================================================================
// DEVELOPMENT DASHBOARD
// ============================================================================

/**
 * Creates a development dashboard for monitoring performance
 */
export function createDevDashboard(): void {
  if (process.env.NODE_ENV !== "development") return;

  // Add global functions for easy access in dev tools
  (window as any).__SAYWAHT_DEV__ = {
    performance: DevPerformanceMonitor.getInstance(),
    bundle: DevBundleAnalyzer,
    dependencies: DevDependencyTracker,
    
    // Generate comprehensive report
    generateReport() {
      const perfReport = DevPerformanceMonitor.getInstance().generateReport();
      const bundleReport = DevBundleAnalyzer.generateBundleReport();
      const depReport = DevDependencyTracker.generateDependencyReport();

      console.group("📊 SayWhat Development Report");
      console.log("Performance:", perfReport);
      console.log("Bundle Analysis:", bundleReport);
      console.log("Dependencies:", depReport);
      console.groupEnd();

      return { performance: perfReport, bundle: bundleReport, dependencies: depReport };
    },

    // Clear all tracking data
    clear() {
      DevPerformanceMonitor.getInstance().clear();
      console.log("🧹 Development tracking data cleared");
    },
  };

  console.log(
    "🛠️ SayWhat Dev Tools loaded. Use __SAYWAHT_DEV__.generateReport() for insights."
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

// Exports handled inline above
