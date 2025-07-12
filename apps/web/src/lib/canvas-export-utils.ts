import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { exportVideoWithFFmpeg } from "./ffmpeg-export-utils";

export type VideoFormat = "landscape" | "portrait" | "square";
export type ExportMethod = "canvas" | "ffmpeg" | "auto";

export interface ExportOptions {
  format: VideoFormat;
  quality: "low" | "medium" | "high";
  includeAudio?: boolean;
  method?: ExportMethod; // Phase 2: Choose export method
  outputFormat?: 'mp4' | 'webm' | 'mov'; // Phase 2: Output format options
}

interface AudioTrackData {
  audioElement: HTMLAudioElement;
  gainNode: GainNode;
  sourceNode: MediaElementAudioSourceNode;
}

const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },  // 9:16 (mobile-first) - Higher quality
  square: { width: 1080, height: 1080 },     // 1:1 (universal)
  landscape: { width: 1920, height: 1080 }, // 16:9 (traditional)
} as const;

/**
 * Main export function - intelligently chooses between Canvas (Phase 1) and FFmpeg (Phase 2)
 * Phase 2: Professional-grade export with FFmpeg.wasm integration
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
  
  // Auto-select method based on complexity and requirements
  if (method === "auto") {
    const shouldUseFFmpeg = shouldUseFFmpegExport(tracks, mediaItems, options, totalDuration);
    if (shouldUseFFmpeg) {
      console.log("🎬 Auto-selected FFmpeg export for professional quality");
      return exportVideoWithFFmpeg(tracks, mediaItems, totalDuration, onProgress, {
        ...options,
        outputFormat: options.outputFormat || 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac'
      });
    } else {
      console.log("🎬 Auto-selected Canvas export for speed");
      return exportVideoWithCanvas(tracks, mediaItems, totalDuration, onProgress, options);
    }
  }
  
  // Manual method selection
  if (method === "ffmpeg") {
    return exportVideoWithFFmpeg(tracks, mediaItems, totalDuration, onProgress, {
      ...options,
      outputFormat: options.outputFormat || 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac'
    });
  }
  
  // Default to canvas method (Phase 1)
  return exportVideoWithCanvas(tracks, mediaItems, totalDuration, onProgress, options);
};

/**
 * Determine if FFmpeg export should be used based on project complexity
 */
function shouldUseFFmpegExport(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  options: ExportOptions,
  totalDuration: number
): boolean {
  // Use FFmpeg for high quality exports
  if (options.quality === "high") return true;
  
  // Use FFmpeg for MP4 output (better compatibility)
  if (options.outputFormat === "mp4") return true;
  
  // Use FFmpeg for complex projects (multiple video tracks, many clips)
  const videoTracks = tracks.filter(track =>
    track.clips.some(clip => {
      const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
      return mediaItem?.type === "video";
    })
  );
  
  if (videoTracks.length > 2) return true;
  
  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  if (totalClips > 5) return true;
  
  // Use FFmpeg for long videos (better memory management)
  if (totalDuration > 60) return true; // 1 minute+
  
  return false;
}

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
      video.muted = options.includeAudio && audioContext ? true : false;
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
