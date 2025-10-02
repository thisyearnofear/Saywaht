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

class SimpleMonitor {
  private metrics: BugFixMetric[] = [];

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

// ENHANCEMENT: React hook for easy integration
export function useBugFixMonitoring() {
  return {
    trackBugFix,
    getStats: getBugFixStats,
    clearData: clearBugFixData
  };
}