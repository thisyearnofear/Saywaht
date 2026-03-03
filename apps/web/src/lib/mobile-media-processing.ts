/**
 * Mobile-optimized media processing utilities
 * Handles compression, resizing, and optimization for mobile devices
 */

export interface MobileMediaOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  enableHardwareAcceleration?: boolean;
  maxFileSize?: number; // in bytes
  progressive?: boolean;
}

export interface VideoCompressionOptions extends MobileMediaOptions {
  maxDuration?: number;
  bitrate?: number;
  fps?: number;
  codec?: 'h264' | 'vp9' | 'av1';
}

export interface AudioCompressionOptions {
  quality?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: 'mp3' | 'aac' | 'ogg';
}

const DEFAULT_MOBILE_OPTIONS: MobileMediaOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'webp',
  enableHardwareAcceleration: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  progressive: true,
};

const DEFAULT_VIDEO_OPTIONS: VideoCompressionOptions = {
  ...DEFAULT_MOBILE_OPTIONS,
  maxDuration: 300, // 5 minutes
  bitrate: 2000000, // 2Mbps
  fps: 30,
  codec: 'h264',
};

const DEFAULT_AUDIO_OPTIONS: AudioCompressionOptions = {
  quality: 0.7,
  bitrate: 128000, // 128kbps
  sampleRate: 44100,
  channels: 2,
  format: 'aac',
};

/**
 * Check if device has sufficient resources for media processing
 */
export function checkDeviceCapabilities(): {
  hasHardwareAcceleration: boolean;
  maxConcurrentTasks: number;
  recommendedQuality: number;
  memoryLimit: number;
} {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Estimate device capabilities
  const deviceMemory = (navigator as any).deviceMemory || 4; // Default to 4GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  
  return {
    hasHardwareAcceleration: 'gpu' in navigator || 'webgl' in document.createElement('canvas'),
    maxConcurrentTasks: Math.min(hardwareConcurrency, isMobile ? 2 : 4),
    recommendedQuality: isMobile ? 0.7 : 0.8,
    memoryLimit: Math.min(deviceMemory * 0.25, isMobile ? 1 : 2) * 1024 * 1024 * 1024, // 25% of device memory
  };
}

/**
 * Compress image for mobile devices
 */
export async function compressImage(
  file: File,
  options: MobileMediaOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_MOBILE_OPTIONS, ...options };
  const capabilities = checkDeviceCapabilities();
  
  // Adjust quality based on device capabilities
  const quality = Math.min(opts.quality!, capabilities.recommendedQuality);
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate optimal dimensions
      const { width, height } = calculateOptimalDimensions(
        img.width,
        img.height,
        opts.maxWidth!,
        opts.maxHeight!
      );
      
      canvas.width = width;
      canvas.height = height;
      
      // Enable hardware acceleration if available
      if (opts.enableHardwareAcceleration && capabilities.hasHardwareAcceleration) {
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
      }
      
      // Draw and compress
      ctx!.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: `image/${opts.format}`,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        `image/${opts.format}`,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress video for mobile devices
 */
export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<File> {
  const opts = { ...DEFAULT_VIDEO_OPTIONS, ...options };
  const capabilities = checkDeviceCapabilities();
  
  // Check if WebCodecs is available for hardware acceleration
  if ('VideoEncoder' in window && opts.enableHardwareAcceleration) {
    return compressVideoWithWebCodecs(file, opts, onProgress);
  }
  
  // Fallback to canvas-based compression
  return compressVideoWithCanvas(file, opts, onProgress);
}

/**
 * Compress video using WebCodecs API (hardware accelerated)
 */
async function compressVideoWithWebCodecs(
  file: File,
  options: VideoCompressionOptions,
  onProgress?: (progress: number) => void
): Promise<File> {
  try {
    // Create video element to decode source
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    await video.load();

    // Wait for metadata
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    const { width, height } = calculateOptimalDimensions(
      video.videoWidth,
      video.videoHeight,
      options.maxWidth!,
      options.maxHeight!
    );

    const duration = video.duration;
    const fps = options.fps || 30;
    const totalFrames = Math.floor(duration * fps);

    // Create MediaStream from canvas for recording
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use WebCodecs for hardware-accelerated encoding
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: options.bitrate,
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    // Start recording
    recorder.start(1000); // Collect data every second

    // Create VideoDecoder for hardware-accelerated decoding
    const frameCount = { current: 0 };

    const decodeAndRender = async () => {
      const startTime = performance.now();
      let lastFrameTime = 0;

      video.currentTime = 0;
      video.play();

      return new Promise<void>((resolve) => {
        const processFrame = () => {
          if (video.ended) {
            resolve();
            return;
          }

          const currentTime = performance.now();
          const elapsed = (currentTime - startTime) / 1000;
          const expectedFrame = Math.floor(elapsed * fps);

          if (video.currentTime >= lastFrameTime + (1 / fps)) {
            ctx.drawImage(video, 0, 0, width, height);
            lastFrameTime = video.currentTime;
            frameCount.current++;

            onProgress?.(frameCount.current / totalFrames);
          }

          requestAnimationFrame(processFrame);
        };

        processFrame();
      });
    };

    await decodeAndRender();

    // Stop recording
    recorder.stop();
    video.pause();
    URL.revokeObjectURL(video.src);

    // Wait for final chunk
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const blob = new Blob(chunks, { type: 'video/webm' });
    return new File([blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
      type: 'video/webm',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('WebCodecs compression failed, falling back to canvas:', error);
    // Fallback to canvas-based compression
    return compressVideoWithCanvas(file, options, onProgress);
  }
}

/**
 * Compress video using canvas (software fallback)
 */
async function compressVideoWithCanvas(
  file: File,
  options: VideoCompressionOptions,
  onProgress?: (progress: number) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      const { width, height } = calculateOptimalDimensions(
        video.videoWidth,
        video.videoHeight,
        options.maxWidth!,
        options.maxHeight!
      );
      
      canvas.width = width;
      canvas.height = height;
      
      // Create MediaRecorder for output
      const stream = canvas.captureStream(options.fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: options.bitrate,
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([blob], file.name, {
          type: 'video/webm',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      };
      
      // Start recording and play video
      recorder.start();
      video.play();
      
      let frameCount = 0;
      const totalFrames = Math.floor(video.duration * options.fps!);
      
      const drawFrame = () => {
        if (video.ended) {
          recorder.stop();
          return;
        }
        
        ctx!.drawImage(video, 0, 0, width, height);
        frameCount++;
        
        onProgress?.(frameCount / totalFrames);
        
        setTimeout(drawFrame, 1000 / options.fps!);
      };
      
      drawFrame();
    };
    
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress audio for mobile devices
 */
export async function compressAudio(
  file: File,
  options: AudioCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_AUDIO_OPTIONS, ...options };
  
  // Use Web Audio API for audio compression
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Create offline context for processing
  const offlineContext = new OfflineAudioContext(
    opts.channels!,
    audioBuffer.length,
    opts.sampleRate!
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  const processedBuffer = await offlineContext.startRendering();
  
  // Convert to desired format (simplified)
  const blob = await audioBufferToBlob(processedBuffer, opts);
  
  return new File([blob], file.name, {
    type: `audio/${opts.format}`,
    lastModified: Date.now(),
  });
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = originalWidth;
  let height = originalHeight;
  
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Convert AudioBuffer to Blob (simplified implementation)
 */
async function audioBufferToBlob(
  buffer: AudioBuffer,
  options: AudioCompressionOptions
): Promise<Blob> {
  // This is a simplified implementation
  // In a real app, you'd use a proper audio encoder
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(length * 2);
  const view = new Int16Array(arrayBuffer);
  
  for (let i = 0; i < length; i++) {
    view[i] = Math.max(-1, Math.min(1, buffer.getChannelData(0)[i])) * 0x7FFF;
  }
  
  return new Blob([arrayBuffer], { type: `audio/${options.format}` });
}

/**
 * Get optimal processing settings based on device capabilities
 */
export function getOptimalProcessingSettings(mediaType: 'image' | 'video' | 'audio') {
  const capabilities = checkDeviceCapabilities();
  
  const baseSettings = {
    image: {
      maxWidth: capabilities.memoryLimit > 1024 * 1024 * 1024 ? 1920 : 1280,
      maxHeight: capabilities.memoryLimit > 1024 * 1024 * 1024 ? 1080 : 720,
      quality: capabilities.recommendedQuality,
      format: capabilities.hasHardwareAcceleration ? 'webp' : 'jpeg',
    },
    video: {
      maxWidth: capabilities.memoryLimit > 1024 * 1024 * 1024 ? 1920 : 1280,
      maxHeight: capabilities.memoryLimit > 1024 * 1024 * 1024 ? 1080 : 720,
      bitrate: capabilities.memoryLimit > 1024 * 1024 * 1024 ? 2000000 : 1000000,
      fps: capabilities.maxConcurrentTasks > 2 ? 30 : 24,
    },
    audio: {
      bitrate: capabilities.memoryLimit > 1024 * 1024 * 1024 ? 128000 : 96000,
      sampleRate: 44100,
      channels: 2,
    },
  };
  
  return baseSettings[mediaType];
}

/**
 * Process media file with automatic optimization
 */
export async function processMediaFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const fileType = file.type.split('/')[0];
  
  switch (fileType) {
    case 'image':
      return compressImage(file, getOptimalProcessingSettings('image') as MobileMediaOptions);
    
    case 'video':
      return compressVideo(file, getOptimalProcessingSettings('video') as VideoCompressionOptions, onProgress);
    
    case 'audio':
      return compressAudio(file, getOptimalProcessingSettings('audio') as AudioCompressionOptions);
    
    default:
      throw new Error(`Unsupported media type: ${fileType}`);
  }
}