import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

interface VideoFrame {
  timestamp: number;
  imageData: ImageData;
}

interface VideoClip {
  mediaItem: MediaItem;
  videoElement: HTMLVideoElement;
  startTime: number;
  endTime: number;
  trimStart: number;
  trimEnd: number;
}

/**
 * Phase 3A: Buffered Video Rendering
 * Pre-renders video frames to eliminate seeking during export
 */
export class BufferedVideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoClips: VideoClip[] = [];
  private frameBuffer: Map<number, VideoFrame> = new Map();

  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    
    const ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Initialize video clips and pre-load video elements
   */
  async initialize(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('🎬 Initializing buffered video renderer...');
    
    const videoClips: VideoClip[] = [];
    let processedClips = 0;
    let totalVideoClips = 0;

    // Count total video clips
    for (const track of tracks) {
      if (track.muted) continue;
      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (mediaItem && mediaItem.type === "video") {
          totalVideoClips++;
        }
      }
    }

    // Load video elements
    for (const track of tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem || mediaItem.type !== "video") continue;

        try {
          const videoElement = await this.createOptimizedVideoElement(mediaItem);
          
          videoClips.push({
            mediaItem,
            videoElement,
            startTime: clip.startTime,
            endTime: clip.startTime + clip.duration - clip.trimStart - clip.trimEnd,
            trimStart: clip.trimStart || 0,
            trimEnd: clip.trimEnd || 0
          });

          processedClips++;
          if (onProgress) {
            onProgress((processedClips / totalVideoClips) * 100);
          }

          console.log(`🎬 Loaded video clip: ${mediaItem.name}`);
        } catch (error) {
          console.warn(`Failed to load video ${mediaItem.name}:`, error);
        }
      }
    }

    this.videoClips = videoClips;
    console.log(`✅ Buffered video renderer initialized with ${videoClips.length} clips`);
  }

  /**
   * Pre-render frames at key timestamps to reduce seeking
   */
  async preRenderKeyFrames(
    timestamps: number[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log(`🎬 Pre-rendering ${timestamps.length} key frames...`);
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const frame = await this.renderFrameAtTime(timestamp);
      
      if (frame) {
        this.frameBuffer.set(Math.floor(timestamp * 1000), frame); // Store with ms precision
      }

      if (onProgress) {
        onProgress((i / timestamps.length) * 100);
      }
    }

    console.log(`✅ Pre-rendered ${this.frameBuffer.size} key frames`);
  }

  /**
   * Render frame at specific timestamp with optimized seeking
   */
  async renderFrameAtTime(timestamp: number): Promise<VideoFrame | null> {
    // Check if frame is already buffered
    const bufferedFrame = this.frameBuffer.get(Math.floor(timestamp * 1000));
    if (bufferedFrame) {
      return bufferedFrame;
    }

    // Clear canvas
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let hasContent = false;

    // Render active clips at this timestamp
    for (const clip of this.videoClips) {
      if (timestamp >= clip.startTime && timestamp < clip.endTime) {
        const success = await this.renderVideoClip(clip, timestamp);
        if (success) {
          hasContent = true;
        }
      }
    }

    if (!hasContent) {
      return null;
    }

    // Capture frame data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    return {
      timestamp,
      imageData
    };
  }

  /**
   * Render a single video clip with optimized seeking
   */
  private async renderVideoClip(clip: VideoClip, currentTime: number): Promise<boolean> {
    const { videoElement, startTime, trimStart } = clip;
    
    if (!videoElement || videoElement.readyState < 2) {
      return false;
    }

    const videoTime = currentTime - startTime + trimStart;
    
    // Optimized seeking - only seek if necessary and with tolerance
    const seekTolerance = 0.05; // 50ms tolerance
    if (Math.abs(videoElement.currentTime - videoTime) > seekTolerance) {
      videoElement.currentTime = Math.max(0, Math.min(videoTime, videoElement.duration));
      
      // Wait for seek to complete with timeout
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 100); // 100ms timeout
        
        const onSeeked = () => {
          clearTimeout(timeout);
          videoElement.removeEventListener('seeked', onSeeked);
          resolve();
        };
        
        videoElement.addEventListener('seeked', onSeeked);
      });
    }

    // Render video with aspect ratio preservation
    this.drawVideoWithAspectRatio(videoElement);
    return true;
  }

  /**
   * Draw video maintaining aspect ratio
   */
  private drawVideoWithAspectRatio(video: HTMLVideoElement): void {
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = this.canvas.width / this.canvas.height;

    let drawWidth, drawHeight, drawX, drawY;

    if (videoAspect > canvasAspect) {
      // Video is wider - crop sides
      drawHeight = this.canvas.height;
      drawWidth = drawHeight * videoAspect;
      drawX = (this.canvas.width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Video is taller - crop top/bottom
      drawWidth = this.canvas.width;
      drawHeight = drawWidth / videoAspect;
      drawX = 0;
      drawY = (this.canvas.height - drawHeight) / 2;
    }

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
    this.ctx.restore();
  }

  /**
   * Create optimized video element
   */
  private async createOptimizedVideoElement(mediaItem: MediaItem): Promise<HTMLVideoElement> {
    const video = document.createElement("video");
    video.muted = true; // Always mute for video rendering
    video.preload = "metadata";
    video.playsInline = true;

    if (mediaItem.file && mediaItem.file instanceof File) {
      video.src = URL.createObjectURL(mediaItem.file);
    } else if (mediaItem.url) {
      video.src = mediaItem.url;
      video.crossOrigin = "anonymous";
    }

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error(`Failed to load video: ${mediaItem.name}`));
      video.load();
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error(`Video load timeout: ${mediaItem.name}`)), 10000);
    });

    return video;
  }

  /**
   * Get canvas stream for MediaRecorder
   */
  getVideoStream(frameRate: number = 30): MediaStream {
    return this.canvas.captureStream(frameRate);
  }

  /**
   * Generate optimal keyframe timestamps for pre-rendering
   */
  generateKeyFrameTimestamps(totalDuration: number, frameRate: number = 30): number[] {
    const timestamps: number[] = [];
    const interval = 1 / frameRate; // Frame interval in seconds
    
    // Generate timestamps at regular intervals
    for (let t = 0; t < totalDuration; t += interval) {
      timestamps.push(t);
    }
    
    // Add clip boundaries for better seeking
    for (const clip of this.videoClips) {
      timestamps.push(clip.startTime);
      timestamps.push(clip.endTime);
    }
    
    // Sort and deduplicate
    return [...new Set(timestamps)].sort((a, b) => a - b);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Cleanup video elements
    for (const clip of this.videoClips) {
      if (clip.videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(clip.videoElement.src);
      }
      clip.videoElement.remove();
    }

    // Clear frame buffer
    this.frameBuffer.clear();
    
    console.log('🎬 Buffered video renderer cleaned up');
  }
}