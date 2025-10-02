/**
 * SIMPLE EXPORT RETRY SYSTEM
 * Adds reliable retry logic for failed exports
 * Following ENHANCEMENT FIRST and CLEAN principles
 */

import { analyzeExportError, logExportError } from './export-error-handler';
import { trackBugFix } from './monitoring';
import { recordCustomMetric } from './performance-monitor';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: readonly string[];
}

export interface ExportRetryOptions {
  onRetry?: (attempt: number, error: unknown, nextDelay: number) => void;
  onMethodFallback?: (fromMethod: string, toMethod: string, reason: string) => void;
  config?: Partial<RetryConfig>;
}

// CLEAN: Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'timeout',
    'network',
    'webcodecs',
    'memory',
    'abort',
    'failed to fetch',
    'connection',
    'temporary'
  ]
};

/**
 * PERFORMANT: Check if an error is retryable
 */
function isRetryableError(error: unknown, config: RetryConfig): boolean {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  return config.retryableErrors.some(retryableError => 
    errorMessage.includes(retryableError.toLowerCase())
  );
}

/**
 * CLEAN: Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * MODULAR: Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ENHANCEMENT: Main retry wrapper for export functions
 */
export async function withExportRetry<T>(
  exportFunction: () => Promise<T>,
  context: string,
  options: ExportRetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options.config };
  const startTime = performance.now();
  
  let lastError: unknown;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    attempt++;
    
    try {
      // PERFORMANT: Track attempt timing
      const attemptStart = performance.now();
      const result = await exportFunction();
      const attemptDuration = performance.now() - attemptStart;
      
      // ENHANCEMENT: Track successful export after retries
      if (attempt > 1) {
        trackBugFix('export', true, `Export succeeded on attempt ${attempt}`, {
          context,
          attempts: attempt,
          totalDuration: performance.now() - startTime,
          finalAttemptDuration: attemptDuration
        });
        
        recordCustomMetric('export-retry-success', attempt, 'count', {
          context,
          totalDuration: performance.now() - startTime
        });
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      const analysis = analyzeExportError(error);
      
      // CLEAN: Log the attempt failure
      logExportError(error, {
        context,
        attempt,
        maxAttempts: config.maxAttempts,
        isRetryable: isRetryableError(error, config)
      });
      
      // MODULAR: Check if we should retry
      const shouldRetry = attempt < config.maxAttempts && isRetryableError(error, config);
      
      if (!shouldRetry) {
        // ENHANCEMENT: Track final failure
        trackBugFix('export', false, `Export failed after ${attempt} attempts`, {
          context,
          attempts: attempt,
          finalError: analysis.message,
          totalDuration: performance.now() - startTime
        });
        
        recordCustomMetric('export-retry-failure', attempt, 'count', {
          context,
          finalError: analysis.type,
          totalDuration: performance.now() - startTime
        });
        
        break;
      }
      
      // PERFORMANT: Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      
      // CLEAN: Notify about retry
      options.onRetry?.(attempt, error, delay);
      
      // MODULAR: Wait before retry
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }
  
  // All attempts failed
  throw lastError;
}

/**
 * CLEAN: Method fallback system for export reliability
 */
export async function withMethodFallback<T>(
  primaryMethod: () => Promise<T>,
  fallbackMethod: () => Promise<T>,
  primaryMethodName: string,
  fallbackMethodName: string,
  context: string,
  options: ExportRetryOptions = {}
): Promise<T> {
  try {
    // ENHANCEMENT: Try primary method with retry
    return await withExportRetry(primaryMethod, `${context}-${primaryMethodName}`, {
      ...options,
      config: { ...options.config, maxAttempts: 2 } // Fewer attempts for primary
    });
    
  } catch (primaryError) {
    const analysis = analyzeExportError(primaryError);
    
    // CLEAN: Notify about method fallback
    options.onMethodFallback?.(primaryMethodName, fallbackMethodName, analysis.message);
    
    // ENHANCEMENT: Track method fallback
    trackBugFix('export', false, `${primaryMethodName} failed, falling back to ${fallbackMethodName}`, {
      context,
      primaryError: analysis.message,
      primaryErrorType: analysis.type
    });
    
    recordCustomMetric('export-method-fallback', 1, 'count', {
      context,
      fromMethod: primaryMethodName,
      toMethod: fallbackMethodName,
      reason: analysis.type
    });
    
    try {
      // PERFORMANT: Try fallback method with retry
      const result = await withExportRetry(fallbackMethod, `${context}-${fallbackMethodName}`, options);
      
      // ENHANCEMENT: Track successful fallback
      trackBugFix('export', true, `${fallbackMethodName} succeeded after ${primaryMethodName} failed`, {
        context,
        fallbackMethod: fallbackMethodName
      });
      
      return result;
      
    } catch (fallbackError) {
      // CLEAN: Both methods failed
      const fallbackAnalysis = analyzeExportError(fallbackError);
      
      trackBugFix('export', false, `Both ${primaryMethodName} and ${fallbackMethodName} failed`, {
        context,
        primaryError: analysis.message,
        fallbackError: fallbackAnalysis.message
      });
      
      // Throw the more informative error
      throw new Error(
        `Export failed: ${primaryMethodName} (${analysis.message}) and ${fallbackMethodName} (${fallbackAnalysis.message})`
      );
    }
  }
}

/**
 * MODULAR: Specific retry configurations for different export scenarios
 */
export const EXPORT_RETRY_CONFIGS = {
  webcodecs: {
    maxAttempts: 2,
    baseDelay: 500,
    retryableErrors: ['timeout', 'webcodecs', 'abort', 'encoder']
  },
  
  backend: {
    maxAttempts: 3,
    baseDelay: 2000,
    retryableErrors: ['timeout', 'network', 'failed to fetch', 'connection', '5']
  },
  
  canvas: {
    maxAttempts: 2,
    baseDelay: 1000,
    retryableErrors: ['memory', 'timeout', 'abort']
  },
  
  upload: {
    maxAttempts: 4,
    baseDelay: 1000,
    maxDelay: 8000,
    retryableErrors: ['network', 'timeout', 'failed to fetch', 'connection', '5', 'temporary']
  }
} as const;

/**
 * CLEAN: Convenience function for export with automatic method fallback
 */
export async function exportWithReliability<T>(
  exportMethods: Array<{
    name: string;
    execute: () => Promise<T>;
  }>,
  context: string,
  options: ExportRetryOptions = {}
): Promise<T> {
  if (exportMethods.length === 0) {
    throw new Error('No export methods provided');
  }
  
  if (exportMethods.length === 1) {
    return withExportRetry(exportMethods[0].execute, context, options);
  }
  
  // MODULAR: Try methods in order with fallback
  let lastError: unknown;
  
  for (let i = 0; i < exportMethods.length; i++) {
    const method = exportMethods[i];
    const isLastMethod = i === exportMethods.length - 1;
    
    try {
      return await withExportRetry(method.execute, `${context}-${method.name}`, {
        ...options,
        config: {
          ...options.config,
          maxAttempts: isLastMethod ? 3 : 2 // More attempts for last method
        }
      });
      
    } catch (error) {
      lastError = error;
      
      if (!isLastMethod) {
        const nextMethod = exportMethods[i + 1];
        options.onMethodFallback?.(method.name, nextMethod.name, 'Method failed');
      }
    }
  }
  
  throw lastError;
}