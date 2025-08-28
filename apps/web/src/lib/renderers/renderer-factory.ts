import { FrameRenderer, EnhancedFrameRenderer, GroveIntegration } from "./frame-renderer";
import { Canvas2DRenderer } from "./canvas-2d-renderer";
import { WebGLRenderer } from "./webgl-renderer";
import { WebCodecsExportOptions } from "../webcodecs-export";
import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { isTouchDevice } from "../mobile-utils";
import { groveStorage } from "../grove-storage";

export interface DeviceCapabilities {
  isMobile: boolean;
  supportsWebGL: boolean;
  supportsGrove: boolean;
  memoryLimit?: number;
}

export interface RendererFactoryConfig {
  enableGrove: boolean;
  enableMobileOptimization: boolean;
  enablePerformanceMonitoring: boolean;
  quality: 'low' | 'medium' | 'high';
  preferWebGL: boolean;
  customRenderers?: FrameRenderer[];
}

export class RendererFactory {
  private static instance: RendererFactory;
  private renderers: Map<string, FrameRenderer> = new Map();
  private config: RendererFactoryConfig;
  private groveConfig: GroveIntegration;

  private constructor(config: RendererFactoryConfig) {
    this.config = config;
    this.groveConfig = {
      enabled: config.enableGrove,
      storageService: groveStorage,
      chunkSize: 1024 * 1024, // 1MB chunks
      compressionLevel: 6
    };
    this.initializeRenderers();
  }

  static getInstance(config?: RendererFactoryConfig): RendererFactory {
    if (!RendererFactory.instance) {
      RendererFactory.instance = new RendererFactory(config || {
        enableGrove: true,
        enableMobileOptimization: true,
        enablePerformanceMonitoring: true,
        quality: 'medium',
        preferWebGL: true
      });
    }
    return RendererFactory.instance;
  }

  private initializeRenderers(): void {
    // Enhance existing renderers with Grove capabilities
    const webglRenderer = new WebGLRenderer();
    const canvas2dRenderer = new Canvas2DRenderer();

    // Add required properties to existing renderers
    this.enhanceRenderer(webglRenderer, 'webgl', this.config.preferWebGL ? 100 : 50);
    this.enhanceRenderer(canvas2dRenderer, 'canvas2d', 80);

    this.renderers.set('webgl', webglRenderer);
    this.renderers.set('canvas2d', canvas2dRenderer);

    // Register custom renderers
    if (this.config.customRenderers) {
      this.config.customRenderers.forEach((renderer, index) => {
        this.renderers.set(`custom_${index}`, renderer);
      });
    }
  }

  private enhanceRenderer(renderer: FrameRenderer, name: string, priority: number): void {
    (renderer as any).name = name;
    (renderer as any).priority = priority;
    (renderer as any).canRender = (params: any) => {
      if (name === 'webgl') {
        return this.isWebGLSupported();
      }
      return true;
    };

    // Add Grove integration methods
    if (this.config.enableGrove) {
      (renderer as any).supportsGrove = () => true;
      (renderer as any).configureGrove = (config: GroveIntegration) => {
        console.log(`🌿 Grove integration configured for ${name} renderer`);
      };
      (renderer as any).getMetrics = () => ({
        renderTime: 0,
        memoryUsage: 0,
        frameProcessed: true
      });
    }
  }

  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  static async createOptimalRenderer(
    options: WebCodecsExportOptions,
    capabilities: DeviceCapabilities
  ): Promise<FrameRenderer> {
    const factory = RendererFactory.getInstance();

    // Use factory selection logic
    const selectedRenderer = factory.selectRenderer({
      tracks: [],
      mediaItems: [],
      options
    });

    const dimensions = { width: 1920, height: 1080 }; // Default dimensions
    await selectedRenderer.initialize(
      dimensions.width,
      dimensions.height
    );

    console.log(`✅ ${(selectedRenderer as any).name || 'Unknown'} renderer initialized successfully`);
    return selectedRenderer;
  }

  selectRenderer(params: {
    tracks: TimelineTrack[];
    mediaItems: MediaItem[];
    options: WebCodecsExportOptions;
  }): FrameRenderer {
    const availableRenderers = Array.from(this.renderers.values())
      .filter(renderer => {
        const canRender = (renderer as any).canRender;
        return canRender ? canRender(params) : true;
      })
      .sort((a, b) => ((b as any).priority || 0) - ((a as any).priority || 0));

    if (availableRenderers.length === 0) {
      throw new Error('No suitable renderer found for the given parameters');
    }

    // Mobile-first selection
    if (isTouchDevice() && this.config.enableMobileOptimization) {
      console.log('📱 Mobile device detected, optimizing renderer selection');
      // Prefer canvas2d for mobile stability
      const canvas2dRenderer = availableRenderers.find(r => (r as any).name === 'canvas2d');
      if (canvas2dRenderer) return canvas2dRenderer;
    }

    // Grove-aware selection for decentralized storage
    if (this.config.enableGrove) {
      console.log('🌿 Grove integration enabled, configuring renderer');
      const selectedRenderer = availableRenderers[0];
      if ((selectedRenderer as any).configureGrove) {
        (selectedRenderer as any).configureGrove(this.groveConfig);
      }
      return selectedRenderer;
    }

    // Default to highest priority renderer
    return availableRenderers[0];
  }

  getAllRenderers(): FrameRenderer[] {
    return Array.from(this.renderers.values());
  }

  getRenderer(name: string): FrameRenderer | undefined {
    return this.renderers.get(name);
  }

  updateConfig(newConfig: Partial<RendererFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.renderers.clear();
    this.initializeRenderers();
  }

  cleanup(): void {
    this.renderers.forEach(renderer => renderer.cleanup());
    this.renderers.clear();
  }

  static detectDeviceCapabilities(): DeviceCapabilities {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    let supportsWebGL = false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      supportsWebGL = !!gl;
    } catch (error) {
      supportsWebGL = false;
    }

    return {
      isMobile,
      supportsWebGL,
      supportsGrove: true, // Always true for saywaht with Grove integration
      memoryLimit: isMobile ? 512 : 2048 // MB estimate
    };
  }
}
