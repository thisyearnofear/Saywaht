/**
 * SIMPLE EXPORT RETRY TEST
 * Basic test to verify retry system functionality
 * Following CLEAN principles
 */

import { withExportRetry, withMethodFallback, EXPORT_RETRY_CONFIGS } from './export-retry-system';

/**
 * CLEAN: Test retry system with simulated failures
 */
export async function testExportRetrySystem(): Promise<void> {
  console.log('🧪 Testing Export Retry System...');
  
  // Test 1: Successful retry after failure
  try {
    let attempts = 0;
    const result = await withExportRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('timeout: simulated failure');
      }
      return 'success';
    }, 'test-retry', {
      config: { maxAttempts: 3, baseDelay: 100 },
      onRetry: (attempt, error, delay) => {
        console.log(`  ↻ Retry attempt ${attempt}: ${error} (delay: ${delay}ms)`);
      }
    });
    
    console.log('✅ Test 1 passed: Retry succeeded after failure');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }
  
  // Test 2: Method fallback
  try {
    const result = await withMethodFallback(
      async () => {
        throw new Error('webcodecs: primary method failed');
      },
      async () => {
        return 'fallback success';
      },
      'webcodecs',
      'offline',
      'test-fallback',
      {
        onMethodFallback: (from, to, reason) => {
          console.log(`  🔄 Fallback: ${from} → ${to} (${reason})`);
        }
      }
    );
    
    console.log('✅ Test 2 passed: Method fallback succeeded');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Non-retryable error
  try {
    await withExportRetry(async () => {
      throw new Error('non-retryable error');
    }, 'test-non-retryable', {
      config: { maxAttempts: 3, baseDelay: 100 }
    });
    
    console.error('❌ Test 3 failed: Should have thrown error');
  } catch (error) {
    console.log('✅ Test 3 passed: Non-retryable error correctly thrown');
  }
  
  console.log('🎉 Export Retry System tests completed');
}

/**
 * MODULAR: Test in development environment only
 */
export function runRetryTestsIfDev(): void {
  if (process.env.NODE_ENV === 'development') {
    // Run tests after a short delay to avoid blocking startup
    setTimeout(() => {
      testExportRetrySystem().catch(console.error);
    }, 2000);
  }
}