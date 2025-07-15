import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { WebCodecsExportOptions } from "./webcodecs-export";
import { FORMAT_DIMENSIONS, clearCanvas, setupHighQualityCanvas } from "./video-utils";
import { OfflineVideoRenderer } from "./offline-video-renderer";
import { 
  isWebCodecsAvailable, 
  getWebCodecsAPI,
} from "./webcodecs-types";

/**
 * Streaming WebCodecs Export
 * 
 * This implementation processes frames in batches to avoid memory issues.
 * Instead of pre-composing all frames, it:
 * 1. Extracts video frames in small batches
 * 2. Processes each batch through WebCodecs
 * 3. Transfers data using transferable objects
 * 4. Clears memory between batches
 */

const BATCH_SIZE = 30; // Process 1 second of video at a time (at 30fps)

export async function exportVideoWithStreamingWebCodecs(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: WebCodecsExportOptions
): Promise<Blob> {
  if (!isWebCodecsAvailable()) {
    throw new Error('WebCodecs API not available');
  }

  const { VideoEncoder } = getWebCodecsAPI();
  const frameRate = options.frameRate || 30;
  const totalFrames = Math.ceil(totalDuration * frameRate);
  const dimensions = FORMAT_DIMENSIONS[options.format as keyof typeof FORMAT_DIMENSIONS];
  
  console.log(`🎬 Starting streaming WebCodecs export:
    Duration: ${totalDuration}s
    Frame rate: ${frameRate}fps
    Total frames: ${totalFrames}
    Batch size: ${BATCH_SIZE} frames
    Dimensions: ${dimensions.width}x${dimensions.height}
  `);

  // Initialize video renderer for frame extraction
  const videoRenderer = new OfflineVideoRenderer(dimensions.width, dimensions.height);
  
  // Extract video frames (but don't compose yet)
  onProgress(2);
  await videoRenderer.initialize(tracks, mediaItems, (progress) => {
    onProgress(2 + (progress * 0.18)); // 2-20% for video extraction
  });

  // Create encoder
  const videoChunks: Uint8Array[] = [];
  const encoder = new VideoEncoder({
    output: (chunk: any) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      videoChunks.push(data);
    },
    error: (error: Error) => {
      console.error('VideoEncoder error:', error);
      throw error;
    }
  });

  // Configure encoder
  const codec = options.outputFormat === 'mp4' ? 'avc1.42E01E' : 'vp8';
  encoder.configure({
    codec,
    width: dimensions.width,
    height: dimensions.height,
    bitrate: options.videoBitrate || 5_000_000,
    framerate: frameRate,
  });

  // Note: Worker-based batch processing removed for now
  // Will use direct encoding instead

  // Process frames in batches
  const numBatches = Math.ceil(totalFrames / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
    const startFrame = batchIndex * BATCH_SIZE;
    const endFrame = Math.min(startFrame + BATCH_SIZE, totalFrames);
    const batchProgress = 20 + ((batchIndex / numBatches) * 70); // 20-90%
    
    console.log(`📦 Processing batch ${batchIndex + 1}/${numBatches} (frames ${startFrame}-${endFrame})`);
    onProgress(batchProgress);

    // Compose frames for this batch
    const batchFrames: ImageData[] = [];
    for (let frameIndex = startFrame; frameIndex < endFrame; frameIndex++) {
      const frame = await videoRenderer.composeSingleFrame(frameIndex, frameRate);
      if (frame) {
        batchFrames.push(frame);
      }
    }

    // Process batch through encoder
    for (let i = 0; i < batchFrames.length; i++) {
      const frameIndex = startFrame + i;
      const timestamp = frameIndex / frameRate;
      const frame = batchFrames[i];

      // Create VideoFrame from ImageData
      const videoFrame = new (window as any).VideoFrame(frame, {
        timestamp: timestamp * 1_000_000, // microseconds
        codedWidth: dimensions.width,
        codedHeight: dimensions.height,
      });

      // Encode frame
      encoder.encode(videoFrame, { 
        keyFrame: frameIndex % (frameRate * 2) === 0 // Keyframe every 2 seconds
      });
      
      videoFrame.close(); // Clean up immediately
    }

    // Clear batch from memory
    batchFrames.length = 0;
    
    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Flush encoder
  await encoder.flush();
  encoder.close();

  // Clean up
  videoRenderer.cleanup();

  onProgress(95);

  // Create final blob
  const mimeType = options.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
  const finalBlob = new Blob(videoChunks, { type: mimeType });

  onProgress(100);
  console.log(`✅ Export completed: ${(finalBlob.size / 1024 / 1024).toFixed(2)}MB`);

  return finalBlob;
}

/**
 * Alternative approach using transferable objects
 */
export async function exportVideoWithTransferableFrames(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: WebCodecsExportOptions
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    const worker = new Worker(new URL('./transferable-export-worker.ts', import.meta.url), {
      type: 'module'
    });

    const frameRate = options.frameRate || 30;
    const totalFrames = Math.ceil(totalDuration * frameRate);
    const dimensions = FORMAT_DIMENSIONS[options.format as keyof typeof FORMAT_DIMENSIONS];

    // Initialize renderer
    const videoRenderer = new OfflineVideoRenderer(dimensions.width, dimensions.height);
    
    onProgress(2);
    await videoRenderer.initialize(tracks, mediaItems, (progress) => {
      onProgress(2 + (progress * 0.18));
    });

    let processedFrames = 0;

    worker.onmessage = async (event) => {
      const { type, payload } = event.data;

      if (type === 'ready') {
        // Worker is ready, start sending frames
        sendNextFrame();
      } else if (type === 'frame_processed') {
        processedFrames++;
        const progress = 20 + ((processedFrames / totalFrames) * 70);
        onProgress(progress);
        
        if (processedFrames < totalFrames) {
          sendNextFrame();
        } else {
          // All frames processed
          worker.postMessage({ type: 'finish' });
        }
      } else if (type === 'success') {
        videoRenderer.cleanup();
        resolve(payload);
        worker.terminate();
      } else if (type === 'error') {
        videoRenderer.cleanup();
        reject(new Error(payload));
        worker.terminate();
      }
    };

    worker.onerror = (error) => {
      videoRenderer.cleanup();
      reject(error);
      worker.terminate();
    };

    async function sendNextFrame() {
      const frameIndex = processedFrames;
      const timestamp = frameIndex / frameRate;
      
      // Compose single frame
      const frame = await videoRenderer.composeSingleFrame(frameIndex, frameRate);
      
      if (frame) {
        // Transfer frame data to worker
        const buffer = frame.data.buffer;
        worker.postMessage({
          type: 'frame',
          payload: {
            buffer,
            width: frame.width,
            height: frame.height,
            timestamp: timestamp * 1_000_000, // microseconds
            frameIndex,
            isKeyFrame: frameIndex % (frameRate * 2) === 0
          }
        }, [buffer]); // Transfer ownership of buffer
      } else {
        // No frame data, skip
        processedFrames++;
        if (processedFrames < totalFrames) {
          sendNextFrame();
        }
      }
    }

    // Start the process
    worker.postMessage({
      type: 'init',
      payload: {
        width: dimensions.width,
        height: dimensions.height,
        frameRate,
        bitrate: options.videoBitrate || 5_000_000,
        outputFormat: options.outputFormat || 'webm'
      }
    });
  });
}