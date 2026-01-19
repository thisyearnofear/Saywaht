/**
 * Unified Frame Composition Engine
 * 
 * Handles all frame rendering with:
 * - Intelligent caching to avoid redundant seeks
 * - Async batching for performance
 * - Proper error handling with fallbacks
 * - Clear separation of concerns
 */

import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { clearCanvas, drawWithAspectRatio, yieldToBrowser } from "./video-utils";

interface CompositionConfig {
  width: number;
  height: number;
  frameRate: number;
  backgroundColor?: string; // Default background for blank frames
}

interface CompositionResult {
  frames: Map<number, ImageData>;
  stats: {
    totalFrames: number;
    framesWithContent: number;
    compositionTimeMs: number;
  };
}

interface VideoClipInfo {
  mediaItem: MediaItem;
  startTime: number;
  endTime: number;
  trimStart: number;
  trimEnd: number;
  videoElement?: HTMLVideoElement;
}

/**
 * Handles frame composition with intelligent caching
 */
export class ExportFrameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private clips: VideoClipInfo[] = [];
  private videoCache = new Map<string, HTMLVideoElement>();
  private frameCache = new Map<number, ImageData>();
  private config: CompositionConfig;
  private seekCache = new Map<string, number>(); // video-id:time -> position

  constructor(config: CompositionConfig) {
    this.config = config;
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    
    const ctx = this.canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: true
    });
    if (!ctx) throw new Error('Failed to create canvas context');
    
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Initialize video clips
   */
  async initializeClips(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('📹 Initializing video clips for composition...');
    
    const clipList: VideoClipInfo[] = [];
    
    for (const track of tracks) {
      if (track.muted) continue;
      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (mediaItem?.type === 'video') {
          clipList.push({
            mediaItem,
            startTime: clip.startTime,
            endTime: clip.startTime + clip.duration,
            trimStart: clip.trimStart || 0,
            trimEnd: clip.trimEnd || 0
          });
        }
      }
    }

    console.log(`✅ Found ${clipList.length} video clips`);

    // Pre-load unique videos with timeout protection
    const uniqueVideos = new Map<string, MediaItem>();
    clipList.forEach(clip => {
      uniqueVideos.set(clip.mediaItem.id, clip.mediaItem);
    });

    let loaded = 0;
    for (const [id, mediaItem] of uniqueVideos) {
      try {
        await this.loadVideo(mediaItem);
        loaded++;
        onProgress?.((loaded / uniqueVideos.size) * 100);
      } catch (err) {
        console.error(`Failed to load video ${mediaItem.name}:`, err);
        throw err;
      }
    }

    this.clips = clipList;
    console.log(`✅ Initialized ${clipList.length} clips, loaded ${loaded} unique videos`);
  }

  /**
   * Load a video with proper error handling
   */
  private async loadVideo(mediaItem: MediaItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        video.removeEventListener('canplaythrough', onReady);
        video.removeEventListener('error', onError);
      };

      const onReady = () => {
        this.videoCache.set(mediaItem.id, video);
        console.log(`✅ Video loaded: ${mediaItem.name}`);
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error(`Failed to load video: ${mediaItem.name}`));
      };

      video.addEventListener('canplaythrough', onReady);
      video.addEventListener('error', onError);

      // Timeout to prevent hanging
      setTimeout(() => {
        if (!resolved && video.readyState >= 2) {
          this.videoCache.set(mediaItem.id, video);
          cleanup();
          resolve();
        } else if (!resolved) {
          cleanup();
          reject(new Error(`Video load timeout: ${mediaItem.name}`));
        }
      }, 10000);

      video.src = mediaItem.url;
      video.load();
    });
  }

  /**
   * Seek video to timestamp with caching and timeout protection
   */
  private async seekVideo(video: HTMLVideoElement, targetTime: number): Promise<boolean> {
    const cacheKey = `${video.src}:${targetTime.toFixed(3)}`;
    
    // Return from cache if already seeked
    if (this.seekCache.has(cacheKey) && Math.abs(video.currentTime - targetTime) < 0.01) {
      return true;
    }

    video.currentTime = targetTime;

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const seekThreshold = 1 / 30; // 1 frame at 30fps

      const checkSeek = setInterval(() => {
        if (Math.abs(video.currentTime - targetTime) <= seekThreshold && video.readyState >= 2) {
          clearInterval(checkSeek);
          if (!resolved) {
            resolved = true;
            this.seekCache.set(cacheKey, targetTime);
            resolve(true);
          }
        }
      }, 5);

      // Timeout: if seek doesn't work, give up gracefully
      setTimeout(() => {
        clearInterval(checkSeek);
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 150);
    });
  }

  /**
   * Render a single frame at timestamp
   */
  async renderFrame(timestamp: number): Promise<ImageData> {
    // Fill with background color
    const bgColor = this.config.backgroundColor || '#000000';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let hasContent = false;

    // Render all clips active at this timestamp
    for (const clip of this.clips) {
      if (timestamp < clip.startTime || timestamp >= clip.endTime) continue;

      const videoTime = Math.max(0, timestamp - clip.startTime + clip.trimStart);
      const video = this.videoCache.get(clip.mediaItem.id);

      if (!video || video.readyState < 2) {
        console.warn(`Video not ready for ${clip.mediaItem.name} at ${timestamp}s`);
        continue;
      }

      // Seek to the right time
      const seekSuccess = await this.seekVideo(video, videoTime);
      if (!seekSuccess) {
        console.warn(`Failed to seek ${clip.mediaItem.name} to ${videoTime}s`);
        continue;
      }

      // Draw the frame
      try {
        drawWithAspectRatio(this.ctx, video, this.canvas.width, this.canvas.height);
        hasContent = true;
      } catch (err) {
        console.warn(`Failed to draw frame for ${clip.mediaItem.name}:`, err);
      }
    }

    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Batch compose frames with progress tracking
   */
  async composeAllFrames(
    totalDuration: number,
    onProgress?: (progress: number) => void
  ): Promise<CompositionResult> {
    const startTime = performance.now();
    const totalFrames = Math.ceil(totalDuration * this.config.frameRate);

    console.log(`🎨 Pre-composing ${totalFrames} frames...`);

    const frames = new Map<number, ImageData>();
    let framesWithContent = 0;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const timestamp = frameIndex / this.config.frameRate;
      
      try {
        const frameData = await this.renderFrame(timestamp);
        frames.set(frameIndex, frameData);
        
        // Check if frame has actual content (not just background)
        if (this.frameHasContent(frameData)) {
          framesWithContent++;
        }

        onProgress?.((frameIndex / totalFrames) * 100);

        // Yield to browser periodically to prevent blocking
        if (frameIndex % 30 === 0) {
          await yieldToBrowser();
        }
      } catch (err) {
        console.error(`Failed to compose frame ${frameIndex}:`, err);
        // Store blank frame and continue
        frames.set(frameIndex, this.createBlankFrame());
      }
    }

    const compositionTimeMs = performance.now() - startTime;

    console.log(`✅ Composition complete: ${framesWithContent}/${totalFrames} frames with content`);
    console.log(`⏱️ Composition took ${(compositionTimeMs / 1000).toFixed(1)}s`);

    return {
      frames,
      stats: {
        totalFrames,
        framesWithContent,
        compositionTimeMs
      }
    };
  }

  /**
   * Check if a frame has meaningful content (not just background)
   */
  private frameHasContent(frameData: ImageData): boolean {
    // Sample 10 random pixels to check if any differ from pure black
    const data = frameData.data;
    let samplePoints = 0;
    
    for (let i = 0; i < Math.min(10, data.length / 4); i++) {
      const idx = Math.floor(Math.random() * (data.length / 4)) * 4;
      // Check if pixel is not black (0,0,0)
      if (data[idx] > 10 || data[idx + 1] > 10 || data[idx + 2] > 10) {
        samplePoints++;
      }
    }
    
    return samplePoints > 0;
  }

  /**
   * Create a blank frame with background color
   */
  private createBlankFrame(): ImageData {
    this.ctx.fillStyle = this.config.backgroundColor || '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render pre-composed frame to canvas
   */
  renderComposedFrame(frameIndex: number, frames: Map<number, ImageData>): boolean {
    const frameData = frames.get(frameIndex);
    if (!frameData) return false;

    this.ctx.putImageData(frameData, 0, 0);
    return true;
  }

  /**
   * Get canvas for capture
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.videoCache.clear();
    this.frameCache.clear();
    this.seekCache.clear();
    this.clips = [];
  }
}

/**
 * Create frame engine with standard config
 */
export function createFrameEngine(
  width: number,
  height: number,
  frameRate: number
): ExportFrameEngine {
  return new ExportFrameEngine({
    width,
    height,
    frameRate,
    backgroundColor: '#000000' // Opaque black instead of transparent
  });
}
