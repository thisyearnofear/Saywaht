/**
 * SIMPLE ERROR MONITORING SYSTEM
 * Tracks the effectiveness of our bug fixes
 * Following MODULAR and CLEAN principles
 */

export interface BugFixMetric {
  fixType: 'environment' | 'trading' | 'export' | 'mobile' | 'storage';
  success: boolean;
  errorMessage?: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ExportDiagnostics {
  timestamp: number;
  exportMethod: string;
  duration: number;
  progress: number;
  error?: string;
  systemInfo: {
    userAgent: string;
    memory?: number;
    cores?: number;
  };
  contentInfo: {
    tracks: number;
    clips: number;
    hasVideo: boolean;
    hasAudio: boolean;
    totalDuration: number;
  };
  performanceMetrics: {
    startTime: number;
    endTime?: number;
    elapsedTime?: number;
    framesProcessed?: number;
    fps?: number;
  };
}

class SimpleMonitor {
  private metrics: BugFixMetric[] = [];
  private exportDiagnostics: ExportDiagnostics[] = [];
  private currentExport: ExportDiagnostics | null = null;

  /**
   * CONSOLIDATION: Export diagnostics tracking
   */
  startExportDiagnostics(method: string, contentInfo: ExportDiagnostics['contentInfo']): void {
    this.currentExport = {
      timestamp: Date.now(),
      exportMethod: method,
      duration: contentInfo.totalDuration,
      progress: 0,
      systemInfo: {
        userAgent: navigator.userAgent,
        memory: (navigator as any).deviceMemory,
        cores: navigator.hardwareConcurrency,
      },
      contentInfo,
      performanceMetrics: {
        startTime: performance.now()
      }
    };
  }

  updateExportProgress(progress: number): void {
    if (this.currentExport) {
      this.currentExport.progress = progress;
      this.currentExport.performanceMetrics.elapsedTime =
        performance.now() - this.currentExport.performanceMetrics.startTime;
    }
  }

  finishExportDiagnostics(success: boolean, error?: string): void {
    if (this.currentExport) {
      this.currentExport.performanceMetrics.endTime = performance.now();
      this.currentExport.performanceMetrics.elapsedTime =
        this.currentExport.performanceMetrics.endTime - this.currentExport.performanceMetrics.startTime;

      if (error) {
        this.currentExport.error = error;
      }

      this.exportDiagnostics.push(this.currentExport);

      // Keep only last 10 exports
      if (this.exportDiagnostics.length > 10) {
        this.exportDiagnostics = this.exportDiagnostics.slice(-10);
      }

      // Track as bug fix metric
      this.trackBugFix('export', success, error);

      this.currentExport = null;
      this.saveToStorage();
    }
  }

  getExportDiagnostics() {
    return {
      current: this.currentExport,
      history: this.exportDiagnostics,
      report: this.generateExportReport()
    };
  }

  private generateExportReport() {
    if (this.exportDiagnostics.length === 0) return null;

    const successful = this.exportDiagnostics.filter(d => !d.error);
    const failed = this.exportDiagnostics.filter(d => d.error);

    return {
      totalExports: this.exportDiagnostics.length,
      successRate: (successful.length / this.exportDiagnostics.length) * 100,
      averageTime: successful.reduce((sum, d) => sum + (d.performanceMetrics.elapsedTime || 0), 0) / successful.length,
      commonErrors: this.getCommonErrors(failed),
      methodPerformance: this.getMethodPerformance()
    };
  }

  private getCommonErrors(failed: ExportDiagnostics[]) {
    const errorCounts = new Map<string, number>();
    failed.forEach(d => {
      if (d.error) {
        const errorType = d.error.split(':')[0]; // Get error type
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }
    });
    return Array.from(errorCounts.entries()).sort((a, b) => b[1] - a[1]);
  }

  private getMethodPerformance() {
    const methodStats = new Map<string, { count: number; avgTime: number; successRate: number }>();

    this.exportDiagnostics.forEach(d => {
      if (!methodStats.has(d.exportMethod)) {
        methodStats.set(d.exportMethod, { count: 0, avgTime: 0, successRate: 0 });
      }

      const stats = methodStats.get(d.exportMethod)!;
      stats.count++;
      if (d.performanceMetrics.elapsedTime) {
        stats.avgTime = (stats.avgTime + d.performanceMetrics.elapsedTime) / 2;
      }
      if (!d.error) {
        stats.successRate = (stats.successRate + 100) / 2;
      }
    });

    return Array.from(methodStats.entries());
  }

  /**
   * MODULAR: Track specific bug fix effectiveness
   */
  trackBugFix(fixType: BugFixMetric['fixType'], success: boolean, errorMessage?: string, context?: any) {
    const metric: BugFixMetric = {
      fixType,
      success,
      errorMessage,
      timestamp: Date.now(),
      context
    };

    this.metrics.push(metric);

    // ENHANCEMENT: Log in development for immediate feedback
    if (process.env.NODE_ENV === 'development') {
      const status = success ? '✅' : '❌';
      console.log(`${status} Bug Fix [${fixType}]:`, success ? 'Success' : errorMessage);
      if (context) console.log('Context:', context);
    }

    // PERFORMANT: Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Store in localStorage for persistence
    this.saveToStorage();
  }

  /**
   * Get bug fix statistics
   */
  getStats() {
    const stats = {
      total: this.metrics.length,
      byType: {} as Record<string, { success: number; failed: number; total: number }>,
      recent: this.metrics.slice(-10),
      successRate: 0
    };

    // Calculate stats by fix type
    this.metrics.forEach(metric => {
      if (!stats.byType[metric.fixType]) {
        stats.byType[metric.fixType] = { success: 0, failed: 0, total: 0 };
      }

      stats.byType[metric.fixType].total++;
      if (metric.success) {
        stats.byType[metric.fixType].success++;
      } else {
        stats.byType[metric.fixType].failed++;
      }
    });

    // Calculate overall success rate
    const successCount = this.metrics.filter(m => m.success).length;
    stats.successRate = this.metrics.length > 0 ? (successCount / this.metrics.length) * 100 : 0;

    return stats;
  }

  /**
   * CLEAN: Clear all data
   */
  clear() {
    this.metrics = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saywaht_bug_fixes');
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('saywaht_bug_fixes', JSON.stringify(this.metrics));
        localStorage.setItem('saywaht_export_diagnostics', JSON.stringify(this.exportDiagnostics));
      } catch (error) {
        console.warn('Failed to save metrics to localStorage:', error);
      }
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('saywaht_bug_fixes');
        if (stored) {
          this.metrics = JSON.parse(stored);
        }

        const exportStored = localStorage.getItem('saywaht_export_diagnostics');
        if (exportStored) {
          this.exportDiagnostics = JSON.parse(exportStored);
        }
      } catch (error) {
        console.warn('Failed to load metrics from localStorage:', error);
      }
    }
  }

  constructor() {
    this.loadFromStorage();
  }
}

// ORGANIZED: Export singleton instance
export const bugFixMonitor = new SimpleMonitor();

// MODULAR: Export utility functions
export function trackBugFix(
  fixType: BugFixMetric['fixType'],
  success: boolean,
  errorMessage?: string,
  context?: any
) {
  bugFixMonitor.trackBugFix(fixType, success, errorMessage, context);
}

export function getBugFixStats() {
  return bugFixMonitor.getStats();
}

export function clearBugFixData() {
  bugFixMonitor.clear();
}

// CONSOLIDATION: Export diagnostics utilities
export function startExportDiagnostics(method: string, contentInfo: ExportDiagnostics['contentInfo']) {
  bugFixMonitor.startExportDiagnostics(method, contentInfo);
}

export function updateExportProgress(progress: number) {
  bugFixMonitor.updateExportProgress(progress);
}

export function finishExportDiagnostics(success: boolean, error?: string) {
  bugFixMonitor.finishExportDiagnostics(success, error);
}

export function getExportDiagnostics() {
  return bugFixMonitor.getExportDiagnostics();
}

// ENHANCEMENT: React hook for easy integration
export function useBugFixMonitoring() {
  return {
    trackBugFix,
    getStats: getBugFixStats,
    clearData: clearBugFixData
  };
}