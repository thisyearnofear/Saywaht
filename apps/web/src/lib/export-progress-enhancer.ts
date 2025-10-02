/**
 * EXPORT PROGRESS ENHANCER
 * Provides user-friendly progress messages during export retries
 * Following CLEAN and MODULAR principles
 */

export interface EnhancedProgressCallback {
  (progress: number, message?: string, isRetry?: boolean): void;
}

export interface ProgressState {
  currentProgress: number;
  currentMessage: string;
  isRetrying: boolean;
  retryCount: number;
  method: string;
}

/**
 * CLEAN: Create enhanced progress callback with retry awareness
 */
export function createEnhancedProgress(
  originalCallback: (progress: number) => void,
  method: string = 'export'
): {
  callback: EnhancedProgressCallback;
  onRetry: (attempt: number, error: unknown, nextDelay: number) => void;
  onMethodFallback: (fromMethod: string, toMethod: string, reason: string) => void;
} {
  let state: ProgressState = {
    currentProgress: 0,
    currentMessage: 'Starting export...',
    isRetrying: false,
    retryCount: 0,
    method
  };

  // MODULAR: Enhanced progress callback
  const callback: EnhancedProgressCallback = (progress: number, message?: string, isRetry?: boolean) => {
    state.currentProgress = progress;
    state.isRetrying = isRetry || false;
    
    if (message) {
      state.currentMessage = message;
    } else if (state.isRetrying) {
      state.currentMessage = `Retrying export (attempt ${state.retryCount + 1})...`;
    } else {
      // CLEAN: Default progress messages
      if (progress < 10) {
        state.currentMessage = 'Initializing export...';
      } else if (progress < 30) {
        state.currentMessage = 'Preparing media...';
      } else if (progress < 60) {
        state.currentMessage = 'Processing video...';
      } else if (progress < 90) {
        state.currentMessage = 'Finalizing export...';
      } else {
        state.currentMessage = 'Almost done...';
      }
    }
    
    // Call original callback with enhanced progress
    originalCallback(progress);
  };

  // PERFORMANT: Retry handler
  const onRetry = (attempt: number, error: unknown, nextDelay: number) => {
    state.retryCount = attempt;
    state.isRetrying = true;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const delaySeconds = Math.round(nextDelay / 1000);
    
    let retryMessage = `Export failed, retrying in ${delaySeconds}s...`;
    
    // CLEAN: Specific retry messages based on error type
    if (errorMessage.toLowerCase().includes('timeout')) {
      retryMessage = `Export timed out, retrying with optimized settings...`;
    } else if (errorMessage.toLowerCase().includes('memory')) {
      retryMessage = `Memory issue detected, retrying with lower quality...`;
    } else if (errorMessage.toLowerCase().includes('network')) {
      retryMessage = `Network issue, retrying in ${delaySeconds}s...`;
    } else if (errorMessage.toLowerCase().includes('webcodecs')) {
      retryMessage = `Browser compatibility issue, trying alternative method...`;
    }
    
    callback(state.currentProgress, retryMessage, true);
  };

  // MODULAR: Method fallback handler
  const onMethodFallback = (fromMethod: string, toMethod: string, reason: string) => {
    state.method = toMethod;
    state.retryCount = 0;
    
    let fallbackMessage = `Switching to ${toMethod} export method...`;
    
    // CLEAN: Specific fallback messages
    if (fromMethod === 'webcodecs' && toMethod === 'offline') {
      fallbackMessage = 'Using reliable export method for better compatibility...';
    } else if (fromMethod === 'backend' && toMethod === 'webcodecs') {
      fallbackMessage = 'Server busy, using local export...';
    } else if (toMethod === 'canvas') {
      fallbackMessage = 'Using basic export for maximum compatibility...';
    }
    
    callback(0, fallbackMessage, false);
  };

  return {
    callback,
    onRetry,
    onMethodFallback
  };
}

/**
 * CLEAN: Get user-friendly error messages for export failures
 */
export function getUserFriendlyErrorMessage(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // MODULAR: Specific user-friendly messages
  if (errorMessage.includes('timeout')) {
    return 'Export took too long. Try reducing video length or quality settings.';
  }
  
  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return 'Not enough memory to export. Close other browser tabs and try again.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network connection issue. Check your internet connection and try again.';
  }
  
  if (errorMessage.includes('webcodecs') || errorMessage.includes('encoder')) {
    return 'Browser compatibility issue. The export will automatically use a different method.';
  }
  
  if (errorMessage.includes('abort') || errorMessage.includes('cancel')) {
    return 'Export was cancelled. You can restart the export process.';
  }
  
  if (errorMessage.includes('file size') || errorMessage.includes('too large')) {
    return 'Video is too large. Try reducing quality settings or video length.';
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    return 'Permission denied. Please check your browser settings and try again.';
  }
  
  // CLEAN: Generic fallback message
  return 'Export failed due to an unexpected issue. Please try again.';
}

/**
 * PERFORMANT: Estimate remaining time based on progress
 */
export function estimateRemainingTime(
  startTime: number,
  currentProgress: number,
  isRetrying: boolean = false
): string {
  if (currentProgress <= 0) return 'Calculating...';
  
  const elapsed = Date.now() - startTime;
  const estimatedTotal = elapsed / (currentProgress / 100);
  const remaining = estimatedTotal - elapsed;
  
  // CLEAN: Add buffer for retries
  const bufferedRemaining = isRetrying ? remaining * 1.5 : remaining;
  
  if (bufferedRemaining < 10000) { // Less than 10 seconds
    return 'Almost done...';
  } else if (bufferedRemaining < 60000) { // Less than 1 minute
    return `About ${Math.round(bufferedRemaining / 1000)} seconds remaining`;
  } else { // More than 1 minute
    return `About ${Math.round(bufferedRemaining / 60000)} minutes remaining`;
  }
}

/**
 * MODULAR: Create complete progress handler with all enhancements
 */
export function createCompleteProgressHandler(
  originalCallback: (progress: number) => void,
  method: string = 'export'
) {
  const startTime = Date.now();
  const { callback, onRetry, onMethodFallback } = createEnhancedProgress(originalCallback, method);
  
  // CLEAN: Enhanced callback with time estimation
  const enhancedCallback: EnhancedProgressCallback = (progress, message, isRetry) => {
    const timeEstimate = estimateRemainingTime(startTime, progress, isRetry);
    const fullMessage = message ? `${message} (${timeEstimate})` : timeEstimate;
    
    callback(progress, fullMessage, isRetry);
  };
  
  return {
    callback: enhancedCallback,
    onRetry,
    onMethodFallback,
    getUserFriendlyError: (error: unknown) => getUserFriendlyErrorMessage(error, method)
  };
}