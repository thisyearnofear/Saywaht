/**
 * PRODUCTION CONFIGURATION
 * Optimizes app for production deployment
 * Following PERFORMANT and ORGANIZED principles
 */

export const PRODUCTION_CONFIG = {
  // PERFORMANT: Optimize bundle loading
  BUNDLE_OPTIMIZATION: {
    enableCodeSplitting: true,
    enableTreeShaking: true,
    enableMinification: true,
    enableGzip: true,
  },

  // CLEAN: Error handling configuration
  ERROR_HANDLING: {
    enableErrorBoundaries: true,
    enableCrashReporting: false, // Set to true when analytics service is configured
    enablePerformanceMonitoring: true,
    enableBugFixTracking: true,
  },

  // PERFORMANT: Caching strategy
  CACHING: {
    enableServiceWorker: true,
    enableStaticAssetCaching: true,
    enableAPIResponseCaching: true,
    cacheMaxAge: 86400, // 24 hours
  },

  // MODULAR: Feature flags for production
  FEATURES: {
    enablePerformanceTracker: true,
    enableErrorMonitoring: true,
    enableBugFixTracking: true,
    enableDevelopmentTools: false,
    enableConsoleLogging: false,
  },

  // ORGANIZED: API configuration
  API: {
    enableRetryLogic: true,
    enableCircuitBreakers: true,
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  },

  // PERFORMANT: Resource optimization
  RESOURCES: {
    enableImageOptimization: true,
    enableLazyLoading: true,
    enablePreloading: true,
    maxBundleSize: 1024 * 1024, // 1MB
    maxImageSize: 512 * 1024, // 512KB
  },

  // CLEAN: Security configuration
  SECURITY: {
    enableCSP: true,
    enableHTTPS: true,
    enableSecureHeaders: true,
    enableInputValidation: true,
  },
} as const;

/**
 * MODULAR: Get configuration for specific environment
 */
export function getProductionConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    ...PRODUCTION_CONFIG,
    FEATURES: {
      ...PRODUCTION_CONFIG.FEATURES,
      enableDevelopmentTools: isDevelopment,
      enableConsoleLogging: isDevelopment,
    },
    ERROR_HANDLING: {
      ...PRODUCTION_CONFIG.ERROR_HANDLING,
      enableCrashReporting: isProduction && !!process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
    },
  };
}

/**
 * PERFORMANT: Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof PRODUCTION_CONFIG.FEATURES): boolean {
  const config = getProductionConfig();
  return config.FEATURES[feature];
}

/**
 * ORGANIZED: Get API configuration
 */
export function getAPIConfig() {
  return getProductionConfig().API;
}

/**
 * CLEAN: Get security configuration
 */
export function getSecurityConfig() {
  return getProductionConfig().SECURITY;
}