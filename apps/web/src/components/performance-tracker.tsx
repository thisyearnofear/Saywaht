/**
 * PERFORMANCE TRACKER COMPONENT
 * Automatically tracks performance metrics and bundle size
 * Following MODULAR and PERFORMANT principles
 */

'use client';

import { useEffect } from 'react';
import { recordCustomMetric } from '@/lib/performance-monitor';

export function PerformanceTracker() {
  useEffect(() => {
    // PERFORMANT: Track component mount time
    const mountStart = performance.now();

    // Track when React hydration completes
    const trackHydration = () => {
      const hydrationTime = performance.now() - mountStart;
      recordCustomMetric('react-hydration-time', hydrationTime, 'ms', {
        component: 'PerformanceTracker'
      });
    };

    // ENHANCEMENT: Track bundle loading performance
    const trackBundleMetrics = () => {
      // Track JavaScript bundle size
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalJSSize = 0;
      let totalCSSSize = 0;
      let jsFiles = 0;
      let cssFiles = 0;

      resources.forEach(resource => {
        if (resource.name.includes('.js') || resource.name.includes('/_next/static/chunks/')) {
          totalJSSize += resource.transferSize || 0;
          jsFiles++;
        } else if (resource.name.includes('.css')) {
          totalCSSSize += resource.transferSize || 0;
          cssFiles++;
        }
      });

      if (totalJSSize > 0) {
        recordCustomMetric('total-js-bundle-size', totalJSSize, 'bytes', {
          fileCount: jsFiles,
          averageFileSize: Math.round(totalJSSize / jsFiles)
        });
      }

      if (totalCSSSize > 0) {
        recordCustomMetric('total-css-bundle-size', totalCSSSize, 'bytes', {
          fileCount: cssFiles,
          averageFileSize: Math.round(totalCSSSize / cssFiles)
        });
      }

      // PERFORMANT: Track resource loading times
      const slowResources = resources.filter(r => r.duration > 1000);
      if (slowResources.length > 0) {
        recordCustomMetric('slow-resources-count', slowResources.length, 'count', {
          slowestResource: slowResources.reduce((prev, current) =>
            prev.duration > current.duration ? prev : current
          ).name,
          averageSlowTime: slowResources.reduce((sum, r) => sum + r.duration, 0) / slowResources.length
        });
      }
    };

    // MODULAR: Track memory usage if available
    const trackMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        recordCustomMetric('memory-used', memory.usedJSHeapSize, 'bytes', {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
        });
      }
    };

    // ENHANCEMENT: Track user engagement metrics
    const trackEngagementMetrics = () => {
      let clickCount = 0;
      let scrollDepth = 0;
      let timeOnPage = Date.now();

      const handleClick = () => {
        clickCount++;
        recordCustomMetric('user-clicks', clickCount, 'count');
      };

      const handleScroll = () => {
        const scrollHeight = document.body.scrollHeight - window.innerHeight;
        if (scrollHeight > 0) {
          const scrolled = Math.round((window.scrollY / scrollHeight) * 100);
          if (scrolled > scrollDepth) {
            scrollDepth = scrolled;
            recordCustomMetric('scroll-depth', scrollDepth, 'percentage');
          }
        }
      };

      const handleBeforeUnload = () => {
        const sessionTime = Date.now() - timeOnPage;
        recordCustomMetric('time-on-page', sessionTime, 'ms', {
          clicks: clickCount,
          maxScrollDepth: scrollDepth
        });
      };

      document.addEventListener('click', handleClick);
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('click', handleClick);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    };

    // Execute tracking functions
    trackHydration();

    // Delay bundle metrics to ensure all resources are loaded
    setTimeout(() => {
      trackBundleMetrics();
      trackMemoryUsage();
    }, 2000);

    const cleanupEngagement = trackEngagementMetrics();

    // CLEAN: Cleanup on unmount
    return () => {
      cleanupEngagement?.();
    };
  }, []);

  // ENHANCEMENT: Track route changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const routeChangeStart = performance.now();

      return () => {
        const routeChangeTime = performance.now() - routeChangeStart;
        recordCustomMetric('route-change-time', routeChangeTime, 'ms', {
          route: window.location.pathname
        });
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * MODULAR: Hook for tracking specific component performance
 */
export function useComponentPerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      recordCustomMetric('component-render-time', renderTime, 'ms', {
        component: componentName
      });
    };
  }, [componentName]);
}

/**
 * PERFORMANT: Hook for tracking async operations
 */
export function useAsyncOperationTracking() {
  const trackAsyncOperation = async (
    operationName: string,
    operation: () => Promise<any>,
    context?: Record<string, any>
  ): Promise<any> => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      recordCustomMetric('async-operation-success', duration, 'ms', {
        operation: operationName,
        ...context
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      recordCustomMetric('async-operation-error', duration, 'ms', {
        operation: operationName,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...context
      });

      throw error;
    }
  };

  return { trackAsyncOperation };
}