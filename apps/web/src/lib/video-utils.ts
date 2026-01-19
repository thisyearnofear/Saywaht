/**
 * Shared video utilities for export functions
 * Consolidates common functionality to keep codebase DRY
 */

export const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },  // 9:16 (mobile-first)
  square: { width: 1080, height: 1080 },     // 1:1 (universal)
  landscape: { width: 1920, height: 1080 }, // 16:9 (traditional)
} as const;

export type VideoFormat = "landscape" | "portrait" | "square";

/**
 * Calculate aspect ratio preserving dimensions for drawing video to canvas
 */
export function calculateAspectRatioDimensions(
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { drawWidth: number; drawHeight: number; drawX: number; drawY: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth, drawHeight, drawX, drawY;

  if (sourceAspect > canvasAspect) {
    // Source is wider - crop sides
    drawHeight = canvasHeight;
    drawWidth = drawHeight * sourceAspect;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    // Source is taller - crop top/bottom
    drawWidth = canvasWidth;
    drawHeight = drawWidth / sourceAspect;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  }

  return { drawWidth, drawHeight, drawX, drawY };
}

/**
 * Draw video/canvas to target canvas with aspect ratio preservation
 */
export function drawWithAspectRatio(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  const { drawWidth, drawHeight, drawX, drawY } = calculateAspectRatioDimensions(
    sourceWidth,
    sourceHeight,
    canvasWidth,
    canvasHeight
  );

  ctx.save();

  // Use high-quality rendering settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clear the area first for cleaner compositing
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Fill with black background for letterboxing/pillarboxing
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw the video/canvas with high quality
  ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);

  ctx.restore();
}

/**
 * Get video bitrate based on quality setting
 */
export function getVideoBitrate(quality: "low" | "medium" | "high", customBitrate?: number): number {
  if (customBitrate) return customBitrate;

  // Higher bitrates for better quality
  switch (quality) {
    case "low": return 3000000;     // 3 Mbps (increased from 2)
    case "medium": return 6000000;  // 6 Mbps (increased from 5)
    case "high": return 10000000;   // 10 Mbps (increased from 8)
    default: return 6000000;
  }
}

/**
 * Get quality bitrate (legacy function for compatibility)
 */
export function getQualityBitrate(quality: "low" | "medium" | "high"): number {
  return getVideoBitrate(quality);
}

/**
 * Setup high-quality canvas context
 */
export function setupHighQualityCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', {
    alpha: false, // Opaque canvas for better performance
    desynchronized: true, // Allow async rendering
    willReadFrequently: false // Optimize for drawing
  });

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  // Set high quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Additional quality settings
  (ctx as any).filter = 'none'; // Disable browser filtering

  return ctx;
}

/**
 * Clear canvas with black background
 */
export function clearCanvas(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Create MediaRecorder with optimal settings
 */
export function createOptimalMediaRecorder(
  stream: MediaStream,
  outputFormat: 'mp4' | 'webm',
  videoBitrate: number,
  audioBitrate: number
): MediaRecorder {
  const mimeType = outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';

  return new MediaRecorder(stream, {
    mimeType: mimeType,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate
  });
}

/**
 * Yield control to browser to prevent blocking
 */
export function yieldToBrowser(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

/**
 * Check if project has video content
 */
export function hasVideoContent(tracks: any[], mediaItems: any[]): boolean {
  return tracks.some(track =>
    track.clips.some((clip: any) => {
      const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
      return mediaItem?.type === 'video';
    })
  );
}

/**
 * Check if project has audio content
 */
export function hasAudioContent(tracks: any[], mediaItems: any[]): boolean {
  return tracks.some(track =>
    track.clips.some((clip: any) => {
      const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
      return mediaItem?.type === 'audio' || mediaItem?.type === 'video';
    })
  );
}

/**
 * Calculate total project duration
 */
export function calculateProjectDuration(tracks: any[]): number {
  if (tracks.length === 0) return 0;

  const trackEndTimes = tracks.map((track: any) =>
    track.clips.reduce((maxEnd: number, clip: any) => {
      const clipEnd = clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;
      return Math.max(maxEnd, clipEnd);
    }, 0)
  );

  return Math.max(...trackEndTimes, 0);
}

/**
 * WebCodecs support detection
 */
export function detectWebCodecsSupport(): {
  videoEncoder: boolean;
  audioEncoder: boolean;
  videoFrame: boolean;
  audioData: boolean;
  fullSupport: boolean;
} {
  const support = {
    videoEncoder: !!(typeof window !== 'undefined' && 'VideoEncoder' in window),
    audioEncoder: !!(typeof window !== 'undefined' && 'AudioEncoder' in window),
    videoFrame: !!(typeof window !== 'undefined' && 'VideoFrame' in window),
    audioData: !!(typeof window !== 'undefined' && 'AudioData' in window),
    fullSupport: false
  };

  support.fullSupport = support.videoEncoder && support.audioEncoder &&
    support.videoFrame && support.audioData;

  return support;
}

/**
 * Determine the appropriate AVC level for a given resolution.
 * AVC levels constrain bitrate, resolution, and framerate.
 * @see https://en.wikipedia.org/wiki/Advanced_Video_Coding#Levels
 */
export function getAVCLevel(width: number, height: number, frameRate: number): string {
  const megapixels = (width * height) / 1000000;
  const macroblocks = (width * height) / 256;
  const processingCapability = macroblocks * frameRate;

  // These levels are based on the H.264 specification
  if (processingCapability <= 11880 && megapixels <= 0.041) return '1b'; // 320x240@30
  if (processingCapability <= 19800 && megapixels <= 0.11) return '2.0';  // 480x320@30
  if (processingCapability <= 20250 && megapixels <= 0.11) return '2.1';  // 480x360@30
  if (processingCapability <= 40500 && megapixels <= 0.22) return '2.2';  // 640x480@30
  if (processingCapability <= 108000 && megapixels <= 0.3) return '3.0';  // 720x480@30
  if (processingCapability <= 216000 && megapixels <= 0.5) return '3.1';  // 1280x720@30
  if (processingCapability <= 245760 && megapixels <= 0.5) return '3.2';  // 1280x720@60
  if (processingCapability <= 522240 && megapixels <= 0.9) return '4.0';  // 1920x1080@30
  if (processingCapability <= 589824 && megapixels <= 0.9) return '4.1';  // 1920x1080@30
  if (processingCapability <= 983040 && megapixels <= 2.2) return '4.2';  // 1920x1080@60
  if (processingCapability <= 2073600 && megapixels <= 2.2) return '5.0'; // 1920x1080@60
  if (processingCapability <= 2073600 && megapixels <= 8.8) return '5.1'; // 3840x2160@30
  if (processingCapability <= 5652480 && megapixels <= 8.8) return '5.2'; // 4096x2160@60

  // Default to a common level if no match is found
  return '4.0';
}

/**
 * Get optimal WebCodecs codec based on browser and format
 */
export function getOptimalWebCodecsCodec(
  outputFormat: 'mp4' | 'webm',
  quality: 'low' | 'medium' | 'high',
  dimensions: { width: number, height: number },
  frameRate: number
): { video: string; audio: string } {
  // Chrome/Edge prefer different codecs than Firefox
  const isChrome = typeof window !== 'undefined' &&
    /Chrome|Chromium|Edge/.test(navigator.userAgent);

  if (outputFormat === 'mp4') {
    const avcLevel = getAVCLevel(dimensions.width, dimensions.height, frameRate);
    const avcProfile = '4200'; // Baseline profile
    return {
      video: `avc1.${avcProfile}${avcLevel}`,
      audio: 'mp4a.40.2' // AAC-LC
    };
  } else {
    return {
      video: quality === 'high' ? 'vp09.00.10.08' : 'vp8', // VP9 for high quality, VP8 for others
      audio: 'opus'
    };
  }
}

/**
 * Calculate optimal WebCodecs bitrates based on resolution and quality
 */
export function getWebCodecsBitrates(
  width: number,
  height: number,
  quality: 'low' | 'medium' | 'high',
  frameRate: number = 30
): { video: number; audio: number } {
  const pixelCount = width * height;
  const baseMultiplier = frameRate / 30; // Adjust for frame rate

  // Bitrate calculation based on resolution and quality
  let videoBitrate: number;

  if (quality === 'low') {
    videoBitrate = Math.floor((pixelCount * 0.08) * baseMultiplier); // 0.08 bits per pixel
  } else if (quality === 'medium') {
    videoBitrate = Math.floor((pixelCount * 0.15) * baseMultiplier); // 0.15 bits per pixel
  } else { // high
    videoBitrate = Math.floor((pixelCount * 0.25) * baseMultiplier); // 0.25 bits per pixel
  }

  // Clamp to reasonable ranges
  videoBitrate = Math.max(1000000, Math.min(videoBitrate, 20000000)); // 1-20 Mbps

  const audioBitrate = quality === 'high' ? 256000 :
    quality === 'medium' ? 192000 : 128000;

  return { video: videoBitrate, audio: audioBitrate };
}

/**
 * Create optimized canvas for WebCodecs frame generation
 */
export function createWebCodecsCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', {
    alpha: false, // Opaque canvas for better performance
    desynchronized: true, // Allow async rendering
    willReadFrequently: false, // Optimize for drawing, not reading
    colorSpace: 'srgb' // Ensure consistent color space
  });

  if (!ctx) {
    throw new Error('Failed to create WebCodecs canvas context');
  }

  // Optimize for video rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Additional quality optimizations
  (ctx as any).filter = 'none';
  (ctx as any).pixelFormat = 'rgba8'; // Ensure 8-bit color depth

  return { canvas, ctx };
}

/**
 * Calculate WebCodecs keyframe interval based on frame rate and duration
 */
export function calculateKeyframeInterval(
  frameRate: number,
  totalDuration: number
): number {
  // Keyframe every 2 seconds, but at least every 120 frames
  const keyframeEverySeconds = 2;
  const maxKeyframeInterval = 120;

  const calculatedInterval = Math.floor(frameRate * keyframeEverySeconds);
  return Math.min(calculatedInterval, maxKeyframeInterval);
}


