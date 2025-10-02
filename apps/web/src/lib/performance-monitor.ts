/**
 * PERFORMANCE MONITORING SYSTEM
 * Tracks Core Web Vitals and app performance metrics
 * Following PERFORMANT and MODULAR principles
 */

export interface PerformanceMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  timestamp: number;
  sessionId: string;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  context?: Record<string, any>;
}

class PerformanceMonitor {
  private sessionId: string;
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  private generateSessionId(): string {
    return `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring() {
    // ENHANCEMENT: Only initialize in browser environment
    if (typeof window === 'undefined') return;

    this.setupWebVitalsTracking();
    this.setupCustomMetrics();
    this.setupNavigationTiming();
  }

  private setupWebVitalsTracking() {
    if (!('PerformanceObserver' in window)) return;

    try {
      // PERFORMANT: Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'LCP',
            value: entry.startTime,
            rating: this.getRating('LCP', entry.startTime),
            url: window.location.href,
            timestamp: Date.now(),
            sessionId: this.sessionId
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // PERFORMANT: Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidValue = (entry as any).processingStart - entry.startTime;
          this.recordMetric({
            name: 'FID',
            value: fidValue,
            rating: this.getRating('FID', fidValue),
            url: window.location.href,
            timestamp: Date.now(),
            sessionId: this.sessionId
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // PERFORMANT: Track Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Record CLS on page unload
      window.addEventListener('beforeunload', () => {
        if (clsValue > 0) {
          this.recordMetric({
            name: 'CLS',
            value: clsValue,
            rating: this.getRating('CLS', clsValue),
            url: window.location.href,
            timestamp: Date.now(),
            sessionId: this.sessionId
          });
        }
      });

      // PERFORMANT: Track First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: this.getRating('FCP', entry.startTime),
              url: window.location.href,
              timestamp: Date.now(),
              sessionId: this.sessionId
            });
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

    } catch (error) {
      console.warn('Failed to setup Web Vitals tracking:', error);
    }
  }

  private setupCustomMetrics() {
    // MODULAR: Track bundle size and loading metrics
    if (typeof window !== 'undefined') {
      // Track initial bundle size
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        this.recordCustomMetric('bundle-size', navigationEntry.transferSize, 'bytes', {
          compressed: navigationEntry.encodedBodySize,
          uncompressed: navigationEntry.decodedBodySize
        });

        this.recordCustomMetric('page-load-time', navigationEntry.loadEventEnd - navigationEntry.fetchStart, 'ms');
        this.recordCustomMetric('dom-content-loaded', navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart, 'ms');
      }
    }
  }

  private setupNavigationTiming() {
    if (typeof window === 'undefined') return;

    // PERFORMANT: Track Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.fetchStart;
        this.recordMetric({
          name: 'TTFB',
          value: ttfb,
          rating: this.getRating('TTFB', ttfb),
          url: window.location.href,
          timestamp: Date.now(),
          sessionId: this.sessionId
        });
      }
    });
  }

  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * MODULAR: Record a performance metric
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // ENHANCEMENT: Log performance issues in development only
    if (process.env.NODE_ENV === 'development') {
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
      // Performance metric logged in development
    }

    // PERFORMANT: Keep only last 50 metrics to prevent memory issues
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }

    this.saveToStorage();
  }

  /**
   * MODULAR: Record custom application metrics
   */
  recordCustomMetric(name: string, value: number, unit: CustomMetric['unit'], context?: Record<string, any>) {
    const metric: CustomMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    };

    this.customMetrics.push(metric);

    // ENHANCEMENT: Log custom metrics in development only
    if (process.env.NODE_ENV === 'development') {
      // Custom metric logged in development
    }

    // PERFORMANT: Keep only last 100 custom metrics
    if (this.customMetrics.length > 100) {
      this.customMetrics = this.customMetrics.slice(-100);
    }

    this.saveToStorage();
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = {
      coreWebVitals: {} as Record<string, { value: number; rating: string; timestamp: number }>,
      customMetrics: this.customMetrics.slice(-10),
      summary: {
        totalMetrics: this.metrics.length,
        goodMetrics: this.metrics.filter(m => m.rating === 'good').length,
        poorMetrics: this.metrics.filter(m => m.rating === 'poor').length,
        averageLoadTime: 0
      }
    };

    // Get latest value for each Core Web Vital
    ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].forEach(metricName => {
      const latestMetric = this.metrics
        .filter(m => m.name === metricName)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (latestMetric) {
        stats.coreWebVitals[metricName] = {
          value: latestMetric.value,
          rating: latestMetric.rating,
          timestamp: latestMetric.timestamp
        };
      }
    });

    // Calculate average load time
    const loadTimeMetrics = this.customMetrics.filter(m => m.name === 'page-load-time');
    if (loadTimeMetrics.length > 0) {
      stats.summary.averageLoadTime = loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length;
    }

    return stats;
  }

  /**
   * CLEAN: Clear all performance data
   */
  clear() {
    this.metrics = [];
    this.customMetrics = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saywaht_performance');
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          metrics: this.metrics,
          customMetrics: this.customMetrics,
          sessionId: this.sessionId
        };
        localStorage.setItem('saywaht_performance', JSON.stringify(data));
      } catch (error) {
        // Failed to save performance data to localStorage
      }
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('saywaht_performance');
        if (stored) {
          const data = JSON.parse(stored);
          this.metrics = data.metrics || [];
          this.customMetrics = data.customMetrics || [];
        }
      } catch (error) {
        // Failed to load performance data from localStorage
      }
    }
  }

  /**
   * CLEAN: Cleanup on destroy
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.saveToStorage();
  }
}

// ORGANIZED: Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// PERFORMANT: Only initialize in production or development
if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production')) {
  // Performance monitoring is active
}

// MODULAR: Export utility functions
export function recordPerformanceMetric(metric: Omit<PerformanceMetric, 'sessionId'>) {
  performanceMonitor.recordMetric({ ...metric, sessionId: performanceMonitor['sessionId'] });
}

export function recordCustomMetric(name: string, value: number, unit: CustomMetric['unit'], context?: Record<string, any>) {
  performanceMonitor.recordCustomMetric(name, value, unit, context);
}

export function getPerformanceStats() {
  return performanceMonitor.getStats();
}

export function clearPerformanceData() {
  performanceMonitor.clear();
}

// ENHANCEMENT: React hook for easy integration
export function usePerformanceMonitoring() {
  return {
    recordMetric: recordCustomMetric,
    getStats: getPerformanceStats,
    clearData: clearPerformanceData
  };
}