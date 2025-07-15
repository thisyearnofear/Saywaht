import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { WebCodecsExportOptions } from "./webcodecs-export";
import { createOptimalRenderer } from "./renderers";
import { RendererPipeline } from "./renderers/renderer-pipeline";
import { FORMAT_DIMENSIONS, clearCanvas, drawWithAspectRatio } from "./video-utils";
import {
  isWebCodecsAvailable,
  getWebCodecsAPI,
} from "./webcodecs-types";

export interface ExportWorkerMessage {
  type: 'start' | 'progress' | 'success' | 'error';
  payload: any;
}

export interface ExportWorkerData {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  totalDuration: number;
  options: WebCodecsExportOptions;
}

let renderer: RendererPipeline | null = null;

// Store video frames in memory for reuse
const videoFrameCache = new Map<string, Map<number, ImageData>>();

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

async function extractVideoFrame(
  videoUrl: string,
  timestamp: number,
  width: number,
  height: number
): Promise<ImageData | null> {
  // Check cache first
  const videoCache = videoFrameCache.get(videoUrl);
  if (videoCache) {
    const cachedFrame = videoCache.get(Math.floor(timestamp * 30)); // Cache at 30fps granularity
    if (cachedFrame) {
      return cachedFrame;
    }
  }

  // Workers cannot use HTMLVideoElement directly
  // Video frame extraction must be done on the main thread
  // For now, return null - video frames will be handled by the transferable approach
  return null;
}

async function renderFrameAtTimestamp(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  timestamp: number,
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D
): Promise<boolean> {
  clearCanvas(ctx, canvas.width, canvas.height);
  
  let hasContent = false;

  // Process tracks in order
  for (const track of tracks) {
    if (track.muted) continue;

    for (const clip of track.clips) {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration - (clip.trimStart || 0) - (clip.trimEnd || 0);

      if (timestamp >= clipStart && timestamp < clipEnd) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        
        if (mediaItem) {
          if (mediaItem.type === 'video') {
            // For videos, we need a different approach in workers
            // Workers can't use HTMLVideoElement directly
            // We'll need to either:
            // 1. Use VideoDecoder API (part of WebCodecs)
            // 2. Pre-extract frames on main thread with transferable objects
            // 3. Use a different architecture
            
            // For now, skip video rendering in worker
            console.warn('Video rendering in worker not yet implemented');
          } else if (mediaItem.type === 'image') {
            // Images can be loaded in workers
            try {
              const response = await fetch(mediaItem.url);
              const blob = await response.blob();
              const imageBitmap = await createImageBitmap(blob);
              
              // Draw with aspect ratio preservation
              const sourceWidth = imageBitmap.width;
              const sourceHeight = imageBitmap.height;
              const targetWidth = canvas.width;
              const targetHeight = canvas.height;
              
              const sourceAspect = sourceWidth / sourceHeight;
              const targetAspect = targetWidth / targetHeight;
              
              let drawWidth, drawHeight, drawX, drawY;
              
              if (sourceAspect > targetAspect) {
                drawHeight = targetHeight;
                drawWidth = drawHeight * sourceAspect;
                drawX = (targetWidth - drawWidth) / 2;
                drawY = 0;
              } else {
                drawWidth = targetWidth;
                drawHeight = drawWidth / sourceAspect;
                drawX = 0;
                drawY = (targetHeight - drawHeight) / 2;
              }
              
              ctx.drawImage(imageBitmap, drawX, drawY, drawWidth, drawHeight);
              hasContent = true;
              
              imageBitmap.close(); // Clean up
            } catch (error) {
              console.error('Failed to load image:', error);
            }
          }
        }
      }
    }
  }

  return hasContent;
}

async function handleExportStart(data: ExportWorkerData): Promise<void> {
  const { tracks, mediaItems, totalDuration, options } = data;
  
  console.log('Starting WebCodecs export in worker...');
  
  const frameRate = options.frameRate || 30;
  const totalFrames = Math.ceil(totalDuration * frameRate);
  const dimensions = FORMAT_DIMENSIONS[options.format] || FORMAT_DIMENSIONS.portrait;
  
  console.log(`Export details:
    Duration: ${totalDuration}s
    Frame rate: ${frameRate}fps
    Total frames: ${totalFrames}
    Dimensions: ${dimensions.width}x${dimensions.height}
  `);

  // Check if WebCodecs is available in worker
  if (!isWebCodecsAvailable()) {
    throw new Error('WebCodecs API not available in worker');
  }

  const { VideoEncoder } = getWebCodecsAPI();
  
  // Create canvas for rendering
  const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  
  if (!ctx) {
    throw new Error('Failed to get 2D context from OffscreenCanvas');
  }

  // Configure video encoder
  const videoChunks: Uint8Array[] = [];
  const encoder = new VideoEncoder({
    output: (chunk: any) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      videoChunks.push(data);
    },
    error: (error: Error) => {
      console.error('VideoEncoder error:', error);
      throw error;
    }
  });

  const encoderConfig = {
    codec: 'vp8', // Use VP8 for WebM, simpler than H264
    width: dimensions.width,
    height: dimensions.height,
    bitrate: options.videoBitrate || 5_000_000,
    framerate: frameRate,
  };

  encoder.configure(encoderConfig);

  // Process frames
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
      // Render frame
      const hasContent = await renderFrameAtTimestamp(
        tracks,
        mediaItems,
        timestamp,
        canvas,
        ctx
      );
      
      if (hasContent) {
        // Create VideoFrame from canvas
        const frame = new (self as any).VideoFrame(canvas, {
          timestamp: timestamp * 1_000_000, // Convert to microseconds
        });
        
        // Encode frame
        encoder.encode(frame, { keyFrame: frameIndex % 30 === 0 });
        frame.close(); // Clean up
      }
    } catch (error) {
      console.error(`Frame ${frameIndex} error:`, error);
    }
  }

  // Flush encoder
  await encoder.flush();
  encoder.close();

  // Create WebM blob (simplified - in production use a proper muxer)
  const finalBlob = new Blob(videoChunks, {
    type: 'video/webm'
  });
  
  // Clear cache
  videoFrameCache.clear();
  
  self.postMessage({
    type: 'success',
    payload: finalBlob
  });
  
  console.log('Export completed successfully');
}

// Handle termination
self.addEventListener('message', (event) => {
  if (event.data.type === 'terminate') {
    if (renderer) {
      renderer.cleanup();
      renderer = null;
    }
    videoFrameCache.clear();
    self.close();
  }
});