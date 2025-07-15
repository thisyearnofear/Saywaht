import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import {
  FORMAT_DIMENSIONS,
  clearCanvas,
  yieldToBrowser,
  getOptimalWebCodecsCodec,
  calculateKeyframeInterval
} from "./video-utils";
import { createOfflineAudioStream } from "./offline-audio-renderer";
import {
  isWebCodecsAvailable,
  getWebCodecsAPI
} from "./webcodecs-types";

import { WebCodecsExportOptions, WebCodecsConfig, getWebCodecsConfig, EncodedChunk } from "./worker-utils";
import { MP4Muxer } from './mp4-muxer';

// Add missing interface definition
interface WebCodecsContext {
  videoEncoder: any;
  videoChunks: EncodedChunk[];
  audioChunks: EncodedChunk[];
  audioEncoder?: any;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
}

async function createVideoEncoder(
  config: WebCodecsConfig,
  onChunk: (chunk: EncodedChunk) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const { VideoEncoder } = getWebCodecsAPI();
      
      const encoder = new VideoEncoder({
        output: (chunk: any, metadata?: any) => {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          
          onChunk({
            data,
            timestamp: chunk.timestamp,
            type: chunk.type
          });
        },
        error: (error: Error) => {
          console.error('WebCodecs video encoder error:', error);
          reject(error);
        }
      });

      encoder.configure({
        codec: config.codec,
        width: config.width,
        height: config.height,
        bitrate: config.bitrate,
        framerate: config.framerate,
        ...(config.avc && { avc: config.avc }),
        ...(config.keyInterval && { keyInterval: config.keyInterval })
      });
      
      resolve(encoder);
    } catch (error) {
      reject(new Error(`Failed to configure video encoder: ${error}`));
    }
  });
}

async function createAudioEncoder(
  sampleRate: number,
  audioBitrate: number,
  onChunk: (chunk: EncodedChunk) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const { AudioEncoder } = getWebCodecsAPI();
      
      const encoder = new AudioEncoder({
        output: (chunk: any, metadata?: any) => {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          
          onChunk({
            data,
            timestamp: chunk.timestamp,
            type: chunk.type
          });
        },
        error: (error: Error) => {
          console.error('WebCodecs audio encoder error:', error);
          reject(error);
        }
      });

      encoder.configure({
        codec: 'opus',
        sampleRate,
        numberOfChannels: 2,
        bitrate: audioBitrate
      });
      
      resolve(encoder);
    } catch (error) {
      reject(new Error(`Failed to configure audio encoder: ${error}`));
    }
  });
}

async function renderFrameAtTime(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  timestamp: number,
  ctx: OffscreenCanvasRenderingContext2D,
  canvas: OffscreenCanvas,
  videoElements: Map<string, any>
): Promise<boolean> {
  clearCanvas(ctx, canvas.width, canvas.height);
  
  let hasContent = false;

  for (const track of tracks) {
    if (track.muted) continue;

    for (const clip of track.clips) {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration - (clip.trimStart || 0) - (clip.trimEnd || 0);

      if (timestamp >= clipStart && timestamp < clipEnd) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        
        if (mediaItem) {
          if (mediaItem.type === 'video') {
            // In worker context, we need to handle video frames differently
            // For now, skip video rendering in workers
            console.warn('Video rendering in worker context needs VideoFrame API implementation');
            hasContent = true;
          } else if (mediaItem.type === 'image') {
            try {
              const response = await fetch(mediaItem.url);
              const blob = await response.blob();
              const img = await createImageBitmap(blob);
              const { drawWidth, drawHeight, drawX, drawY } = calculateAspectRatioDimensions(
                img.width,
                img.height,
                canvas.width,
                canvas.height
              );
              
              ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
              hasContent = true;
              img.close(); // Clean up ImageBitmap
            } catch (error) {
              console.error('Failed to render image:', error);
            }
          }
        }
      }
    }
  }

  return hasContent;
}

function calculateAspectRatioDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { drawWidth: number; drawHeight: number; drawX: number; drawY: number } {
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

  return { drawWidth, drawHeight, drawX, drawY };
}

// In a worker context, we can't use HTMLVideoElement directly
// This function needs to be refactored to work with OffscreenCanvas or VideoFrame
async function preloadVideoElements(mediaItems: MediaItem[]): Promise<Map<string, any>> {
  // For now, return an empty map as video preloading needs to be handled differently in workers
  // The actual video processing will need to be done using VideoFrame API
  console.warn('Video preloading in worker context needs to be implemented using VideoFrame API');
  return new Map();
}

async function muxChunks(
  videoChunks: EncodedChunk[],
  audioChunks: EncodedChunk[],
  outputFormat: 'mp4' | 'webm'
): Promise<Blob> {
  const allChunks = [...videoChunks, ...audioChunks]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(chunk => chunk.data);

  const mimeType = outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
  return new Blob(allChunks, { type: mimeType });
}

async function exportVideoWithWebCodecs(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: WebCodecsExportOptions
): Promise<Blob> {
  if (!isWebCodecsAvailable()) {
    throw new Error('WebCodecs API is not supported in this browser');
  }

  const exportStartTime = performance.now();

  const dimensions = FORMAT_DIMENSIONS[options.format as keyof typeof FORMAT_DIMENSIONS];
  const config = getWebCodecsConfig(options, dimensions);
  const frameRate = config.framerate || 30;
  const totalFrames = Math.ceil(totalDuration * frameRate);

  const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  }) as OffscreenCanvasRenderingContext2D;
  
  if (!ctx) {
    throw new Error('Failed to get 2D context from OffscreenCanvas');
  }

  const context: WebCodecsContext = {
    videoEncoder: await createVideoEncoder(config, (chunk) => {
      context.videoChunks.push(chunk);
    }),
    videoChunks: [],
    audioChunks: [],
    canvas,
    ctx
  };

  if (options.includeAudio) {
    context.audioEncoder = await createAudioEncoder(
      48000,
      options.audioBitrate || 192000,
      (chunk) => {
        context.audioChunks.push(chunk);
      }
    );
  }

  let cleanup: (() => Promise<void>) | null = null;

  try {
    onProgress(2);
    const videoElements = await preloadVideoElements(mediaItems);
    onProgress(5);

    if (options.includeAudio && context.audioEncoder) {
      const audioResult = await createOfflineAudioStream(tracks, mediaItems, totalDuration, (progress) => {
        onProgress(5 + (progress * 0.10));
      });
      
      cleanup = audioResult.cleanup;
      onProgress(15);
    }

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const timestamp = frameIndex / frameRate;
      const timestampMicros = Math.floor(timestamp * 1_000_000);

      const hasContent = await renderFrameAtTime(
        tracks,
        mediaItems,
        timestamp,
        ctx,
        canvas,
        videoElements
      );

      if (hasContent) {
        try {
          const { VideoFrame } = getWebCodecsAPI();
          const videoFrame = new VideoFrame(canvas, {
            timestamp: timestampMicros,
            duration: Math.floor(1_000_000 / frameRate)
          });

          if (context.videoEncoder.state === 'configured') {
            const keyFrame = frameIndex % (config.keyInterval || 60) === 0;
            context.videoEncoder.encode(videoFrame, { keyFrame });
          } else {
            console.warn('Skipping frame, video encoder is not configured');
          }
          
          videoFrame.close();
        } catch (error) {
          console.error('Failed to create/encode video frame:', error);
        }
      }

      const progress = 15 + ((frameIndex / totalFrames) * 80);
      onProgress(progress);

      if (frameIndex % 5 === 0) {
        await yieldToBrowser();
      }
    }

    onProgress(95);
    
    await context.videoEncoder.flush();
    if (context.audioEncoder) {
      await context.audioEncoder.flush();
    }

    const blob = await muxChunks(
      context.videoChunks,
      context.audioChunks,
      options.outputFormat || 'mp4'
    );

    onProgress(100);
    
    const exportEndTime = performance.now();
    const totalExportTime = (exportEndTime - exportStartTime) / 1000;
    
    console.log(`✅ WebCodecs export complete!`);
    console.log(`📊 Export stats:`);
    console.log(`   • File size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   • Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`   • Export time: ${totalExportTime.toFixed(1)}s`);
    console.log(`   • Speed ratio: ${(totalDuration / totalExportTime).toFixed(2)}x realtime`);
    console.log(`   • Frames: ${totalFrames} at ${frameRate}fps`);

    videoElements.forEach(video => {
      if (video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
      }
    });

    return blob;

  } catch (error) {
    console.error('❌ WebCodecs export failed:', error);
    throw error;
  } finally {
    if (context.videoEncoder.state !== 'closed') {
      context.videoEncoder.close();
    }
    if (context.audioEncoder && context.audioEncoder.state !== 'closed') {
      context.audioEncoder.close();
    }
    
    if (cleanup) {
      await cleanup();
    }
  }
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'start') {
    const { tracks, mediaItems, totalDuration, options } = payload;

    try {
      // Check if we should use MP4Muxer for MP4 output
      if (options.outputFormat === 'mp4' && isWebCodecsAvailable()) {
        // Use MP4Muxer for proper MP4 output
        await exportWithMP4Muxer(tracks, mediaItems, totalDuration, options);
      } else {
        // Fallback to WebM export
        const blob = await exportVideoWithWebCodecs(
          tracks,
          mediaItems,
          totalDuration,
          (progress) => {
            self.postMessage({ type: 'progress', payload: progress });
          },
          options
        );
        
        self.postMessage({ type: 'success', payload: blob });
      }
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: error instanceof Error ? error.message : 'Export failed'
      });
    }
  }
};

async function exportWithMP4Muxer(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  options: WebCodecsExportOptions
) {
  const dimensions = FORMAT_DIMENSIONS[options.format as keyof typeof FORMAT_DIMENSIONS];
  const codecs = getOptimalWebCodecsCodec(
    options.outputFormat || 'mp4',
    options.quality || 'medium',
    dimensions,
    options.frameRate || 30
  );

  const muxer = new MP4Muxer({
    video: {
      width: dimensions.width,
      height: dimensions.height,
      codec: codecs.video
    },
    audio: options.includeAudio ? {
      sampleRate: 48000,
      numberOfChannels: 2,
      codec: codecs.audio
    } : undefined,
    onComplete: (blob) => {
      self.postMessage({ type: 'success', payload: blob });
    }
  });

  const config = getWebCodecsConfig(options, dimensions);
  
  const videoEncoder = await createVideoEncoder(config, (chunk) => {
    muxer.addVideoChunk(chunk, undefined);
  });

  const audioEncoder = options.includeAudio ?
    await createAudioEncoder(48000, options.audioBitrate || 192000, (chunk) => {
      muxer.addAudioChunk(chunk, undefined);
    }) : undefined;

  try {
    const frameRate = options.frameRate || 30;
    const totalFrames = Math.ceil(totalDuration * frameRate);
    const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    }) as OffscreenCanvasRenderingContext2D;
    
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }

    const videoElements = await preloadVideoElements(mediaItems);

    // Process video frames
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const timestamp = frameIndex / frameRate;
      const timestampMicros = Math.floor(timestamp * 1_000_000);

      const hasContent = await renderFrameAtTime(
        tracks,
        mediaItems,
        timestamp,
        ctx,
        canvas,
        videoElements
      );

      if (hasContent) {
        const { VideoFrame } = getWebCodecsAPI();
        const videoFrame = new VideoFrame(canvas, {
          timestamp: timestampMicros,
          duration: Math.floor(1_000_000 / frameRate)
        });

        if (videoEncoder.state === 'configured') {
          const keyFrame = frameIndex % (config.keyInterval || 60) === 0;
          videoEncoder.encode(videoFrame, { keyFrame });
        }
        
        videoFrame.close();
      }

      const progress = (frameIndex / totalFrames) * 100;
      self.postMessage({ type: 'progress', payload: progress });

      if (frameIndex % 5 === 0) {
        await yieldToBrowser();
      }
    }

    // Process audio if needed
    if (options.includeAudio && audioEncoder) {
      const audioResult = await createOfflineAudioStream(tracks, mediaItems, totalDuration, (progress) => {
        // Audio progress is handled separately
      });

      // TODO: Encode audio data with audioEncoder
      // This requires adapting createOfflineAudioStream to yield AudioData

      if (audioResult.cleanup) {
        await audioResult.cleanup();
      }
    }

    // Finalize encoding
    await videoEncoder.flush();
    if (audioEncoder) {
      await audioEncoder.flush();
    }

    // Finalize muxing
    muxer.finalize();

  } finally {
    // Close encoders
    if (videoEncoder.state !== 'closed') {
      videoEncoder.close();
    }
    if (audioEncoder && audioEncoder.state !== 'closed') {
      audioEncoder.close();
    }
  }
}