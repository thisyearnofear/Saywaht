/**
 * CONSOLIDATED ERROR HANDLING SYSTEM
 * Single source of truth for all error handling across the app
 * Following DRY and CLEAN principles
 */

import { toast } from "sonner";
import { trackBugFix } from "./monitoring";
import { log } from "./logger";

export interface AppError {
  type: 'network' | 'validation' | 'auth' | 'storage' | 'export' | 'trading' | 'unknown';
  message: string;
  originalError?: Error;
  suggestion?: string;
  retryable?: boolean;
}

/**
 * AGGRESSIVE CONSOLIDATION: Single error analyzer for all error types
 */
export function analyzeError(error: unknown, context?: string): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  // User rejections (wallet interactions) - CLEAN: User-friendly messages
  if (isUserRejection(error)) {
    return {
      type: 'auth',
      message: 'Transaction cancelled',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'You cancelled the transaction. No worries!',
      retryable: false
    };
  }
  
  // Network errors
  if (lowerMessage.includes('fetch') || lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
    return {
      type: 'network',
      message: 'Network connection issue',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Check your internet connection and try again',
      retryable: true
    };
  }
  
  // Authentication errors
  if (lowerMessage.includes('wallet') || lowerMessage.includes('unauthorized') || lowerMessage.includes('connect')) {
    return {
      type: 'auth',
      message: 'Wallet connection issue',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Please connect your wallet and try again',
      retryable: true
    };
  }
  
  // Storage errors (IPFS, Grove, FileCDN)
  if (lowerMessage.includes('upload') || lowerMessage.includes('storage') || lowerMessage.includes('ipfs') || lowerMessage.includes('grove') || lowerMessage.includes('filcdn')) {
    // ENHANCEMENT: Track storage fix effectiveness
    trackBugFix('storage', false, errorMessage, { context });
    return {
      type: 'storage',
      message: 'File storage issue',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Try uploading a smaller file or check your connection',
      retryable: true
    };
  }
  
  // Export errors
  if (lowerMessage.includes('export') || lowerMessage.includes('webcodecs') || lowerMessage.includes('encoder')) {
    // ENHANCEMENT: Track export fix effectiveness
    trackBugFix('export', false, errorMessage, { context });
    return {
      type: 'export',
      message: 'Video export failed',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Try reducing video quality or length',
      retryable: true
    };
  }
  
  // Trading errors
  if (lowerMessage.includes('trade') || lowerMessage.includes('slippage') || lowerMessage.includes('transaction')) {
    // ENHANCEMENT: Track trading fix effectiveness
    trackBugFix('trading', false, errorMessage, { context });
    return {
      type: 'trading',
      message: 'Trading transaction failed',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Check your wallet balance and try again',
      retryable: true
    };
  }
  
  // Validation errors
  if (lowerMessage.includes('required') || lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return {
      type: 'validation',
      message: 'Invalid input',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Please check your input and try again',
      retryable: false
    };
  }
  
  // CLEAN: Simplify long technical error messages
  let friendlyMessage = errorMessage;
  
  // Truncate very long messages (often technical stack traces)
  if (friendlyMessage.length > 150) {
    // Try to extract just the first sentence or line
    const firstLine = friendlyMessage.split('\n')[0];
    const firstSentence = friendlyMessage.split('.')[0];
    friendlyMessage = (firstLine.length < 150 ? firstLine : firstSentence.substring(0, 150)) + '...';
  }
  
  // Remove common technical prefixes
  friendlyMessage = friendlyMessage
    .replace(/^Error:\s*/i, '')
    .replace(/^TypeError:\s*/i, '')
    .replace(/^ReferenceError:\s*/i, '')
    .replace(/^NetworkError:\s*/i, '');
  
  return {
    type: 'unknown',
    message: friendlyMessage || 'Something unexpected happened',
    originalError: error instanceof Error ? error : undefined,
    suggestion: 'Please try again or contact support if this persists',
    retryable: false
  };
}

/**
 * ENHANCEMENT: Unified error handler with user-friendly messages
 */
export function handleError(error: unknown, context?: string): AppError {
  const analysis = analyzeError(error, context);
  
  // CLEAN: Log for debugging with production-aware logger
  log.error(`[${analysis.type.toUpperCase()}] ${context || 'Error'}`, {
    message: analysis.message,
    suggestion: analysis.suggestion,
    originalError: analysis.originalError,
    stack: analysis.originalError?.stack
  }, context || 'Error');
  
  // Show user-friendly toast
  const userMessage = analysis.suggestion 
    ? `${analysis.message}. ${analysis.suggestion}`
    : analysis.message;
    
  toast.error(userMessage, {
    action: analysis.retryable ? {
      label: "Retry",
      onClick: () => {
        // Emit retry event that components can listen to
        window.dispatchEvent(new CustomEvent('app-retry', { detail: { context, error: analysis } }));
      }
    } : undefined
  });
  
  return analysis;
}

/**
 * MODULAR: Retry mechanism with exponential backoff
 */
/**
 * Helper to detect if error is a user rejection (should NOT retry)
 */
function isUserRejection(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  return (
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied') ||
    lowerMessage.includes('user cancelled') ||
    lowerMessage.includes('rejected by user') ||
    lowerMessage.includes('denied by user') ||
    lowerMessage.includes('action_rejected') ||
    lowerMessage.includes('request rejected') ||
    lowerMessage.includes('transaction was rejected')
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // CLEAN: Don't retry user rejections - they made a choice
      if (isUserRejection(error)) {
        throw error;
      }
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * PERFORMANT: Circuit breaker for external services
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// ORGANIZED: Export singleton instances for common services
export const zoraCircuitBreaker = new CircuitBreaker(3, 30000);
export const groveCircuitBreaker = new CircuitBreaker(5, 60000);
export const backendCircuitBreaker = new CircuitBreaker(3, 30000);