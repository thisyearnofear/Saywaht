// Core interfaces and base renderers
export type { FrameRenderer, EnhancedFrameRenderer, RendererMetrics, GroveIntegration } from './frame-renderer';
export { Canvas2DRenderer } from './canvas-2d-renderer';
export { WebGLRenderer } from './webgl-renderer';

// Factory and pipeline system
export { RendererFactory, type DeviceCapabilities, type RendererFactoryConfig } from './renderer-factory';
export { RendererPipeline } from './renderer-pipeline';

// Convenience factory function
import { RendererFactory } from './renderer-factory';
import { RendererPipeline } from './renderer-pipeline';
import { WebCodecsExportOptions } from '../webcodecs-export';

export async function createOptimalRenderer(
  options: WebCodecsExportOptions,
  context: 'mobile' | 'desktop' | 'auto' = 'auto'
): Promise<RendererPipeline> {
  const capabilities = RendererFactory.detectDeviceCapabilities();
  
  // Override mobile detection if explicitly specified
  if (context !== 'auto') {
    capabilities.isMobile = context === 'mobile';
  }
  
  console.log('🎯 Creating optimal renderer with capabilities:', capabilities);
  
  // Create base renderer using factory
  const baseRenderer = await RendererFactory.createOptimalRenderer(options, capabilities);
  
  // Build pipeline with appropriate enhancements
  const pipeline = new RendererPipeline(baseRenderer)
    .withGroveSupport() // Always add Grove support for SayWhat
    .withPerformanceMonitoring(); // Always monitor performance
  
  // Add mobile optimization if needed
  if (capabilities.isMobile) {
    pipeline.withMobileOptimization();
  }
  
  console.log('✅ Optimal renderer pipeline created successfully');
  return pipeline;
}