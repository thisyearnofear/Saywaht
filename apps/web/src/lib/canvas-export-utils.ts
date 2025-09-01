import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { exportVideoTrueOffline } from "./optimized-export";
import { isWebCodecsSupported, WebCodecsExportOptions } from "./webcodecs-export";
import { exportVideoWithTransferableFrames } from "./webcodecs-streaming-export";
import { FORMAT_DIMENSIONS, VideoFormat } from "./video-utils";
import { selectBestExportMethod, recordWebCodecsFailure, recordWebCodecsSuccess, getExportMethodRecommendation } from "./export-method-selector";
import { exportDiagnostics } from "./export-diagnostics";
import { getExportConfig, getWebCodecsConfig, getExportTimeout } from "./export-config";
import { exportVideoBackend, BackendExportOptions } from "./backend-export";

export type ExportMethod = "backend" | "canvas" | "offline" | "webcodecs" | "auto";
export type { VideoFormat }; // Re-export for backward compatibility

export interface ExportOptions {
  format: VideoFormat;
  quality: "low" | "medium" | "high";
  includeAudio?: boolean;
  method?: ExportMethod; // Choose export method
  outputFormat?: 'mp4' | 'webm'; // Output format options
  frameRate?: number; // Frame rate for export
  videoBitrate?: number; // Custom video bitrate
  audioBitrate?: number; // Custom audio bitrate
}

interface AudioTrackData {
  audioElement: HTMLAudioElement;
  gainNode: GainNode;
  sourceNode: MediaElementAudioSourceNode;
}

// FORMAT_DIMENSIONS moved to video-utils.ts for DRY code

/**
 * Main export function - intelligently chooses between WebCodecs, Offline, and Canvas export methods
 * Prioritizes performance and quality based on browser support and project complexity
 */
export const exportVideo = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: ExportOptions = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    method: "auto",
    outputFormat: "mp4"
  }
): Promise<Blob> => {
  const method = options.method || "auto";

  // Start diagnostics tracking - determine method first
  let selectedMethod = method;
  if (method === "auto") {
    const methodInfo = await selectBestExportMethod(tracks, mediaItems, options, totalDuration);
    selectedMethod = methodInfo.method;
  }

  exportDiagnostics.startExport(selectedMethod, tracks, mediaItems, totalDuration);
  
  // Wrap progress callback to track in diagnostics
  const trackedProgress = (progress: number) => {
    exportDiagnostics.updateProgress(progress);
    onProgress(progress);
  };
  
  // Helper function to execute export with method
  const executeExport = async (
    exportMethod: "backend" | "webcodecs" | "offline" | "canvas",
    progress: (p: number) => void,
    abortSignal?: AbortSignal
  ): Promise<Blob> => {
    switch (exportMethod) {
      case "backend": {
        const backendOptions: BackendExportOptions = {
          ...options,
          maxFileSizeMB: 50,
          timeout: 300000 // 5 minutes
        };
        const result = await exportVideoBackend(
          tracks,
          mediaItems,
          totalDuration,
          progress,
          backendOptions
        );
        return result.blob;
      }

      case "webcodecs": {
        const config = getWebCodecsConfig(options);
        return exportVideoWithTransferableFrames(
          tracks,
          mediaItems,
          totalDuration,
          progress,
          { ...options, ...config } as WebCodecsExportOptions,
          abortSignal
        );
      }

      case "offline": {
        const config = getExportConfig(options);
        return exportVideoTrueOffline(
          tracks,
          mediaItems,
          totalDuration,
          progress,
          { ...options, ...config }
        );
      }

      case "canvas":
      default:
        return exportVideoWithCanvas(tracks, mediaItems, totalDuration, progress, options);
    }
  };

  // Helper function to handle WebCodecs with timeout and fallback
  const executeWebCodecsWithFallback = async (progress: (p: number) => void): Promise<Blob> => {
    let webCodecsController: AbortController | null = null;
    
    try {
      // Create an abort controller to cancel WebCodecs if needed
      webCodecsController = new AbortController();
      
      const webCodecsPromise = executeExport("webcodecs", progress, webCodecsController.signal);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          // Cancel the WebCodecs process before rejecting
          if (webCodecsController) {
            webCodecsController.abort();
          }
          reject(new Error('WebCodecs export timeout'));
        }, getExportTimeout(totalDuration));
      });
      
      const result = await Promise.race([webCodecsPromise, timeoutPromise]);
      recordWebCodecsSuccess();
      return result;
    } catch (error) {
      console.error("WebCodecs export failed:", error);
      recordWebCodecsFailure();
      exportDiagnostics.recordError(error instanceof Error ? error : new Error(String(error)));
      
      // Ensure WebCodecs is properly cancelled before fallback
      if (webCodecsController) {
        webCodecsController.abort();
      }
      
      // Add a small delay to ensure WebCodecs cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fallback to offline export
      console.log("🔄 Falling back to offline export");
      progress(0); // Reset progress
      return executeExport("offline", progress);
    }
  };

  try {
    // Auto-select method based on intelligent analysis
    if (method === "auto") {
      const methodInfo = await selectBestExportMethod(tracks, mediaItems, options, totalDuration);
      const recommendation = await getExportMethodRecommendation(tracks, mediaItems, options, totalDuration);

      console.log("🤖 Export Method Analysis:");
      console.log(recommendation);
      console.log(`📊 Selected: ${methodInfo.method} (${Math.round(methodInfo.confidence * 100)}% confidence)`);

      // Execute based on selected method
      if (methodInfo.method === "backend") {
        console.log("⚡ Using Pro Export for maximum quality and speed");
        const result = await executeExport("backend", trackedProgress);
        exportDiagnostics.stopExport(true);
        return result;
      }

      if (methodInfo.method === "webcodecs") {
        console.log("🚀 Using Quick Export for fast processing");
        const result = await executeWebCodecsWithFallback(trackedProgress);
        exportDiagnostics.stopExport(true);
        return result;
      }

      if (methodInfo.method === "offline") {
        console.log("🎯 Using Reliable Export for maximum compatibility");
        const result = await executeExport("offline", trackedProgress);
        exportDiagnostics.stopExport(true);
        return result;
      }

      // Canvas export for simple content
      console.log("🎨 Using Basic Export for simple content");
      const result = await executeExport("canvas", trackedProgress);
      exportDiagnostics.stopExport(true);
      return result;
    }
    
    // Manual method selection
    if (method === "backend") {
      console.log("⚡ Using Pro Export - Maximum quality and speed");
      const result = await executeExport("backend", trackedProgress);
      exportDiagnostics.stopExport(true);
      return result;
    }

    if (method === "webcodecs") {
      if (!isWebCodecsSupported()) {
        console.warn("WebCodecs not supported, falling back to offline export");
        const result = await executeExport("offline", trackedProgress);
        exportDiagnostics.stopExport(true);
        return result;
      }

      console.log("🚀 Using Quick Export - Fast processing");
      const result = await executeWebCodecsWithFallback(trackedProgress);
      exportDiagnostics.stopExport(true);
      return result;
    }

    if (method === "offline") {
      console.log("🎯 Using Reliable Export - Works on any device");
      const result = await executeExport("offline", trackedProgress);
      exportDiagnostics.stopExport(true);
      return result;
    }

    // Default to canvas method
    const result = await executeExport("canvas", trackedProgress);
    exportDiagnostics.stopExport(true);
    return result;
  
  } catch (error) {
    // Catch any unhandled errors
    console.error("Export failed with error:", error);
    exportDiagnostics.recordError(error instanceof Error ? error : new Error(String(error)));
    exportDiagnostics.stopExport(false);
    throw error;
  }
};

// Removed shouldUseEnhancedExport - complexity analysis now handled by export-method-selector.ts

/**
 * Export video using HTML5 Canvas and MediaRecorder API with Web Audio API integration.
 * Phase 1: Enhanced audio support using Web Audio API for mixing multiple tracks.
 */
export const exportVideoWithCanvas = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: ExportOptions = { format: "portrait", quality: "medium", includeAudio: true }
): Promise<Blob> => {
  // Get dimensions based on selected format
  const dimensions = FORMAT_DIMENSIONS[options.format];

  // Create a canvas element to render video frames
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Initialize video stream from canvas
  const videoStream = canvas.captureStream(30); // Higher frame rate for smoother video
  
  // Phase 1: Web Audio API Integration
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let audioTracks: AudioTrackData[] = [];
  let combinedStream: MediaStream = videoStream;

  if (options.includeAudio) {
    try {
      // Create audio context for mixing
      audioContext = new AudioContext();
      audioDestination = audioContext.createMediaStreamDestination();
      
      // Setup audio tracks for mixing
      audioTracks = await setupAudioTracks(tracks, mediaItems, audioContext, audioDestination);
      
      // Combine video and audio streams
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ]);
      
      console.log("🎵 Audio mixing enabled with", audioTracks.length, "tracks");
    } catch (error) {
      console.warn("Audio mixing failed, falling back to video-only:", error);
      combinedStream = videoStream;
    }
  }

  // Initialize MediaRecorder with combined stream
  let recorder: MediaRecorder;
  try {
    const mimeType = options.includeAudio && audioContext
      ? "video/webm;codecs=vp9,opus"
      : "video/webm;codecs=vp9";
    
    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      audioBitsPerSecond: options.includeAudio ? 128000 : undefined, // 128 kbps audio
    });
  } catch (error) {
    console.warn("Advanced codec not supported, using fallback");
    recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm"
    });
  }
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Pre-load video elements to avoid flashing
  const videoElements = new Map<string, HTMLVideoElement>();

  // Pre-load all video media items
  for (const mediaItem of mediaItems) {
    if (mediaItem.type === "video") {
      const video = document.createElement("video");
      // Only mute if we're handling audio separately, otherwise preserve audio
      video.muted = !!(options.includeAudio && audioContext);
      video.preload = "metadata";

      if (mediaItem.file && mediaItem.file instanceof File) {
        video.src = URL.createObjectURL(mediaItem.file);
      } else if (mediaItem.url) {
        video.src = mediaItem.url;
        video.crossOrigin = "anonymous";
      }

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(null);
        video.onerror = () => resolve(null);
        video.load();
      });

      videoElements.set(mediaItem.id, video);
    }
  }

  // Start recording
  recorder.start();

  // Simulate video playback by drawing frames to the canvas
  let currentTime = 0;
  const frameRate = 30; // Higher fps for smoother video
  const frameDuration = 1000 / frameRate; // ms per frame

  // Function to draw the current frame based on timeline data
  const drawFrame = async (time: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Iterate through tracks and clips to render the current frame
    for (const track of tracks) {
      if (track.muted) continue; // Skip muted tracks

      for (const clip of track.clips) {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;

        if (time >= clipStart && time < clipEnd) {
          const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
          if (mediaItem && mediaItem.type === "video") {
            const video = videoElements.get(mediaItem.id);
            if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA
              // Calculate video time accounting for trim
              const videoTime = time - clipStart + clip.trimStart;

              // Only seek if necessary (reduces flashing)
              if (Math.abs(video.currentTime - videoTime) > 0.1) {
                video.currentTime = videoTime;
                await new Promise(resolve => {
                  video.onseeked = () => resolve(null);
                  video.onerror = () => resolve(null);
                });
              }

              // Calculate proper scaling to maintain aspect ratio while filling the canvas
              const videoAspect = video.videoWidth / video.videoHeight;
              const canvasAspect = canvas.width / canvas.height;

              let drawWidth, drawHeight, drawX, drawY;

              if (videoAspect > canvasAspect) {
                // Video is wider than canvas - crop sides
                drawHeight = canvas.height;
                drawWidth = drawHeight * videoAspect;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
              } else {
                // Video is taller than canvas - crop top/bottom
                drawWidth = canvas.width;
                drawHeight = drawWidth / videoAspect;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
              }

              ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
            }
          }
        }
      }
    }
  };
  
  /**
   * Setup audio tracks for Web Audio API mixing
   * Phase 1: Create audio elements and connect them to the audio context
   */
  async function setupAudioTracks(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    audioContext: AudioContext,
    destination: MediaStreamAudioDestinationNode
  ): Promise<AudioTrackData[]> {
    const audioTracks: AudioTrackData[] = [];
  
    for (const track of tracks) {
      if (track.muted) continue; // Skip muted tracks
  
      for (const clip of track.clips) {
        const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
        if (!mediaItem) continue;
  
        // Handle both video files (for separated audio) and pure audio files
        if (mediaItem.type === "video" || mediaItem.type === "audio") {
          try {
            const audioElement = document.createElement("audio");
            audioElement.preload = "metadata";
            audioElement.crossOrigin = "anonymous";
  
            if (mediaItem.file && mediaItem.file instanceof File) {
              audioElement.src = URL.createObjectURL(mediaItem.file);
            } else if (mediaItem.url) {
              audioElement.src = mediaItem.url;
            }
  
            // Wait for audio to be ready
            await new Promise((resolve, reject) => {
              audioElement.onloadedmetadata = () => resolve(null);
              audioElement.onerror = () => reject(new Error(`Failed to load audio: ${mediaItem.name}`));
              audioElement.load();
              
              // Timeout after 5 seconds
              setTimeout(() => reject(new Error(`Audio load timeout: ${mediaItem.name}`)), 5000);
            });
  
            // Create Web Audio API nodes
            const sourceNode = audioContext.createMediaElementSource(audioElement);
            const gainNode = audioContext.createGain();
  
            // Set initial volume (can be adjusted based on track settings)
            gainNode.gain.value = track.muted ? 0 : 1;
  
            // Connect audio graph: source -> gain -> destination
            sourceNode.connect(gainNode);
            gainNode.connect(destination);
  
            audioTracks.push({
              audioElement,
              gainNode,
              sourceNode,
            });
  
            console.log(`🎵 Audio track setup: ${mediaItem.name}`);
          } catch (error) {
            console.warn(`Failed to setup audio track for ${mediaItem.name}:`, error);
          }
        }
      }
    }
  
    return audioTracks;
  }
  
  /**
   * Synchronize audio tracks with the current timeline position
   * Phase 1: Basic time synchronization for audio playback
   */
  async function syncAudioTracks(
    audioTracks: AudioTrackData[],
    tracks: TimelineTrack[],
    currentTime: number
  ): Promise<void> {
    for (let i = 0; i < audioTracks.length; i++) {
      const { audioElement, gainNode } = audioTracks[i];
      
      try {
        // Find the corresponding track and clip for this audio element
        let shouldPlay = false;
        let audioTime = 0;
        let volume = 1;
  
        for (const track of tracks) {
          if (track.muted) continue;
  
          for (const clip of track.clips) {
            const clipStart = clip.startTime;
            const clipEnd = clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;
  
            // Check if current time is within this clip's range
            if (currentTime >= clipStart && currentTime < clipEnd) {
              // Calculate the audio time accounting for trim
              audioTime = currentTime - clipStart + clip.trimStart;
              shouldPlay = true;
              volume = track.muted ? 0 : 1;
              break;
            }
          }
  
          if (shouldPlay) break;
        }
  
        // Update gain node volume
        gainNode.gain.value = volume;
  
        if (shouldPlay) {
          // Seek to the correct time if necessary
          if (Math.abs(audioElement.currentTime - audioTime) > 0.1) {
            audioElement.currentTime = audioTime;
          }
  
          // Play if not already playing
          if (audioElement.paused) {
            await audioElement.play().catch((error) => {
              console.warn("Failed to play audio track:", error);
            });
          }
        } else {
          // Pause if playing but shouldn't be
          if (!audioElement.paused) {
            audioElement.pause();
          }
        }
      } catch (error) {
        console.warn("Error syncing audio track:", error);
      }
    }
  }

  // Render frames until the total duration is reached
  while (currentTime < totalDuration) {
    await drawFrame(currentTime);
    
    // Sync audio playback with video timeline
    if (options.includeAudio && audioTracks.length > 0) {
      await syncAudioTracks(audioTracks, tracks, currentTime);
    }
    
    currentTime += frameDuration / 1000; // Convert ms to seconds
    onProgress((currentTime / totalDuration) * 100);

    // Use requestAnimationFrame for smoother rendering instead of setTimeout
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  // Stop recording
  recorder.stop();

  // Wait for recording to finish
  await new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  // Cleanup video elements
  videoElements.forEach((video) => {
    if (video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }
    video.remove();
  });

  // Cleanup audio resources
  if (audioContext) {
    audioTracks.forEach(({ audioElement, sourceNode, gainNode }) => {
      try {
        sourceNode.disconnect();
        gainNode.disconnect();
        audioElement.pause();
        if (audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioElement.src);
        }
      } catch (error) {
        console.warn("Error cleaning up audio track:", error);
      }
    });
    
    await audioContext.close();
    console.log("🎵 Audio context cleaned up");
  }

  // Combine recorded chunks into a single Blob
  const blob = new Blob(chunks, { type: "video/webm" });
  const audioStatus = options.includeAudio ? `with ${audioTracks.length} audio tracks` : "video-only";
  console.log(`🎬 Export completed: ${blob.size} bytes, ${totalDuration}s duration, ${audioStatus}`);
  return blob;
};
