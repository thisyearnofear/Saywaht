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
  lastSeekTime?: number; // Cache last seek to avoid redundant seeks
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
    
    // Additional optimizations for video rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    // Ensure we're using the best possible rendering
    (this.ctx as any).filter = 'none'; // Disable any browser filtering
  }

  /**
   * Initialize video elements for on-demand rendering (no pre-extraction)
   */
  async initialize(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('🎬 Initializing video renderer...');
    
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

    console.log(`📹 Found ${videoClips.length} video clips`);

    // Store clip data without extracting frames
    for (const clipInfo of videoClips) {
      this.videoClips.push({
        ...clipInfo,
        extractedFrames: {
          frames: [], // No pre-extracted frames
          duration: clipInfo.mediaItem.duration || 0,
          frameRate: 30
        }
      });
    }

    // Pre-load video elements for faster seeking
    const uniqueVideos = new Map<string, MediaItem>();
    videoClips.forEach(clip => {
      uniqueVideos.set(clip.mediaItem.id, clip.mediaItem);
    });

    const loadPromises = Array.from(uniqueVideos.values()).map(async (mediaItem) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto'; // Full preload for better performance
      video.muted = true;
      video.playsInline = true; // Better mobile support
      video.disablePictureInPicture = true; // Prevent interference

      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          video.removeEventListener('canplaythrough', onCanPlayThrough);
          video.removeEventListener('error', onError);
          video.removeEventListener('loadeddata', onLoadedData);
        };

        // Wait for video to be fully ready with enough data
        const onCanPlayThrough = () => {
          // Store video element for reuse
          (mediaItem as any)._videoElement = video;
          console.log(`✅ Video ready: ${mediaItem.name} (readyState: ${video.readyState})`);
          cleanup();
          resolve();
        };

        const onLoadedData = () => {
          // Fallback if canplaythrough doesn't fire
          if (video.readyState >= 2) {
            (mediaItem as any)._videoElement = video;
            console.log(`✅ Video ready: ${mediaItem.name} (readyState: ${video.readyState})`);
            cleanup();
            resolve();
          }
        };

        const onError = () => {
          cleanup();
          reject(new Error(`Failed to load video: ${mediaItem.name}`));
        };

        video.addEventListener('canplaythrough', onCanPlayThrough);
        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);

        // Timeout fallback
        setTimeout(() => {
          if (!resolved && video.readyState >= 2) {
            (mediaItem as any)._videoElement = video;
            console.log(`✅ Video ready: ${mediaItem.name} (readyState: ${video.readyState})`);
            cleanup();
            resolve();
          } else if (!resolved) {
            cleanup();
            reject(new Error(`Video load timeout: ${mediaItem.name}`));
          }
        }, 10000); // 10 second timeout

        // Start loading
        video.src = mediaItem.url;
        video.load(); // Explicitly start loading
      });
    });

    await Promise.all(loadPromises);
    console.log(`✅ Pre-loaded ${uniqueVideos.size} videos with full data`);
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
      const extractionCtx = extractionCanvas.getContext('2d', {
        willReadFrequently: true, // Fix the performance warning
        alpha: false, // No transparency needed for video
        desynchronized: true // Allow async rendering
      });
      
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

        // Optimize canvas for extraction
        extractionCtx.imageSmoothingEnabled = false; // Faster extraction
        
        const totalFrames = Math.ceil(video.duration * targetFrameRate);
        
        // Use requestVideoFrameCallback for frame-perfect extraction
        if ('requestVideoFrameCallback' in video) {
          console.log(`🎬 Using requestVideoFrameCallback for frame extraction`);
          
          let callbackTimeout: NodeJS.Timeout | null = null;
          let lastProgressTime = Date.now();
          
          const extractFrame = () => {
            // Reset timeout - callback is still firing
            if (callbackTimeout) clearTimeout(callbackTimeout);
            lastProgressTime = Date.now();
            
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
              // Set a short timeout to detect if callback stops firing
              callbackTimeout = setTimeout(() => {
                console.warn(`⚠️ requestVideoFrameCallback stalled at ${frames.length}/${totalFrames} frames, falling back to seeked events`);
                clearTimeout(timeout);
                // Fall back to seeked-based extraction
                fallbackToSeekEvents();
              }, 3000); // 3 second timeout if callback doesn't fire
              
              // Seek to next frame
              video.currentTime = nextTimestamp;
              // @ts-ignore - requestVideoFrameCallback not in types yet
              video.requestVideoFrameCallback(extractFrame);
            } else {
              // Extraction complete
              if (callbackTimeout) clearTimeout(callbackTimeout);
              clearTimeout(timeout);
              console.log(`✅ Frame extraction completed: ${frames.length} frames`);
              resolve({
                frames,
                duration: video.duration,
                frameRate: targetFrameRate
              });
            }
          };

          // Fallback function
          const fallbackToSeekEvents = async () => {
            console.log(`🔄 Switching to seeked-based extraction from frame ${frames.length}/${totalFrames}`);
            
            const extractFrameAtTime = async (timestamp: number) => {
              return new Promise<void>((resolveFrame) => {
                const onSeeked = () => {
                  video.removeEventListener('seeked', onSeeked);
                  extractionCtx.drawImage(video, 0, 0);
                  const imageData = extractionCtx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height);
                  frames.push({
                    imageData: imageData,
                    timestamp: video.currentTime
                  });
                  resolveFrame();
                };
                video.addEventListener('seeked', onSeeked);
                video.currentTime = timestamp;
              });
            };

            // Continue from where we left off
            for (let i = frames.length; i < totalFrames; i++) {
              const timestamp = i / targetFrameRate;
              await extractFrameAtTime(Math.min(timestamp, video.duration - 0.01));
              onProgress?.((i / totalFrames) * 100);
            }

            clearTimeout(timeout);
            resolve({
              frames,
              duration: video.duration,
              frameRate: targetFrameRate
            });
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
   * Phase 1: Extract all frames from video clips
   */
  async extractAllFrames(onProgress?: (progress: number) => void): Promise<void> {
    console.log('🎬 Starting frame extraction for all video clips...');

    const uniqueVideos = new Map<string, MediaItem>();
    this.videoClips.forEach(clip => {
      uniqueVideos.set(clip.mediaItem.id, clip.mediaItem);
    });

    const videoArray = Array.from(uniqueVideos.values());
    let completedVideos = 0;

    for (const mediaItem of videoArray) {
      console.log(`🎬 Extracting frames from: ${mediaItem.name}`);

      const extractedFrames = await this.extractAllVideoFrames(mediaItem, (videoProgress) => {
        // Calculate overall progress
        const overallProgress = ((completedVideos / videoArray.length) * 100) +
                               ((videoProgress / videoArray.length));
        onProgress?.(overallProgress);
      });

      // Update all clips that use this video
      this.videoClips.forEach(clip => {
        if (clip.mediaItem.id === mediaItem.id) {
          clip.extractedFrames = extractedFrames;
        }
      });

      completedVideos++;
    }

    console.log(`✅ Frame extraction completed for ${videoArray.length} videos`);
  }

  /**
   * Phase 2: Pre-compose all timeline frames from extracted data
   * ENHANCEMENT: Uses batch composition with smart caching
   */
   async preComposeAllFrames(
     totalDuration: number,
     frameRate: number,
     onProgress?: (progress: number) => void
   ): Promise<void> {
     console.log('🎨 Starting offline frame composition...');

     const totalFrames = Math.ceil(totalDuration * frameRate);
     const batchSize = 10; // Compose in batches for better performance
     let composedCount = 0;

     for (let batchStart = 0; batchStart < totalFrames; batchStart += batchSize) {
       const batchEnd = Math.min(batchStart + batchSize, totalFrames);
       
       // ENHANCEMENT: Parallel composition within batch
       const batchPromises = [];
       for (let frameIndex = batchStart; frameIndex < batchEnd; frameIndex++) {
         const timestamp = frameIndex / frameRate;
         
         batchPromises.push(
           this.composeFrameAtTime(timestamp).then(compositeFrame => ({
             frameIndex,
             frame: compositeFrame || (() => {
               // Store blank frame for frames with no content
               clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
               return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
             })()
           }))
         );
       }

       // Wait for batch to complete
       const batchResults = await Promise.all(batchPromises);
       for (const { frameIndex, frame } of batchResults) {
         this.compositeFrames.set(frameIndex, frame);
         composedCount++;
       }

       onProgress?.((composedCount / totalFrames) * 100);

       // Yield to browser between batches
       await yieldToBrowser();
     }

     console.log(`✅ Pre-composed ${this.compositeFrames.size} timeline frames`);
   }

  /**
   * Compose a single frame at a specific index (on-demand rendering)
   */
  async composeSingleFrame(
    frameIndex: number,
    frameRate: number
  ): Promise<ImageData | null> {
    const timestamp = frameIndex / frameRate;
    
    // Clear canvas
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
    
    let hasContent = false;

    // Find active clips at this timestamp
    for (const clip of this.videoClips) {
      if (timestamp >= clip.startTime && timestamp < clip.endTime) {
        const videoTime = Math.max(0, timestamp - clip.startTime + clip.trimStart);
        const video = (clip.mediaItem as any)._videoElement as HTMLVideoElement;
        
        if (video) {
          // More precise seeking threshold (1 frame at 30fps = 0.033s)
          const seekThreshold = 1 / 30;

          // ENHANCEMENT: Skip seek if already at target time (common in sequential frames)
          if (Math.abs(video.currentTime - videoTime) <= seekThreshold) {
            if (video.readyState >= 2) {
              drawWithAspectRatio(this.ctx, video, this.canvas.width, this.canvas.height);
              hasContent = true;
            }
            continue;
          }

          // Ensure video is ready first before seeking
          const videoReady = await this.ensureVideoReady(video, videoTime);
          if (!videoReady) {
            console.warn(`Video failed to become ready at time ${videoTime}`);
            continue;
          }

          // Seek to target time
          if (Math.abs(video.currentTime - videoTime) > seekThreshold) {
            // Store the target time to avoid race conditions
            const targetTime = videoTime;
            video.currentTime = targetTime;

            // Wait for seek to complete with better timing
            await new Promise<void>((resolve) => {
              let seekTimeout: NodeJS.Timeout;
              let resolved = false;
              let checkInterval: NodeJS.Timeout | null = null;

              const cleanup = () => {
                if (resolved) return;
                resolved = true;
                video.removeEventListener('seeked', onSeeked);
                video.removeEventListener('loadeddata', onLoadedData);
                clearTimeout(seekTimeout);
                if (checkInterval) clearInterval(checkInterval);
              };

              const onSeeked = () => {
                // Check if we're at the right time (within threshold)
                if (Math.abs(video.currentTime - targetTime) <= seekThreshold) {
                  cleanup();
                  resolve();
                }
              };

              const onLoadedData = () => {
                // Data is available, check if we're at the right time
                if (Math.abs(video.currentTime - targetTime) <= seekThreshold) {
                  cleanup();
                  resolve();
                }
              };

              video.addEventListener('seeked', onSeeked);
              video.addEventListener('loadeddata', onLoadedData);

              // Periodically check if we're close enough (for browsers that don't fire events reliably)
              checkInterval = setInterval(() => {
                if (Math.abs(video.currentTime - targetTime) <= seekThreshold && video.readyState >= 2) {
                  cleanup();
                  resolve();
                }
              }, 10);

              // Timeout to prevent hanging
              seekTimeout = setTimeout(() => {
                cleanup();
                resolve();
              }, 200);
            });
          }
          
          // Final readiness check with extended waiting
          const frameReady = await this.ensureVideoFrameReady(video, videoTime, 30);
          
          // Draw if ready
          if (frameReady && video.readyState >= 2) {
            // Draw video frame with high quality
            drawWithAspectRatio(this.ctx, video, this.canvas.width, this.canvas.height);
            hasContent = true;
          } else if (video.readyState >= 2) {
            // Even if frame might not be perfect, try drawing
            drawWithAspectRatio(this.ctx, video, this.canvas.width, this.canvas.height);
            hasContent = true;
          } else {
            console.warn(`Video not ready for drawing at time ${videoTime}, readyState: ${video.readyState}`);
          }
        }
      }
    }

    // Always return frame data - either with content or blank
    // This ensures composeSingleFrame never returns null, preventing black flashing
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Helper: Ensure video element is ready for use
   */
  private async ensureVideoReady(video: HTMLVideoElement, targetTime: number): Promise<boolean> {
    // If already at a valid readyState, return immediately
    if (video.readyState >= 2) {
      return true;
    }

    // Wait for video to become ready
    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // More attempts for reliability

      const checkReady = () => {
        attempts++;
        if (video.readyState >= 2) {
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.error(`Video failed to become ready after ${maxAttempts} attempts at time ${targetTime}`);
          resolve(false);
        } else {
          setTimeout(checkReady, 20);
        }
      };

      checkReady();
    });
  }

  /**
   * Helper: Ensure video has the current frame available
   */
  private async ensureVideoFrameReady(video: HTMLVideoElement, targetTime: number, maxAttempts: number = 20): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let attempts = 0;
      const seekThreshold = 1 / 30;

      const checkFrame = () => {
        attempts++;
        
        // Check if we're at the right time and have frame data
        if (Math.abs(video.currentTime - targetTime) <= seekThreshold && video.readyState >= 2) {
          resolve(true);
        } else if (attempts >= maxAttempts) {
          // Give up but don't fail completely
          resolve(false);
        } else {
          setTimeout(checkFrame, 15);
        }
      };

      checkFrame();
    });
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

    // Always return frame data - either with content or blank
    // This ensures composeFrameAtTime never returns null, preventing black flashing
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
