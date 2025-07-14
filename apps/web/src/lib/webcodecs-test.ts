/**
 * WebCodecs Test Utilities
 * 
 * Simple utilities to test and validate WebCodecs functionality
 * Use these to ensure the implementation works correctly
 */

import { isWebCodecsSupported, getWebCodecsConfig, WebCodecsExportOptions } from './webcodecs-export';
import { detectWebCodecsSupport, estimateWebCodecsPerformance, FORMAT_DIMENSIONS } from './video-utils';

export interface WebCodecsTestResult {
  supported: boolean;
  details: {
    videoEncoder: boolean;
    audioEncoder: boolean;
    videoFrame: boolean;
    audioData: boolean;
  };
  performance?: {
    estimatedTimeSeconds: number;
    estimatedSpeedMultiplier: number;
    memoryUsageMB: number;
  };
  config?: any;
}

/**
 * Test WebCodecs browser support
 */
export function testWebCodecsSupport(): WebCodecsTestResult {
  const support = detectWebCodecsSupport();
  
  const result: WebCodecsTestResult = {
    supported: support.fullSupport,
    details: {
      videoEncoder: support.videoEncoder,
      audioEncoder: support.audioEncoder,
      videoFrame: support.videoFrame,
      audioData: support.audioData
    }
  };

  // If supported, test configuration
  if (support.fullSupport) {
    try {
      const testOptions: WebCodecsExportOptions = {
        format: 'portrait',
        quality: 'medium',
        includeAudio: true,
        outputFormat: 'mp4',
        frameRate: 30
      };
      
      const dimensions = FORMAT_DIMENSIONS.portrait;
      const config = getWebCodecsConfig(testOptions, dimensions);
      
      result.config = config;
      
      // Estimate performance for a 10-second video
      const totalFrames = 10 * 30; // 10 seconds at 30fps
      result.performance = estimateWebCodecsPerformance(totalFrames, dimensions, 'medium');
      
    } catch (error) {
      console.warn('WebCodecs configuration test failed:', error);
    }
  }

  return result;
}

/**
 * Test WebCodecs encoder creation (non-destructive)
 */
export async function testWebCodecsEncoder(): Promise<{
  videoEncoder: boolean;
  audioEncoder: boolean;
  error?: string;
}> {
  if (!isWebCodecsSupported()) {
    return {
      videoEncoder: false,
      audioEncoder: false,
      error: 'WebCodecs not supported'
    };
  }

  const result = {
    videoEncoder: false,
    audioEncoder: false,
    error: undefined as string | undefined
  };

  try {
    // Test video encoder
    const videoEncoder = new VideoEncoder({
      output: () => {}, // No-op
      error: () => {}
    });
    
    videoEncoder.configure({
      codec: 'avc1.42001E',
      width: 1080,
      height: 1920,
      bitrate: 5000000,
      framerate: 30
    });
    
    result.videoEncoder = true;
    videoEncoder.close();
    
  } catch (error) {
    result.error = `Video encoder test failed: ${error}`;
  }

  try {
    // Test audio encoder
    const audioEncoder = new AudioEncoder({
      output: () => {}, // No-op
      error: () => {}
    });
    
    audioEncoder.configure({
      codec: 'opus',
      sampleRate: 48000,
      numberOfChannels: 2,
      bitrate: 192000
    });
    
    result.audioEncoder = true;
    audioEncoder.close();
    
  } catch (error) {
    if (!result.error) {
      result.error = `Audio encoder test failed: ${error}`;
    }
  }

  return result;
}

/**
 * Generate test report for WebCodecs functionality
 */
export async function generateWebCodecsTestReport(): Promise<string> {
  console.log('🧪 Running WebCodecs test suite...');
  
  const supportTest = testWebCodecsSupport();
  const encoderTest = await testWebCodecsEncoder();
  
  let report = '# WebCodecs Test Report\n\n';
  
  // Browser support
  report += '## Browser Support\n';
  report += `- **Overall Support**: ${supportTest.supported ? '✅ Supported' : '❌ Not Supported'}\n`;
  report += `- **Video Encoder**: ${supportTest.details.videoEncoder ? '✅' : '❌'}\n`;
  report += `- **Audio Encoder**: ${supportTest.details.audioEncoder ? '✅' : '❌'}\n`;
  report += `- **Video Frame**: ${supportTest.details.videoFrame ? '✅' : '❌'}\n`;
  report += `- **Audio Data**: ${supportTest.details.audioData ? '✅' : '❌'}\n\n`;
  
  // Encoder functionality
  report += '## Encoder Tests\n';
  report += `- **Video Encoder Creation**: ${encoderTest.videoEncoder ? '✅ Success' : '❌ Failed'}\n`;
  report += `- **Audio Encoder Creation**: ${encoderTest.audioEncoder ? '✅ Success' : '❌ Failed'}\n`;
  if (encoderTest.error) {
    report += `- **Error**: ${encoderTest.error}\n`;
  }
  report += '\n';
  
  // Configuration
  if (supportTest.config) {
    report += '## Configuration\n';
    report += `- **Video Codec**: ${supportTest.config.codec}\n`;
    report += `- **Resolution**: ${supportTest.config.width}x${supportTest.config.height}\n`;
    report += `- **Bitrate**: ${(supportTest.config.bitrate / 1000000).toFixed(1)} Mbps\n`;
    report += `- **Frame Rate**: ${supportTest.config.framerate} fps\n`;
    report += `- **Key Interval**: ${supportTest.config.keyInterval} frames\n\n`;
  }
  
  // Performance estimation
  if (supportTest.performance) {
    report += '## Performance Estimation (10s video)\n';
    report += `- **Estimated Export Time**: ${supportTest.performance.estimatedTimeSeconds.toFixed(1)}s\n`;
    report += `- **Speed Multiplier**: ${supportTest.performance.estimatedSpeedMultiplier.toFixed(1)}x realtime\n`;
    report += `- **Memory Usage**: ${supportTest.performance.memoryUsageMB.toFixed(1)} MB\n\n`;
  }
  
  // Recommendation
  report += '## Recommendation\n';
  if (supportTest.supported && encoderTest.videoEncoder) {
    report += '✅ **WebCodecs is ready to use!** You should see significant performance improvements.\n';
  } else if (supportTest.supported) {
    report += '⚠️ **WebCodecs partially supported.** Some features may not work correctly.\n';
  } else {
    report += '❌ **WebCodecs not supported.** Fallback to offline or canvas export recommended.\n';
  }
  
  console.log(report);
  return report;
}

/**
 * Quick WebCodecs readiness check
 */
export function isWebCodecsReady(): boolean {
  const support = detectWebCodecsSupport();
  return support.fullSupport;
}

/**
 * Get WebCodecs readiness status with recommendation
 */
export function getWebCodecsStatus(): {
  ready: boolean;
  recommendation: 'use' | 'fallback' | 'not-supported';
  reason: string;
} {
  const support = detectWebCodecsSupport();
  
  if (support.fullSupport) {
    return {
      ready: true,
      recommendation: 'use',
      reason: 'Full WebCodecs support available - optimal performance expected'
    };
  }
  
  if (support.videoEncoder && support.videoFrame) {
    return {
      ready: false,
      recommendation: 'fallback',
      reason: 'Partial WebCodecs support - video encoding available but audio may not work'
    };
  }
  
  return {
    ready: false,
    recommendation: 'not-supported',
    reason: 'WebCodecs not supported in this browser - use offline or canvas export'
  };
}