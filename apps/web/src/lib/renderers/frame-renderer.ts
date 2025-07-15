import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { WebCodecsExportOptions } from "../webcodecs-export";

export interface FrameRenderer {
  name: string;
  priority: number;
  initialize(width: number, height: number): Promise<void>;
  canRender(params: {
    tracks: TimelineTrack[];
    mediaItems: MediaItem[];
    timestamp: number;
    options: WebCodecsExportOptions;
  }): boolean;
  renderFrame(params: {
    tracks: TimelineTrack[];
    mediaItems: MediaItem[];
    timestamp: number;
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    videoFrames: ImageData[];
    options: WebCodecsExportOptions;
  }): Promise<boolean>;
  cleanup(): void;
}

export interface RendererMetrics {
  renderTime: number;
  memoryUsage: number;
  frameProcessed: boolean;
  error?: string;
}

export interface GroveIntegration {
  enabled: boolean;
  storageService?: any;
  chunkSize?: number;
  compressionLevel?: number;
}

export interface EnhancedFrameRenderer extends FrameRenderer {
  getMetrics(): RendererMetrics;
  supportsGrove(): boolean;
  configureGrove(config: GroveIntegration): void;
}