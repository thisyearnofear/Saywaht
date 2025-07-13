import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions, VideoFormat } from "./canvas-export-utils";
import { createOfflineAudioStream } from "./offline-audio-renderer";
import { BufferedVideoRenderer } from "./buffered-video-renderer";

const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },  // 9:16 (mobile-first)
  square: { width: 1080, height: 1080 },     // 1:1 (universal)
  landscape: { width: 1920, height: 1080 }, // 16:9 (traditional)
} as const;

interface OptimizedExportOptions extends ExportOptions {
  outputFormat?: 'mp4' | 'webm';
  frameRate?: number;
  videoBitrate?: number;
  audioBitrate?: number;
}

/**
 * Phase 3A: Optimized Export with Offline Audio + Buffered Video
 * Eliminates frame skipping and audio stuttering through improved architecture
 */
export const exportVideoOptimized = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: OptimizedExportOptions = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    outputFormat: 'mp4',
    frameRate: 30,
    videoBitrate: 5000000,
    audioBitrate: 192000
  }
): Promise<Blob> => {
  console.log('🚀 Starting optimized export with offline audio + buffered video...');
  
  const dimensions = FORMAT_DIMENSIONS[options.format];
  const frameRate = options.frameRate || 30;
  const videoBitrate = getVideoBitrate(options.quality || 'medium', options.videoBitrate);
  const audioBitrate = options.audioBitrate || 192000;

  let audioCleanup: (() => Promise<void>) | null = null;
  let videoRenderer: BufferedVideoRenderer | null = null;

  try {
    // Phase 1: Initialize buffered video renderer (10% progress)
    onProgress(5);
    videoRenderer = new BufferedVideoRenderer(dimensions.width, dimensions.height);
    await videoRenderer.initialize(tracks, mediaItems, (progress) => {
      onProgress(5 + (progress * 0.05)); // 5-10%
    });

    // Phase 2: Pre-render key video frames (20% progress)
    onProgress(10);
    const keyFrameTimestamps = videoRenderer.generateKeyFrameTimestamps(totalDuration, frameRate);
    await videoRenderer.preRenderKeyFrames(keyFrameTimestamps, (progress) => {
      onProgress(10 + (progress * 0.10)); // 10-20%
    });

    // Phase 3: Render audio offline (30% progress)
    let combinedStream: MediaStream;
    const videoStream = videoRenderer.getVideoStream(frameRate);

    if (options.includeAudio) {
      onProgress(20);
      const { audioStream, cleanup } = await createOfflineAudioStream(
        tracks,
        mediaItems,
        totalDuration,
        (progress) => {
          onProgress(20 + (progress * 0.10)); // 20-30%
        }
      );
      
      audioCleanup = cleanup;
      
      // Combine streams
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);
      
      console.log('🎵 Offline audio rendering completed and combined with video stream');
    } else {
      combinedStream = videoStream;
    }

    // Phase 4: Setup MediaRecorder with optimized settings
    onProgress(30);
    const mimeType = getBestMimeType(options.outputFormat || 'mp4', !!options.includeAudio);
    
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: options.includeAudio ? audioBitrate : undefined,
    });

    console.log(`🎬 Using optimized codec: ${mimeType} at ${videoBitrate} bps video, ${audioBitrate} bps audio`);

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    // Phase 5: Record with synchronized timing (30-90% progress)
    recorder.start(100); // Collect data every 100ms

    const totalFrames = Math.ceil(totalDuration * frameRate);
    let frameCount = 0;

    // Render frames with precise timing
    const startTime = performance.now();
    
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i / frameRate;
      
      // Render frame (this will use buffered frames when available)
      await videoRenderer.renderFrameAtTime(timestamp);
      
      frameCount++;
      const progress = 30 + ((frameCount / totalFrames) * 60); // 30-90%
      onProgress(Math.min(progress, 90));

      // Maintain consistent timing
      const expectedTime = startTime + (i * (1000 / frameRate));
      const currentTime = performance.now();
      const delay = expectedTime - currentTime;
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (i % 10 === 0) {
        // Yield to browser every 10 frames to prevent blocking
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    // Phase 6: Finalize recording (90-100% progress)
    onProgress(90);
    recorder.stop();

    await new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    // Create final blob
    const finalMimeType = options.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = new Blob(chunks, { type: finalMimeType });
    
    onProgress(100);
    
    const audioStatus = options.includeAudio ? "with offline-rendered audio" : "video-only";
    console.log(`✅ Optimized export completed: ${blob.size} bytes, ${totalDuration}s duration, ${audioStatus}`);
    
    return blob;

  } finally {
    // Cleanup resources
    if (audioCleanup) {
      await audioCleanup();
    }
    if (videoRenderer) {
      videoRenderer.cleanup();
    }
  }
};

/**
 * Get best MIME type for recording
 */
function getBestMimeType(outputFormat: string, hasAudio: boolean): string {
  if (outputFormat === 'mp4') {
    const codecs = [
      hasAudio ? 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"' : 'video/mp4;codecs="avc1.42E01E"',
      'video/mp4'
    ];
    
    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        return codec;
      }
    }
  }
  
  // WebM fallback
  const webmCodecs = [
    hasAudio ? 'video/webm;codecs="vp9,opus"' : 'video/webm;codecs="vp9"',
    hasAudio ? 'video/webm;codecs="vp8,vorbis"' : 'video/webm;codecs="vp8"',
    'video/webm'
  ];
  
  for (const codec of webmCodecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      return codec;
    }
  }
  
  return 'video/webm';
}

/**
 * Get video bitrate based on quality
 */
function getVideoBitrate(quality: string, customBitrate?: number): number {
  if (customBitrate) return customBitrate;
  
  switch (quality) {
    case 'low': return 2000000;    // 2 Mbps
    case 'medium': return 5000000; // 5 Mbps
    case 'high': return 8000000;   // 8 Mbps
    default: return 5000000;
  }
}

/**
 * Check if optimized export should be used
 */
export function shouldUseOptimizedExport(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  options: ExportOptions,
  totalDuration: number
): boolean {
  // Use optimized export for:
  // - High quality exports
  // - Projects with audio
  // - Complex projects
  // - Long videos
  
  if (options.quality === "high") return true;
  if (options.includeAudio) return true;
  if (totalDuration > 30) return true; // 30+ seconds
  
  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  if (totalClips > 3) return true;
  
  return false;
}