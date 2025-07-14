/**
 * WebCodecs Demo and Testing
 * 
 * Simple demo functions to test WebCodecs integration
 * Use these to verify the implementation works correctly
 */

import { generateWebCodecsTestReport, getWebCodecsStatus } from './webcodecs-test';
import { exportVideoEnhanced } from './webcodecs-integration';
import { TimelineTrack } from '@/stores/timeline-store';
import { MediaItem } from '@/stores/media-store';

/**
 * Demo function to test WebCodecs support
 */
export async function demoWebCodecsSupport(): Promise<void> {
  console.log('🧪 WebCodecs Demo Starting...');
  
  // Test browser support
  const status = getWebCodecsStatus();
  console.log('📊 WebCodecs Status:', status);
  
  // Generate detailed report
  const report = await generateWebCodecsTestReport();
  console.log('📋 Detailed Report Generated');
  
  // Log recommendation
  if (status.ready) {
    console.log('✅ WebCodecs is ready for use!');
    console.log('💡 Recommendation: Use WebCodecs for optimal performance');
  } else {
    console.log('⚠️ WebCodecs not fully supported');
    console.log('💡 Recommendation:', status.recommendation);
    console.log('🔍 Reason:', status.reason);
  }
}

/**
 * Create a simple test timeline for WebCodecs testing
 */
export function createTestTimeline(): {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  duration: number;
} {
  // Create a simple test timeline with one image
  const testMediaItem: MediaItem = {
    id: 'test-image-1',
    name: 'Test Image',
    type: 'image',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2ZmZiIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdDwvdGV4dD4KPC9zdmc+',
    duration: 5,
    aspectRatio: 1, // Square image
    file: undefined
  };

  const testTrack: TimelineTrack = {
    id: 'test-track-1',
    name: 'Test Track',
    type: 'video',
    clips: [
      {
        id: 'test-clip-1',
        mediaId: 'test-image-1',
        name: 'Test Clip',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 0
      }
    ],
    muted: false
  };

  return {
    tracks: [testTrack],
    mediaItems: [testMediaItem],
    duration: 5
  };
}

/**
 * Demo function to test WebCodecs export with simple test data
 */
export async function demoWebCodecsExport(): Promise<{
  success: boolean;
  blob?: Blob;
  exportMethod?: string;
  stats?: any;
  error?: string;
}> {
  console.log('🎬 WebCodecs Export Demo Starting...');
  
  try {
    // Create test timeline
    const { tracks, mediaItems, duration } = createTestTimeline();
    
    // Test export with progress logging
    const progressHandler = (progress: number) => {
      if (progress % 10 === 0) { // Log every 10%
        console.log(`📊 Export Progress: ${progress.toFixed(1)}%`);
      }
    };
    
    const result = await exportVideoEnhanced(
      tracks,
      mediaItems,
      duration,
      progressHandler,
      {
        format: 'square',
        quality: 'medium',
        includeAudio: false,
        outputFormat: 'mp4',
        method: 'auto'
      }
    );
    
    console.log('✅ Export Demo Completed Successfully!');
    console.log('📊 Export Stats:', result.stats);
    
    return {
      success: true,
      blob: result.blob,
      exportMethod: result.exportMethod,
      stats: result.stats
    };
    
  } catch (error) {
    console.error('❌ Export Demo Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test WebCodecs performance with different configurations
 */
export async function demoWebCodecsPerformance(): Promise<void> {
  console.log('⚡ WebCodecs Performance Demo...');
  
  const { tracks, mediaItems, duration } = createTestTimeline();
  
  const configurations = [
    { quality: 'low' as const, format: 'square' as const },
    { quality: 'medium' as const, format: 'square' as const },
    { quality: 'high' as const, format: 'square' as const },
    { quality: 'medium' as const, format: 'portrait' as const },
    { quality: 'medium' as const, format: 'landscape' as const }
  ];
  
  for (const config of configurations) {
    const startTime = performance.now();
    
    try {
      const result = await exportVideoEnhanced(
        tracks,
        mediaItems,
        duration,
        () => {}, // No progress logging for performance test
        {
          ...config,
          includeAudio: false,
          outputFormat: 'mp4',
          method: 'auto'
        }
      );
      
      const endTime = performance.now();
      const exportTime = (endTime - startTime) / 1000;
      
      console.log(`📊 ${config.quality} ${config.format}:`, {
        exportTime: `${exportTime.toFixed(2)}s`,
        fileSize: `${(result.blob.size / 1024).toFixed(1)}KB`,
        method: result.exportMethod,
        speedMultiplier: `${result.stats.speedMultiplier.toFixed(2)}x`
      });
      
    } catch (error) {
      console.error(`❌ ${config.quality} ${config.format} failed:`, error);
    }
  }
}

/**
 * Comprehensive WebCodecs demo
 */
export async function runWebCodecsDemo(): Promise<void> {
  console.log('🚀 Running Comprehensive WebCodecs Demo...');
  
  try {
    // Test 1: Browser support
    await demoWebCodecsSupport();
    
    // Test 2: Simple export
    const exportResult = await demoWebCodecsExport();
    
    if (exportResult.success) {
      console.log('✅ Basic export test passed');
      
      // Test 3: Performance comparison (only if basic export works)
      await demoWebCodecsPerformance();
    } else {
      console.log('❌ Basic export test failed:', exportResult.error);
    }
    
    console.log('🎉 WebCodecs Demo Completed!');
    
  } catch (error) {
    console.error('💥 Demo failed:', error);
  }
}

// Export demo functions for use in browser console
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.webCodecsDemo = {
    runDemo: runWebCodecsDemo,
    testSupport: demoWebCodecsSupport,
    testExport: demoWebCodecsExport,
    testPerformance: demoWebCodecsPerformance
  };
  
  console.log('💡 WebCodecs demo functions available:');
  console.log('• window.webCodecsDemo.runDemo() - Run full demo');
  console.log('• window.webCodecsDemo.testSupport() - Test browser support');
  console.log('• window.webCodecsDemo.testExport() - Test export functionality');
  console.log('• window.webCodecsDemo.testPerformance() - Test performance');
}