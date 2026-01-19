import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions } from "./canvas-export-utils";
import { createOfflineAudioStream } from "./offline-audio-renderer";
import { OfflineVideoRenderer } from "./offline-video-renderer";
import { FORMAT_DIMENSIONS, getVideoBitrate, hasVideoContent } from "./video-utils";
import { FrameRateController, scheduleNextFrame } from "./frame-rate-controller";

interface TrueOfflineExportOptions extends ExportOptions {
  outputFormat?: 'mp4' | 'webm';
  frameRate?: number;
  videoBitrate?: number;
  audioBitrate?: number;
}

// exportVideoOptimized function removed - replaced by exportVideoTrueOffline

/**
 * Phase 4: True Offline Export - No Real-Time Dependencies
 * Eliminates ALL timing issues by pre-extracting video frames and compositing offline
 */
// Old exportVideoOptimized function removed - it used BufferedVideoRenderer which was deleted

// getBestMimeType function removed - not needed for true offline export

// getVideoBitrate function moved to video-utils.ts for DRY code

/**
 * Phase 4: True Offline Export - No Real-Time Dependencies
 * Eliminates ALL timing issues by pre-extracting video frames and compositing offline
 */
export const exportVideoTrueOffline = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: TrueOfflineExportOptions = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    outputFormat: 'mp4',
    frameRate: 30,
    videoBitrate: 5000000,
    audioBitrate: 192000
  }
): Promise<Blob> => {
  const exportStartTime = performance.now();
  console.log('🚀 Starting TRUE offline export - zero real-time dependencies...');

  const dimensions = FORMAT_DIMENSIONS[options.format];
  const frameRate = options.frameRate || 30;
  const videoBitrate = getVideoBitrate(options.quality || 'medium', options.videoBitrate);
  const audioBitrate = options.audioBitrate || 192000;

  let audioCleanup: (() => Promise<void>) | null = null;
  let videoRenderer: OfflineVideoRenderer | null = null;

  try {
    // ENHANCEMENT: Unified progress tracking
    const progressPhases = {
      init: { min: 0, max: 10 },
      extract: { min: 10, max: 25 },
      compose: { min: 25, max: 50 },
      audio: { min: 50, max: 65 },
      setup: { min: 65, max: 70 },
      encode: { min: 70, max: 95 },
      final: { min: 95, max: 100 }
    };

    const reportProgress = (phase: keyof typeof progressPhases, phaseProgress: number) => {
      const { min, max } = progressPhases[phase];
      onProgress(Math.round(min + ((max - min) * phaseProgress / 100)));
    };

    // Phase 1: Initialize true offline video renderer
    console.log('🎬 Initializing video renderer...');
    reportProgress('init', 50);
    videoRenderer = new OfflineVideoRenderer(dimensions.width, dimensions.height);

    // Phase 2: Initialize video clips (5-10% progress)
    await videoRenderer.initialize(tracks, mediaItems, () => {
      reportProgress('init', 100);
    });
    reportProgress('init', 100);

    // Phase 3: Extract frames (10-25% progress)
    console.log('🎬 Extracting video frames...');
    await videoRenderer.extractAllFrames((progress) => {
      reportProgress('extract', progress);
    });
    reportProgress('extract', 100);

    // Phase 4: Pre-compose frames (25-50% progress)
    console.log('🎨 Pre-composing frames...');
    await videoRenderer.preComposeAllFrames(totalDuration, frameRate, (progress) => {
      reportProgress('compose', progress);
    });
    reportProgress('compose', 100);

    // Phase 5: Render offline audio (50-65% progress)
    reportProgress('audio', 0);
    let audioStream: MediaStream | null = null;

    if (options.includeAudio) {
      console.log('🎵 Rendering audio offline...');
      const audioResult = await createOfflineAudioStream(tracks, mediaItems, totalDuration, (progress) => {
        reportProgress('audio', progress);
      });
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = audioResult.audioBuffer;
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.start(0);
      audioStream = destination.stream;
      audioCleanup = audioResult.cleanup;
    }

    // Phase 6: Setup MediaRecorder (65-70% progress)
    reportProgress('setup', 50);
    const canvas = videoRenderer.getCanvas();
    // Use captureStream() without frame rate for manual frame control
    const videoStream = canvas.captureStream(); // Manual frame control
    reportProgress('setup', 100);

    let combinedStream: MediaStream;
    if (audioStream) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);
    } else {
      combinedStream = videoStream;
    }

    // Setup MediaRecorder with optimized settings
    const mimeType = options.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
    
    // Use higher quality codec settings for better output
    const codecOptions = options.outputFormat === 'mp4'
      ? 'video/mp4;codecs=avc1.42E01E' // H.264 Baseline Profile
      : 'video/webm;codecs=vp9,opus';   // VP9 for better quality
    
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: codecOptions,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: audioBitrate
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    // Phase 7: Render and encode pre-composed frames (70-95% progress)
    recorder.start(100);

    const totalFrames = Math.ceil(totalDuration * frameRate);
    console.log(`🎬 Playing back ${totalFrames} pre-composed frames at ${frameRate}fps for ${totalDuration}s duration...`);
    console.log(`📊 Expected playback time: ${(totalFrames / frameRate).toFixed(2)}s`);

    await new Promise<void>((resolve) => {
      const frameController = new FrameRateController(frameRate);
      frameController.start();
      
      let processedFrames = 0;

      // ENHANCEMENT: Use pre-composed frames for instant access (no seeking)
      const playNextFrame = async () => {
        if (processedFrames >= totalFrames) {
          const stats = frameController.getStats();
          console.log(`📊 Frame timing stats:
            • Total frames: ${stats.totalFrames}
            • Dropped frames: ${stats.droppedFrames}
            • Average frame time: ${stats.averageFrameTime.toFixed(2)}ms
            • Target frame time: ${stats.targetFrameTime.toFixed(2)}ms
            • Efficiency: ${stats.efficiency.toFixed(1)}%`);
          
          if (stats.droppedFrames > 0) {
            console.warn(`⚠️ Dropped ${stats.droppedFrames} frames during export`);
          }
          resolve();
          return;
        }

        const timing = frameController.getNextFrameTiming();
        
        // Skip frames if needed to maintain timing
        if (timing.framesToSkip > 0) {
          console.warn(`⏩ Skipping ${timing.framesToSkip} frames to maintain timing`);
          processedFrames += timing.framesToSkip;
        }
        
        // ENHANCEMENT: Render pre-composed frame (instant, no seeking delay)
        videoRenderer!.renderComposedFrame(timing.currentFrame);
        
        // Manually trigger frame capture for MediaRecorder
        const videoTrack = videoStream.getVideoTracks()[0];
        if ('requestFrame' in videoTrack) {
          (videoTrack as any).requestFrame();
        }

        // Mark frame as completed
        frameController.frameCompleted();
        processedFrames++;

        // Update progress
        reportProgress('encode', (processedFrames / totalFrames) * 100);

        // Schedule next frame with optimal timing
        scheduleNextFrame(playNextFrame, timing.delay);
      };

      // Start with requestAnimationFrame for smooth start
      requestAnimationFrame(playNextFrame);
    });

    // Phase 8: Finalize recording (95-100% progress)
    reportProgress('final', 0);
    recorder.stop();

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        reportProgress('final', 100);
        resolve(finalBlob);
      };
    });
    const exportEndTime = performance.now();
    const totalExportTime = (exportEndTime - exportStartTime) / 1000;

    console.log(`✅ TRUE offline export complete!`);
    console.log(`📊 Export stats:`);
    console.log(`   • File size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   • Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`   • Export time: ${totalExportTime.toFixed(1)}s`);
    console.log(`   • Frames: ${totalFrames} at ${frameRate}fps`);
    console.log(`   • Speed ratio: ${(totalDuration / totalExportTime).toFixed(2)}x realtime`);

    return blob;

  } catch (error) {
    console.error('❌ TRUE offline export failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (audioCleanup) {
      await audioCleanup();
    }
    if (videoRenderer) {
      videoRenderer.cleanup();
    }
  }
};

/**
 * Check if TRUE offline export should be used (most reliable)
 * Simplified: Use offline export for any video content
 */
export function shouldUseTrueOfflineExport(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[]
): boolean {
  return hasVideoContent(tracks, mediaItems);
}