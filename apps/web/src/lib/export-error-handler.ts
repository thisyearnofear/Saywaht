/**
 * SIMPLIFIED EXPORT ERROR HANDLING
 * Following ENHANCEMENT FIRST and CLEAN principles
 */

// CLEAN: Only import what we need
// import { trackBugFix } from './monitoring';

export interface ExportError {
  type: 'timeout' | 'webcodecs' | 'memory' | 'unknown';
  message: string;
  originalError?: Error;
  suggestion?: string;
}

/**
 * Analyze and categorize export errors
 */
export function analyzeExportError(error: unknown): ExportError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Export timed out',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Try exporting a shorter video or reducing quality settings'
    };
  }
  
  if (errorMessage.includes('WebCodecs') || errorMessage.includes('VideoEncoder')) {
    return {
      type: 'webcodecs',
      message: 'WebCodecs compatibility issue',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'The system will automatically use a different export method'
    };
  }
  
  if (errorMessage.includes('memory') || errorMessage.includes('allocation')) {
    return {
      type: 'memory',
      message: 'Insufficient memory',
      originalError: error instanceof Error ? error : undefined,
      suggestion: 'Close other applications and try again'
    };
  }
  
  return {
    type: 'unknown',
    message: errorMessage,
    originalError: error instanceof Error ? error : undefined
  };
}

/**
 * Get user-friendly error message
 */
export function getExportErrorMessage(error: unknown): string {
  const analysis = analyzeExportError(error);
  
  let message = `Export failed: ${analysis.message}`;
  if (analysis.suggestion) {
    message += `. ${analysis.suggestion}`;
  }
  
  return message;
}

/**
 * CLEAN: Log export error with context using production logger
 */
export function logExportError(error: unknown, context?: Record<string, any>): void {
  const analysis = analyzeExportError(error);
  
  // ENHANCEMENT: Track export fix effectiveness (simplified)
  // trackBugFix('export', false, analysis.message, { 
  //   type: analysis.type,
  //   suggestion: analysis.suggestion,
  //   ...context 
  // });
  
  // Use production-aware logging
  if (process.env.NODE_ENV === 'development') {
    console.error('Export Error:', {
      type: analysis.type,
      message: analysis.message,
      suggestion: analysis.suggestion,
      context,
      stack: analysis.originalError?.stack
    });
  }
}