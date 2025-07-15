import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { drawWithAspectRatio, setupHighQualityCanvas, clearCanvas, yieldToBrowser } from "./video-utils";

interface VideoFrameData {
  imageData: ImageData;
  timestamp: number;
}

interface ExtractedVideoFrames {
  frames: VideoFrameData[];
  duration: number;
  frameRate: number;
}

interface VideoClipData {
  mediaItem: MediaItem;
  extractedFrames: ExtractedVideoFrames;
  startTime: number;
  endTime: number;
  trimStart: number;
  trimEnd: number;
}

/**
 * True Offline Video Renderer - No Real-Time Dependencies
 * 
 * This renderer works in two phases:
 * 1. EXTRACTION: Extract all video frames upfront (no seeking during export)
 * 2. COMPOSITION: Composite timeline frames from pre-extracted data
 */
export class OfflineVideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoClips: VideoClipData[] = [];
  private compositeFrames: Map<number, ImageData> = new Map();

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    // Use shared utility for high-quality canvas setup
    this.ctx = setupHighQualityCanvas(this.canvas);
  }

  /**
   * Phase 1: Extract all video frames upfront (no real-time seeking)
   */
  async initialize(
    tracks: TimelineTrack[], 
    mediaItems: MediaItem[], 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('🎬 Starting offline video frame extraction...');
    
    // Find all video clips in timeline
    const videoClips: Array<{
      mediaItem: MediaItem;
      startTime: number;
      endTime: number;
      trimStart: number;
      trimEnd: number;
    }> = [];

    for (const track of tracks) {
      if (track.muted) continue;
      
      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (mediaItem && mediaItem.type === 'video') {
          videoClips.push({
            mediaItem,
            startTime: clip.startTime,
            endTime: clip.startTime + clip.duration,
            trimStart: clip.trimStart || 0,
            trimEnd: clip.trimEnd || 0
          });
        }
      }
    }

    console.log(`📹 Found ${videoClips.length} video clips to extract`);

    // Extract frames from each unique video file
    const uniqueVideos = new Map<string, MediaItem>();
    videoClips.forEach(clip => {
      uniqueVideos.set(clip.mediaItem.id, clip.mediaItem);
    });

    let processedVideos = 0;
    const totalVideos = uniqueVideos.size;

    for (const [videoId, mediaItem] of Array.from(uniqueVideos)) {
      console.log(`🎬 Extracting frames from: ${mediaItem.name}`);
      
      const extractedFrames = await this.extractAllVideoFrames(mediaItem, (extractProgress) => {
        const overallProgress = ((processedVideos + (extractProgress / 100)) / totalVideos) * 100;
        onProgress?.(overallProgress);
      });

      // Create video clip data for all clips using this video
      const clipsUsingThisVideo = videoClips.filter(clip => clip.mediaItem.id === videoId);
      for (const clipInfo of clipsUsingThisVideo) {
        this.videoClips.push({
          ...clipInfo,
          extractedFrames
        });
      }

      processedVideos++;
    }

    console.log(`✅ Extracted frames from ${totalVideos} videos`);
  }

  /**
   * Extract all frames from a video file without any real-time seeking
   */
  private async extractAllVideoFrames(
    mediaItem: MediaItem,
    onProgress?: (progress: number) => void
  ): Promise<ExtractedVideoFrames> {
    return new Promise((resolve, reject) => {
      // Add timeout to prevent infinite stalling
      const timeout = setTimeout(() => {
        reject(new Error(`Frame extraction timeout for ${mediaItem.name} after 5 minutes`));
      }, 5 * 60 * 1000); // 5 minute timeout
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
      const extractionCanvas = document.createElement('canvas');
      const extractionCtx = extractionCanvas.getContext('2d');
      
      if (!extractionCtx) {
        reject(new Error('Failed to create extraction canvas context'));
        return;
      }

      const frames: VideoFrameData[] = [];
      const targetFrameRate = 30; // Extract at 30fps
      let currentFrameIndex = 0;

      video.onloadedmetadata = () => {
        console.log(`📊 Video loaded: ${mediaItem.name} (${video.duration}s, ${video.videoWidth}x${video.videoHeight})`);
        
        extractionCanvas.width = video.videoWidth;
        extractionCanvas.height = video.videoHeight;

        // Optimize canvas for frequent reads
        extractionCtx.imageSmoothingEnabled = false; // Faster extraction
        if ('willReadFrequently' in extractionCanvas) {
          // @ts-ignore - willReadFrequently is newer API
          extractionCanvas.willReadFrequently = true;
        }
        
        const totalFrames = Math.ceil(video.duration * targetFrameRate);
        
        // Use requestVideoFrameCallback for frame-perfect extraction
        if ('requestVideoFrameCallback' in video) {
          console.log(`🎬 Using requestVideoFrameCallback for frame extraction`);
          
          const extractFrame = () => {
            // Draw current frame to extraction canvas
            extractionCtx.drawImage(video, 0, 0);
            const imageData = extractionCtx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height);
            
            frames.push({
              imageData: imageData,
              timestamp: video.currentTime
            });

            const progress = (frames.length / totalFrames) * 100;
            onProgress?.(progress);

            // Log progress every 10%
            if (frames.length % Math.ceil(totalFrames / 10) === 0) {
              console.log(`📊 Extracted ${frames.length}/${totalFrames} frames (${progress.toFixed(1)}%)`);
            }

            currentFrameIndex++;
            const nextTimestamp = currentFrameIndex / targetFrameRate;

            if (nextTimestamp < video.duration) {
              // Yield to browser every 5 frames to prevent stalling
              if (currentFrameIndex % 5 === 0) {
                setTimeout(() => {
                  video.currentTime = nextTimestamp;
                  // @ts-ignore - requestVideoFrameCallback not in types yet
                  video.requestVideoFrameCallback(extractFrame);
                }, 0);
              } else {
                video.currentTime = nextTimestamp;
                // @ts-ignore - requestVideoFrameCallback not in types yet
                video.requestVideoFrameCallback(extractFrame);
              }
            } else {
              // Extraction complete
              clearTimeout(timeout);
              console.log(`✅ Frame extraction completed: ${frames.length} frames`);
              resolve({
                frames,
                duration: video.duration,
                frameRate: targetFrameRate
              });
            }
          };

          // Start extraction
          video.currentTime = 0;
          // @ts-ignore - requestVideoFrameCallback not in types yet
          video.requestVideoFrameCallback(extractFrame);
          
        } else {
          // Fallback: Use seeked events (less reliable but compatible)
          console.log(`🎬 Using seeked events for frame extraction (fallback)`);
          
          const extractFrameAtTime = async (timestamp: number) => {
            return new Promise<void>((resolveFrame) => {
              const videoElement: HTMLVideoElement = video; // Explicit type to avoid narrowing issues

              const onSeeked = () => {
                videoElement.removeEventListener('seeked', onSeeked);

                // Draw frame
                extractionCtx.drawImage(videoElement, 0, 0);
                const imageData = extractionCtx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height);

                frames.push({
                  imageData: imageData,
                  timestamp: videoElement.currentTime
                });

                resolveFrame();
              };

              videoElement.addEventListener('seeked', onSeeked);
              videoElement.currentTime = timestamp;
            });
          };

          // Extract frames sequentially
          const extractSequentially = async () => {
            const videoElement: HTMLVideoElement = video; // Explicit type to avoid narrowing issues
            const totalFrames = Math.ceil(videoElement.duration * targetFrameRate);

            for (let i = 0; i < totalFrames; i++) {
              const timestamp = i / targetFrameRate;
              await extractFrameAtTime(Math.min(timestamp, videoElement.duration - 0.01));

              onProgress?.((i / totalFrames) * 100);
            }

            resolve({
              frames,
              duration: videoElement.duration,
              frameRate: targetFrameRate
            });
          };

          extractSequentially().catch(reject);
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load video: ${mediaItem.name}`));
      };

      // Start loading
      video.src = mediaItem.url;
    });
  }

  /**
   * Phase 2: Pre-compose all timeline frames from extracted data
   */
  async preComposeAllFrames(
    totalDuration: number,
    frameRate: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('🎨 Starting offline frame composition...');
    
    const totalFrames = Math.ceil(totalDuration * frameRate);
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const timestamp = frameIndex / frameRate;
      const compositeFrame = await this.composeFrameAtTime(timestamp);
      
      if (compositeFrame) {
        this.compositeFrames.set(frameIndex, compositeFrame);
      }

      onProgress?.((frameIndex / totalFrames) * 100);

      // Yield to browser every 10 frames
      if (frameIndex % 10 === 0) {
        await yieldToBrowser();
      }
    }

    console.log(`✅ Pre-composed ${this.compositeFrames.size} timeline frames`);
  }

  /**
   * Compose a single frame at a specific index
   */
  async composeSingleFrame(
    frameIndex: number,
    frameRate: number
  ): Promise<ImageData | null> {
    // Check if already composed
    const existing = this.compositeFrames.get(frameIndex);
    if (existing) {
      return existing;
    }

    // Compose the frame
    const timestamp = frameIndex / frameRate;
    const compositeFrame = await this.composeFrameAtTime(timestamp);
    
    if (compositeFrame) {
      this.compositeFrames.set(frameIndex, compositeFrame);
    }

    return compositeFrame;
  }

  /**
   * Compose a single frame at timestamp from pre-extracted video data
   */
  private async composeFrameAtTime(timestamp: number): Promise<ImageData | null> {
    // Clear canvas with shared utility
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    let hasContent = false;

    // Find active clips at this timestamp
    const activeClips = this.videoClips.filter(clip => 
      timestamp >= clip.startTime && timestamp < clip.endTime
    );

    for (const clip of activeClips) {
      const success = this.renderClipFromExtractedFrames(clip, timestamp);
      if (success) {
        hasContent = true;
      }
    }

    if (!hasContent) {
      return null;
    }

    // Return composed frame
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render clip from pre-extracted frames (no seeking required)
   */
  private renderClipFromExtractedFrames(clip: VideoClipData, currentTime: number): boolean {
    const videoTime = Math.max(0, currentTime - clip.startTime + clip.trimStart);
    
    // Find the closest extracted frame
    const targetFrame = clip.extractedFrames.frames.find(frame => 
      Math.abs(frame.timestamp - videoTime) < (1 / clip.extractedFrames.frameRate)
    );

    if (!targetFrame) {
      return false;
    }

    // Create temporary canvas to draw the extracted frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetFrame.imageData.width;
    tempCanvas.height = targetFrame.imageData.height;
    
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return false;

    tempCtx.putImageData(targetFrame.imageData, 0, 0);

    // Draw to main canvas with aspect ratio using shared utility
    drawWithAspectRatio(this.ctx, tempCanvas, this.canvas.width, this.canvas.height);
    
    return true;
  }

  // drawWithAspectRatio function moved to video-utils.ts for DRY code

  /**
   * Get pre-composed frame for export (instant access)
   */
  getComposedFrame(frameIndex: number): ImageData | null {
    return this.compositeFrames.get(frameIndex) || null;
  }

  /**
   * Render composed frame to canvas for MediaRecorder
   */
  renderComposedFrame(frameIndex: number): boolean {
    const frame = this.getComposedFrame(frameIndex);
    if (!frame) return false;

    this.ctx.putImageData(frame, 0, 0);
    return true;
  }

  /**
   * Get canvas for MediaRecorder stream
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.videoClips = [];
    this.compositeFrames.clear();
  }
}
