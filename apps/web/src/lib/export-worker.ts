import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { WebCodecsExportOptions } from "./webcodecs-export";
import { createOptimalRenderer } from "./renderers";
import { RendererPipeline } from "./renderers/renderer-pipeline";
import { FORMAT_DIMENSIONS } from "./video-utils";

export interface ExportWorkerMessage {
  type: 'start' | 'progress' | 'success' | 'error';
  payload: any;
}

export interface ExportWorkerData {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  totalDuration: number;
  options: WebCodecsExportOptions;
  videoFrames: ImageData[];
}

let renderer: RendererPipeline | null = null;

self.onmessage = async (event: MessageEvent<ExportWorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'start':
        await handleExportStart(payload);
        break;
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Export worker error:', error);
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

async function handleExportStart(data: ExportWorkerData): Promise<void> {
  const { tracks, mediaItems, totalDuration, options, videoFrames } = data;
  
  console.log('Starting export with new renderer system...');
  
  renderer = await createOptimalRenderer(options, 'auto');
  
  const frameRate = options.frameRate || 30;
  const totalFrames = Math.ceil(totalDuration * frameRate);
  
  console.log(`Export details:
    Duration: ${totalDuration}s
    Frame rate: ${frameRate}fps
    Total frames: ${totalFrames}
    Video frames available: ${videoFrames.length}
    Grove integration: ${renderer.supportsGrove() ? 'enabled' : 'disabled'}
  `);

  const dimensions = FORMAT_DIMENSIONS[options.format] || FORMAT_DIMENSIONS.portrait;
  const canvas = new OffscreenCanvas(
    dimensions.width,
    dimensions.height
  );
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  
  if (!ctx) {
    throw new Error('Failed to get 2D context from OffscreenCanvas');
  }

  await renderer.initialize(canvas.width, canvas.height);
  
  const processedFrames: ArrayBuffer[] = [];
  
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timestamp = frameIndex / frameRate;
    const progress = (frameIndex / totalFrames) * 100;
    
    if (frameIndex % 10 === 0) {
      self.postMessage({
        type: 'progress',
        payload: progress
      });
    }
    
    try {
      const success = await renderer.renderFrame({
        tracks,
        mediaItems,
        timestamp,
        canvas,
        ctx,
        videoFrames,
        options
      });
      
      if (success) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        processedFrames.push(imageData.data.buffer as ArrayBuffer);
        
        if (frameIndex % 30 === 0) {
          const metrics = renderer.getMetrics();
          console.log(`Frame ${frameIndex} metrics:`, metrics);
        }
      } else {
        console.warn(`Frame ${frameIndex} failed to render`);
      }
    } catch (error) {
      console.error(`Frame ${frameIndex} error:`, error);
    }
  }
  
  const finalBlob = new Blob(processedFrames, { 
    type: options.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm' 
  });
  
  const finalMetrics = renderer.getMetrics();
  console.log('Final export metrics:', finalMetrics);
  
  renderer.cleanup();
  renderer = null;
  
  self.postMessage({
    type: 'success',
    payload: finalBlob
  });
  
  console.log('Export completed successfully');
}

self.onmessage = (event) => {
  if (event.data.type === 'terminate') {
    if (renderer) {
      renderer.cleanup();
      renderer = null;
    }
    self.close();
  }
};