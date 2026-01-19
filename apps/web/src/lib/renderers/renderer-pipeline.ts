import { FrameRenderer, RendererMetrics, GroveIntegration } from "./frame-renderer";
import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions } from "../canvas-export-utils";
import { isTouchDevice } from "../mobile-utils";
import { groveStorage } from "../grove-storage";

interface RenderParams {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  timestamp: number;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  videoFrames: ImageData[];
  options: ExportOptions;
}

interface PipelineStage {
  name: string;
  enabled: boolean;
  order: number;
  processor: (params: RenderParams, next: () => Promise<boolean>) => Promise<boolean>;
}

export class RendererPipeline implements FrameRenderer {
  private baseRenderer: FrameRenderer;
  private stages: PipelineStage[] = [];
  private metrics: RendererMetrics = {
    renderTime: 0,
    memoryUsage: 0,
    frameProcessed: false
  };
  public name: string = 'pipeline';
  public priority: number = 90;

  constructor(baseRenderer: FrameRenderer) {
    this.baseRenderer = baseRenderer;
    this.name = `pipeline-${(baseRenderer as any).name || 'unknown'}`;
    this.priority = ((baseRenderer as any).priority || 0) + 10;
  }

  // Fluent API for composition
  withMobileOptimization(): this {
    this.stages.push({
      name: 'mobile-optimization',
      enabled: isTouchDevice(),
      order: 1,
      processor: async (params, next) => {
        if (isTouchDevice()) {
          console.log('📱 Applying mobile optimizations...');
          // Apply mobile-specific optimizations
          if (params.options.quality === 'high') {
            params.options.quality = 'medium'; // Reduce quality for mobile
          }
        }
        return next();
      }
    });
    console.log('🔧 Added mobile optimization to renderer pipeline');
    return this;
  }

  withGroveSupport(): this {
    this.stages.push({
      name: 'grove-integration',
      enabled: true,
      order: 2,
      processor: async (params, next) => {
        console.log('🌿 Processing frame with Grove integration...');
        const startTime = performance.now();

        try {
          const result = await next();

          // Grove-specific processing could happen here
          if (result && groveStorage) {
            // Example: Store frame metadata for potential chunking
            console.log('🌿 Frame processed successfully with Grove awareness');
          }

          return result;
        } catch (error) {
          console.error('🌿 Grove processing error:', error);
          return false;
        } finally {
          const endTime = performance.now();
          this.metrics.renderTime += endTime - startTime;
        }
      }
    });
    console.log('🔧 Added Grove/IPFS support to renderer pipeline');
    return this;
  }

  withPerformanceMonitoring(): this {
    this.stages.push({
      name: 'performance-monitoring',
      enabled: true,
      order: 0, // Run first
      processor: async (params, next) => {
        const startTime = performance.now();
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        try {
          const result = await next();
          this.metrics.frameProcessed = result;
          return result;
        } catch (error) {
          this.metrics.error = error instanceof Error ? error.message : 'Unknown error';
          throw error;
        } finally {
          const endTime = performance.now();
          const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

          this.metrics.renderTime = endTime - startTime;
          this.metrics.memoryUsage = finalMemory - initialMemory;

          if (this.metrics.renderTime > 16.67) { // > 60fps threshold
            console.warn(`⚠️ Slow render: ${this.metrics.renderTime.toFixed(2)}ms`);
          }
        }
      }
    });
    console.log('🔧 Added performance monitoring to renderer pipeline');
    return this;
  }

  canRender(params: { tracks: TimelineTrack[]; mediaItems: MediaItem[]; timestamp: number; options: ExportOptions; }): boolean {
    const canRender = (this.baseRenderer as any).canRender;
    return canRender ? canRender(params) : true;
  }

  async initialize(width: number, height: number): Promise<void> {
    console.log('🚀 Initializing renderer pipeline...');

    // Sort stages by order
    this.stages.sort((a, b) => a.order - b.order);

    return this.baseRenderer.initialize(width, height);
  }

  async renderFrame(params: RenderParams): Promise<boolean> {
    // Create a chain of processors
    const executeStage = (index: number): Promise<boolean> => {
      if (index >= this.stages.length) {
        // All stages processed, run the base renderer
        return this.baseRenderer.renderFrame(params);
      }

      const stage = this.stages[index];
      if (!stage.enabled) {
        return executeStage(index + 1);
      }

      return stage.processor(params, () => executeStage(index + 1));
    };

    return executeStage(0);
  }

  getMetrics(): RendererMetrics {
    return { ...this.metrics };
  }

  supportsGrove(): boolean {
    return this.stages.some(stage => stage.name === 'grove-integration' && stage.enabled);
  }

  configureGrove(config: GroveIntegration): void {
    console.log('🌿 Grove integration configured for pipeline');
    // Apply Grove configuration to relevant stages
    const groveStage = this.stages.find(s => s.name === 'grove-integration');
    if (groveStage) {
      groveStage.enabled = config.enabled;
    }
  }

  cleanup(): void {
    console.log('🧹 Cleaning up renderer pipeline...');
    this.baseRenderer.cleanup();
    this.stages = [];
  }
}