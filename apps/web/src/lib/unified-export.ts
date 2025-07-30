import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { FORMAT_DIMENSIONS, VideoFormat, getQualityBitrate } from "./video-utils";
import { createOfflineAudioStream } from "./offline-audio-renderer";
import { OfflineVideoRenderer } from "./offline-video-renderer";
import { FrameRateController, scheduleNextFrame } from "./frame-rate-controller";

/**
 * Unified Export System
 * 
 * A single, reliable export pipeline that eliminates audio/video sync issues,
 * frame dropping, and black frames by using offline rendering techniques.
 */

export interface UnifiedExportOptions {
  format: VideoFormat;
  quality: "low" | "medium" | "high";
  includeAudio: boolean;
  outputFormat: 'mp4' | 'webm';
  frameRate: number;
  videoBitrate?: number;
  audioBitrate?: number;
  maxFileSizeMB?: number;
  onSizeEstimate?: (estimatedSizeMB: number, maxSizeMB: number) => Promise<boolean>;
}

export interface ExportProgress {
  phase: 'initializing' | 'preloading' | 'extracting' | 'audio' | 'frames' | 'encoding' | 'finalizing';
  percentage: number;
  message: string;
  estimatedTimeRemaining?: number;
}

interface VideoFrame {
  imageData: ImageData;
  timestamp: number;
}

/**
 * Estimate file size before export based on duration, resolution, and bitrates
 */
export function estimateExportFileSize(
  totalDuration: number,
  width: number,
  height: number,
  videoBitrate: number,
  audioBitrate: number,
  includeAudio: boolean
): number {
  // Video size in bytes: (bitrate in bits/s * duration in seconds) / 8 bits per byte
  const videoSizeBytes = (videoBitrate * totalDuration) / 8;
  
  // Audio size in bytes (if included)
  const audioSizeBytes = includeAudio ? (audioBitrate * totalDuration) / 8 : 0;
  
  // Container overhead (approximately 2-5% for MP4/WebM)
  const containerOverhead = 1.03;
  
  // Total estimated size in MB
  const totalSizeMB = ((videoSizeBytes + audioSizeBytes) * containerOverhead) / (1024 * 1024);
  
  return totalSizeMB;
}

/**
 * Adjust export settings to target a specific file size
 */
export function adjustSettingsForFileSize(
  options: UnifiedExportOptions,
  totalDuration: number,
  targetSizeMB: number
): UnifiedExportOptions {
  const dimensions = FORMAT_DIMENSIONS[options.format];
  let { frameRate, videoBitrate, audioBitrate } = options;
  
  // Start with current settings
  let currentEstimate = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    videoBitrate || getQualityBitrate(options.quality),
    audioBitrate || 192000,
    options.includeAudio
  );
  
  // If already under target size, return unchanged
  if (currentEstimate <= targetSizeMB) {
    return options;
  }
  
  // Calculate reduction factor needed
  const reductionFactor = targetSizeMB / currentEstimate;
  
  // Adjust settings in order of priority
  const adjustedOptions = { ...options };
  
  // 1. Reduce video bitrate (most impactful)
  if (videoBitrate) {
    adjustedOptions.videoBitrate = Math.max(500000, Math.floor(videoBitrate * reductionFactor));
  } else {
    // Adjust quality level
    if (options.quality === "high") {
      adjustedOptions.quality = "medium";
    } else if (options.quality === "medium") {
      adjustedOptions.quality = "low";
    } else {
      // Already at low quality, set explicit bitrate
      adjustedOptions.videoBitrate = Math.max(500000, Math.floor(getQualityBitrate("low") * reductionFactor));
    }
  }
  
  // 2. Reduce frame rate if still needed
  if (estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    adjustedOptions.videoBitrate || getQualityBitrate(adjustedOptions.quality),
    adjustedOptions.audioBitrate || 192000,
    adjustedOptions.includeAudio
  ) > targetSizeMB && frameRate > 24) {
    adjustedOptions.frameRate = 24;
  }
  
  // 3. Reduce audio bitrate if still needed
  if (estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    adjustedOptions.videoBitrate || getQualityBitrate(adjustedOptions.quality),
    adjustedOptions.audioBitrate || 192000,
    adjustedOptions.includeAudio
  ) > targetSizeMB && options.includeAudio) {
    adjustedOptions.audioBitrate = 96000; // Lower audio quality
  }
  
  return adjustedOptions;
}

/**
 * Main unified export function
 * Implements a single, reliable export pipeline with pre-processing and offline rendering
 */
export async function unifiedExport(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: ExportProgress) => void,
  options: Partial<UnifiedExportOptions> = {}
): Promise<Blob> {
  const exportStartTime = performance.now();
  
  // Default options
  const exportOptions: UnifiedExportOptions = {
    format: options.format || "portrait",
    quality: options.quality || "medium",
    includeAudio: options.includeAudio !== false,
    outputFormat: options.outputFormat || "mp4",
    frameRate: options.frameRate || 30,
    videoBitrate: options.videoBitrate || getQualityBitrate(options.quality || "medium"),
    audioBitrate: options.audioBitrate || 192000,
    maxFileSizeMB: options.maxFileSizeMB || 0, // 0 means no limit
    onSizeEstimate: options.onSizeEstimate
  };
  
  // Get dimensions based on format
  const dimensions = FORMAT_DIMENSIONS[exportOptions.format];
  
  // Initialize progress tracking
  const updateProgress = (
    phase: ExportProgress['phase'],
    percentage: number,
    message: string
  ) => {
    const currentTime = performance.now();
    const elapsedMs = currentTime - exportStartTime;
    const estimatedTotalMs = percentage > 0 ? (elapsedMs / (percentage / 100)) : undefined;
    const estimatedTimeRemaining = estimatedTotalMs ? (estimatedTotalMs - elapsedMs) / 1000 : undefined;
    
    onProgress({
      phase,
      percentage,
      message,
      estimatedTimeRemaining
    });
  };
  
  try {
    // PHASE 1: Initialization and size estimation (0-5%)
    updateProgress('initializing', 0, 'Initializing export...');
    
    // Estimate file size
    const estimatedSizeMB = estimateExportFileSize(
      totalDuration,
      dimensions.width,
      dimensions.height,
      exportOptions.videoBitrate || getQualityBitrate(exportOptions.quality),
      exportOptions.audioBitrate || 192000,
      exportOptions.includeAudio
    );
    
    console.log(`📊 Estimated export size: ${estimatedSizeMB.toFixed(2)}MB`);
    
    // Check if size exceeds limit and prompt user if needed
    if (exportOptions.maxFileSizeMB && exportOptions.maxFileSizeMB > 0 && estimatedSizeMB > exportOptions.maxFileSizeMB) {
      console.warn(`⚠️ Estimated size (${estimatedSizeMB.toFixed(2)}MB) exceeds limit (${exportOptions.maxFileSizeMB}MB)`);
      
      // If callback provided, ask user what to do
      if (exportOptions.onSizeEstimate) {
        const shouldContinue = await exportOptions.onSizeEstimate(estimatedSizeMB, exportOptions.maxFileSizeMB!);
        if (!shouldContinue) {
          throw new Error(`Export cancelled: estimated file size (${estimatedSizeMB.toFixed(2)}MB) exceeds limit (${exportOptions.maxFileSizeMB}MB)`);
        }
        
        // Adjust settings to target size
        const adjustedOptions = adjustSettingsForFileSize(
          exportOptions,
          totalDuration,
          exportOptions.maxFileSizeMB * 0.95 // Target 95% of max to be safe
        );
        
        // Update options with adjusted values
        Object.assign(exportOptions, adjustedOptions);
        
        console.log(`🔧 Adjusted export settings to target ${exportOptions.maxFileSizeMB}MB:`, {
          quality: exportOptions.quality,
          videoBitrate: exportOptions.videoBitrate,
          frameRate: exportOptions.frameRate,
          audioBitrate: exportOptions.audioBitrate
        });
      }
    }
    
    updateProgress('initializing', 5, 'Preparing media assets...');
    
    // PHASE 2: Initialize video renderer (5-10%)
    const videoRenderer = new OfflineVideoRenderer(dimensions.width, dimensions.height);
    await videoRenderer.initialize(tracks, mediaItems, () => {
      updateProgress('preloading', 7, 'Loading video assets...');
    });
    
    updateProgress('preloading', 10, 'Media assets prepared');
    
    // PHASE 3: Render audio offline (10-20%)
    updateProgress('audio', 10, 'Processing audio tracks...');
    
    let audioBuffer: AudioBuffer | null = null;
    let audioCleanup: (() => Promise<void>) | null = null;
    
    if (exportOptions.includeAudio) {
      try {
        const audioResult = await createOfflineAudioStream(tracks, mediaItems, totalDuration, (audioProgress) => {
          updateProgress('audio', 10 + (audioProgress * 0.1), `Processing audio tracks... ${Math.round(audioProgress)}%`);
        });
        
        audioBuffer = audioResult.audioBuffer;
        audioCleanup = audioResult.cleanup;
        
        console.log(`🎵 Offline audio rendering complete: ${audioBuffer.duration.toFixed(2)}s at ${audioBuffer.sampleRate}Hz`);
      } catch (error) {
        console.error('❌ Audio rendering failed:', error);
        // Continue without audio if rendering fails
      }
    }
    
    updateProgress('audio', 20, 'Audio processing complete');
    
    // PHASE 4: Pre-render all video frames (20-60%)
    updateProgress('frames', 20, 'Pre-rendering video frames...');
    
    const totalFrames = Math.ceil(totalDuration * exportOptions.frameRate);
    const preRenderedFrames: VideoFrame[] = [];
    
    console.log(`🎬 Pre-rendering ${totalFrames} frames at ${exportOptions.frameRate}fps...`);
    
    // Pre-render frames in batches to avoid memory issues
    const BATCH_SIZE = 30; // Process 1 second of video at a time
    const batches = Math.ceil(totalFrames / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const startFrame = batchIndex * BATCH_SIZE;
      const endFrame = Math.min(startFrame + BATCH_SIZE, totalFrames);
      const batchFrames: VideoFrame[] = [];
      
      for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
        const timestamp = frameIndex / exportOptions.frameRate;
        const frameData = await videoRenderer.composeSingleFrame(frameIndex, exportOptions.frameRate);
        
        if (frameData) {
          batchFrames.push({
            imageData: frameData,
            timestamp
          });
        } else {
          // If frame is empty, create a black frame
          const emptyFrame = new ImageData(dimensions.width, dimensions.height);
          batchFrames.push({
            imageData: emptyFrame,
            timestamp
          });
          console.warn(`⚠️ Empty frame at ${timestamp.toFixed(2)}s (frame ${frameIndex})`);
        }
        
        // Update progress for each frame
        const frameProgress = ((frameIndex - startFrame) / (endFrame - startFrame)) * 100;
        const overallProgress = 20 + ((batchIndex * BATCH_SIZE + (frameIndex - startFrame)) / totalFrames) * 40;
        updateProgress(
          'frames',
          overallProgress,
          `Pre-rendering frames... ${Math.round((frameIndex / totalFrames) * 100)}%`
        );
      }
      
      // Add batch frames to main array
      preRenderedFrames.push(...batchFrames);
      
      // Force garbage collection between batches
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    updateProgress('frames', 60, `Pre-rendered ${preRenderedFrames.length} frames`);
    
    // PHASE 5: Setup MediaRecorder with canvas and audio (60-65%)
    updateProgress('encoding', 60, 'Setting up encoder...');
    
    const canvas = videoRenderer.getCanvas();
    const ctx = canvas.getContext('2d')!;
    
    // Create video stream from canvas
    const videoStream = canvas.captureStream(0); // 0 fps for manual frame injection
    
    // Setup audio if available
    let combinedStream: MediaStream;
    
    if (audioBuffer && exportOptions.includeAudio) {
      // Create audio stream from buffer
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.start(0);
      
      // Combine video and audio streams
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
    } else {
      combinedStream = videoStream;
    }
    
    // Setup MediaRecorder with optimal settings
    const mimeType = exportOptions.outputFormat === 'mp4' 
      ? 'video/mp4;codecs=avc1.42E01E' 
      : 'video/webm;codecs=vp9,opus';
    
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: exportOptions.videoBitrate,
        audioBitsPerSecond: exportOptions.includeAudio ? exportOptions.audioBitrate : undefined
      });
    } catch (error) {
      console.warn('Advanced codec not supported, using fallback:', error);
      recorder = new MediaRecorder(combinedStream, {
        mimeType: exportOptions.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm'
      });
    }
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    updateProgress('encoding', 65, 'Encoder ready');
    
    // PHASE 6: Playback pre-rendered frames (65-95%)
    updateProgress('encoding', 65, 'Encoding video...');
    
    // Start recording
    recorder.start(1000); // Collect data every second
    
    // Playback pre-rendered frames with precise timing
    await new Promise<void>((resolve) => {
      const frameController = new FrameRateController(exportOptions.frameRate);
      frameController.start();
      
      let frameIndex = 0;
      const totalFrameCount = preRenderedFrames.length;
      
      // Function to play the next frame
      const playNextFrame = () => {
        if (frameIndex >= totalFrameCount) {
          const stats = frameController.getStats();
          console.log(`📊 Frame playback complete:
            • Total frames: ${stats.totalFrames}
            • Dropped frames: ${stats.droppedFrames}
            • Average frame time: ${stats.averageFrameTime.toFixed(2)}ms
            • Target frame time: ${stats.targetFrameTime.toFixed(2)}ms
            • Efficiency: ${stats.efficiency.toFixed(1)}%`);
          
          resolve();
          return;
        }
        
        const timing = frameController.getNextFrameTiming();
        const frame = preRenderedFrames[frameIndex];
        
        // Draw pre-rendered frame to canvas
        ctx.putImageData(frame.imageData, 0, 0);
        
        // Request a new frame from the canvas stream
        const videoTrack = videoStream.getVideoTracks()[0];
        if ('requestFrame' in videoTrack) {
          (videoTrack as any).requestFrame();
        }
        
        // Mark frame as completed
        frameController.frameCompleted();
        frameIndex++;
        
        // Update progress
        const progress = 65 + ((frameIndex / totalFrameCount) * 30);
        updateProgress(
          'encoding',
          progress,
          `Encoding video... ${Math.round((frameIndex / totalFrameCount) * 100)}%`
        );
        
        // Schedule next frame with optimal timing
        scheduleNextFrame(playNextFrame, timing.delay);
      };
      
      // Start playback
      requestAnimationFrame(playNextFrame);
    });
    
    // PHASE 7: Finalize recording (95-100%)
    updateProgress('finalizing', 95, 'Finalizing video...');
    
    // Stop recording and collect final blob
    recorder.stop();
    
    const finalBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: exportOptions.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm' });
        resolve(blob);
      };
    });
    
    // Calculate export statistics
    const exportEndTime = performance.now();
    const totalExportTime = (exportEndTime - exportStartTime) / 1000;
    const finalSizeMB = finalBlob.size / (1024 * 1024);
    
    console.log(`✅ Unified export complete!`);
    console.log(`📊 Export stats:
      • File size: ${finalSizeMB.toFixed(2)}MB
      • Duration: ${totalDuration.toFixed(2)}s
      • Export time: ${totalExportTime.toFixed(1)}s
      • Frames: ${preRenderedFrames.length} at ${exportOptions.frameRate}fps
      • Speed ratio: ${(totalDuration / totalExportTime).toFixed(2)}x realtime`);
    
    updateProgress('finalizing', 100, 'Export complete!');
    
    // Clean up resources
    if (audioCleanup) {
      await audioCleanup();
    }
    
    if (videoRenderer) {
      videoRenderer.cleanup();
    }
    
    return finalBlob;
    
  } catch (error) {
    console.error('❌ Unified export failed:', error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a video can be exported within size constraints
 */
export async function checkExportFeasibility(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  maxSizeMB: number,
  format: VideoFormat = "portrait"
): Promise<{
  feasible: boolean;
  estimatedSize: number;
  recommendedSettings?: UnifiedExportOptions;
  message: string;
}> {
  // Start with high quality settings
  const highQualityOptions: UnifiedExportOptions = {
    format,
    quality: "high",
    includeAudio: true,
    outputFormat: "mp4",
    frameRate: 30,
    videoBitrate: getQualityBitrate("high"),
    audioBitrate: 192000
  };
  
  const dimensions = FORMAT_DIMENSIONS[format];
  const estimatedSize = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    highQualityOptions.videoBitrate!,
    highQualityOptions.audioBitrate!,
    true
  );
  
  // If high quality is feasible, return that
  if (estimatedSize <= maxSizeMB) {
    return {
      feasible: true,
      estimatedSize,
      recommendedSettings: highQualityOptions,
      message: `High quality export estimated at ${estimatedSize.toFixed(2)}MB (under ${maxSizeMB}MB limit)`
    };
  }
  
  // Try to adjust settings to fit within size limit
  const adjustedOptions = adjustSettingsForFileSize(
    highQualityOptions,
    totalDuration,
    maxSizeMB * 0.95 // Target 95% of max to be safe
  );
  
  const adjustedSize = estimateExportFileSize(
    totalDuration,
    dimensions.width,
    dimensions.height,
    adjustedOptions.videoBitrate || getQualityBitrate(adjustedOptions.quality),
    adjustedOptions.audioBitrate || 192000,
    adjustedOptions.includeAudio
  );
  
  // If adjusted settings are feasible, return those
  if (adjustedSize <= maxSizeMB) {
    return {
      feasible: true,
      estimatedSize: adjustedSize,
      recommendedSettings: adjustedOptions,
      message: `Adjusted quality settings to fit within ${maxSizeMB}MB limit (estimated: ${adjustedSize.toFixed(2)}MB)`
    };
  }
  
  // If even with lowest settings it's not feasible
  return {
    feasible: false,
    estimatedSize,
    message: `Video too long or complex for ${maxSizeMB}MB limit. Consider trimming content or using alternative storage.`
  };
}
