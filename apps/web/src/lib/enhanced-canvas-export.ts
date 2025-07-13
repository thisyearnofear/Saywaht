import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions, VideoFormat } from "./canvas-export-utils";

const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },  // 9:16 (mobile-first)
  square: { width: 1080, height: 1080 },     // 1:1 (universal)
  landscape: { width: 1920, height: 1080 }, // 16:9 (traditional)
} as const;

interface EnhancedExportOptions extends ExportOptions {
  outputFormat?: 'mp4' | 'webm';
  frameRate?: number;
  videoBitrate?: number;
  audioBitrate?: number;
}

/**
 * Phase 2: Enhanced Canvas Export with Professional Quality
 * Improved audio/video synchronization, better codecs, and higher quality output
 */
export const exportVideoWithEnhancedCanvas = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: EnhancedExportOptions = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    outputFormat: 'mp4',
    frameRate: 30,
    videoBitrate: 5000000, // 5 Mbps
    audioBitrate: 192000   // 192 kbps
  }
): Promise<Blob> => {
  console.log('🎬 Phase 2: Enhanced Canvas Export starting...');
  
  // Get dimensions based on selected format
  const dimensions = FORMAT_DIMENSIONS[options.format];
  const frameRate = options.frameRate || 30;
  const videoBitrate = getVideoBitrate(options.quality || 'medium', options.videoBitrate);
  const audioBitrate = options.audioBitrate || 192000;

  // Create a high-quality canvas element
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false
  });
  
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Initialize high-quality video stream
  const videoStream = canvas.captureStream(frameRate);
  
  // Phase 2: Enhanced Audio Processing
  let audioContext: AudioContext | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let audioTracks: AudioTrackData[] = [];
  let combinedStream: MediaStream = videoStream;

  if (options.includeAudio) {
    try {
      // Create high-quality audio context
      audioContext = new AudioContext({
        sampleRate: 48000, // Higher sample rate for better quality
        latencyHint: 'playback'
      });
      audioDestination = audioContext.createMediaStreamDestination();
      
      // Setup enhanced audio tracks
      audioTracks = await setupEnhancedAudioTracks(tracks, mediaItems, audioContext, audioDestination);
      
      // Combine video and audio streams
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ]);
      
      console.log("🎵 Enhanced audio processing enabled with", audioTracks.length, "tracks");
    } catch (error) {
      console.warn("Enhanced audio processing failed, falling back to video-only:", error);
      combinedStream = videoStream;
    }
  }

  // Initialize MediaRecorder with enhanced settings
  let recorder: MediaRecorder;
  try {
    const mimeType = getBestMimeType(options.outputFormat || 'mp4', !!(options.includeAudio && audioContext));
    
    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: options.includeAudio ? audioBitrate : undefined,
    });
    
    console.log(`🎬 Using codec: ${mimeType} at ${videoBitrate} bps video, ${audioBitrate} bps audio`);
  } catch (error) {
    console.warn("Enhanced codec not supported, using fallback");
    recorder = new MediaRecorder(combinedStream);
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Pre-load and optimize video elements
  const videoElements = new Map<string, HTMLVideoElement>();
  const imageElements = new Map<string, HTMLImageElement>();

  // Pre-load all media items with optimization
  for (const mediaItem of mediaItems) {
    if (mediaItem.type === "video") {
      const video = await createOptimizedVideoElement(mediaItem, !!(options.includeAudio && audioContext));
      videoElements.set(mediaItem.id, video);
    } else if (mediaItem.type === "image") {
      const image = await createOptimizedImageElement(mediaItem);
      imageElements.set(mediaItem.id, image);
    }
  }

  // Start recording
  recorder.start(100); // Collect data every 100ms for smoother progress

  // Enhanced frame rendering with better timing
  let currentTime = 0;
  const frameDuration = 1000 / frameRate; // ms per frame
  const totalFrames = Math.ceil((totalDuration * 1000) / frameDuration);
  let frameCount = 0;

  // Function to draw enhanced frames
  const drawEnhancedFrame = async (time: number) => {
    // Clear with high-quality black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Process tracks with enhanced rendering
    for (const track of tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;

        if (time >= clipStart && time < clipEnd) {
          const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
          if (!mediaItem) continue;

          if (mediaItem.type === "video") {
            await renderVideoClip(ctx, videoElements.get(mediaItem.id), clip, time, canvas);
          } else if (mediaItem.type === "image") {
            await renderImageClip(ctx, imageElements.get(mediaItem.id), clip, time, canvas);
          }
        }
      }
    }
  };

  // Render frames with precise timing
  while (currentTime < totalDuration) {
    await drawEnhancedFrame(currentTime);
    
    // Sync enhanced audio playback
    if (options.includeAudio && audioTracks.length > 0) {
      await syncEnhancedAudioTracks(audioTracks, tracks, currentTime);
    }
    
    currentTime += frameDuration / 1000; // Convert ms to seconds
    frameCount++;
    
    // Update progress more frequently
    const progress = (frameCount / totalFrames) * 100;
    onProgress(Math.min(progress, 100));

    // Use high-precision timing
    await new Promise((resolve) => {
      if (frameCount % 3 === 0) {
        // Every 3rd frame, yield to browser
        requestAnimationFrame(resolve);
      } else {
        // Immediate processing for smoother export
        resolve(null);
      }
    });
  }

  // Stop recording
  recorder.stop();

  // Wait for recording to finish
  await new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  // Cleanup resources
  await cleanupEnhancedResources(videoElements, imageElements, audioContext, audioTracks);

  // Create final blob with proper MIME type
  const finalMimeType = options.outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
  const blob = new Blob(chunks, { type: finalMimeType });
  
  const audioStatus = options.includeAudio ? `with ${audioTracks.length} audio tracks` : "video-only";
  console.log(`✅ Enhanced export completed: ${blob.size} bytes, ${totalDuration}s duration, ${audioStatus}`);
  
  return blob;
};

// Helper interfaces and functions
interface AudioTrackData {
  audioElement: HTMLAudioElement;
  gainNode: GainNode;
  sourceNode: MediaElementAudioSourceNode;
  compressor?: DynamicsCompressorNode;
}

async function createOptimizedVideoElement(mediaItem: MediaItem, muteForAudio: boolean): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = muteForAudio;
  video.preload = "metadata";
  video.playsInline = true;

  if (mediaItem.file && mediaItem.file instanceof File) {
    video.src = URL.createObjectURL(mediaItem.file);
  } else if (mediaItem.url) {
    video.src = mediaItem.url;
    video.crossOrigin = "anonymous";
  }

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(null);
    video.onerror = () => resolve(null);
    video.load();
  });

  return video;
}

async function createOptimizedImageElement(mediaItem: MediaItem): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = "anonymous";

  if (mediaItem.file && mediaItem.file instanceof File) {
    image.src = URL.createObjectURL(mediaItem.file);
  } else if (mediaItem.url) {
    image.src = mediaItem.url;
  }

  await new Promise((resolve) => {
    image.onload = () => resolve(null);
    image.onerror = () => resolve(null);
  });

  return image;
}

async function renderVideoClip(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | undefined,
  clip: any,
  currentTime: number,
  canvas: HTMLCanvasElement
) {
  if (!video || video.readyState < 2) return;

  const videoTime = currentTime - clip.startTime + clip.trimStart;
  
  // Precise seeking with error handling
  if (Math.abs(video.currentTime - videoTime) > 0.1) {
    video.currentTime = Math.max(0, Math.min(videoTime, video.duration));
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve(null);
      };
      video.addEventListener('seeked', onSeeked);
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve(null);
      }, 100);
    });
  }

  // Enhanced scaling with aspect ratio preservation
  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth, drawHeight, drawX, drawY;

  if (videoAspect > canvasAspect) {
    drawHeight = canvas.height;
    drawWidth = drawHeight * videoAspect;
    drawX = (canvas.width - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = canvas.width;
    drawHeight = drawWidth / videoAspect;
    drawX = 0;
    drawY = (canvas.height - drawHeight) / 2;
  }

  // High-quality rendering
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

async function renderImageClip(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  clip: any,
  currentTime: number,
  canvas: HTMLCanvasElement
) {
  if (!image || !image.complete) return;

  // Enhanced image scaling
  const imageAspect = image.width / image.height;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth, drawHeight, drawX, drawY;

  if (imageAspect > canvasAspect) {
    drawHeight = canvas.height;
    drawWidth = drawHeight * imageAspect;
    drawX = (canvas.width - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = canvas.width;
    drawHeight = drawWidth / imageAspect;
    drawX = 0;
    drawY = (canvas.height - drawHeight) / 2;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

async function setupEnhancedAudioTracks(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode
): Promise<AudioTrackData[]> {
  const audioTracks: AudioTrackData[] = [];

  for (const track of tracks) {
    if (track.muted) continue;

    for (const clip of track.clips) {
      const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
      if (!mediaItem || (mediaItem.type !== "video" && mediaItem.type !== "audio")) continue;

      try {
        const audioElement = document.createElement("audio");
        audioElement.preload = "metadata";
        audioElement.crossOrigin = "anonymous";

        if (mediaItem.file && mediaItem.file instanceof File) {
          audioElement.src = URL.createObjectURL(mediaItem.file);
        } else if (mediaItem.url) {
          audioElement.src = mediaItem.url;
        }

        await new Promise((resolve, reject) => {
          audioElement.onloadedmetadata = () => resolve(null);
          audioElement.onerror = () => reject(new Error(`Failed to load audio: ${mediaItem.name}`));
          audioElement.load();
          setTimeout(() => reject(new Error(`Audio load timeout: ${mediaItem.name}`)), 5000);
        });

        // Enhanced audio processing chain
        const sourceNode = audioContext.createMediaElementSource(audioElement);
        const gainNode = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();

        // Configure compressor for better audio quality
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);

        // Connect audio graph: source -> compressor -> gain -> destination
        sourceNode.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(destination);

        gainNode.gain.value = track.muted ? 0 : 1;

        audioTracks.push({
          audioElement,
          gainNode,
          sourceNode,
          compressor,
        });

        console.log(`🎵 Enhanced audio track setup: ${mediaItem.name}`);
      } catch (error) {
        console.warn(`Failed to setup enhanced audio track for ${mediaItem.name}:`, error);
      }
    }
  }

  return audioTracks;
}

async function syncEnhancedAudioTracks(
  audioTracks: AudioTrackData[],
  tracks: TimelineTrack[],
  currentTime: number
): Promise<void> {
  for (let i = 0; i < audioTracks.length; i++) {
    const { audioElement, gainNode } = audioTracks[i];
    
    try {
      let shouldPlay = false;
      let audioTime = 0;
      let volume = 1;

      for (const track of tracks) {
        if (track.muted) continue;

        for (const clip of track.clips) {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;

          if (currentTime >= clipStart && currentTime < clipEnd) {
            audioTime = currentTime - clipStart + clip.trimStart;
            shouldPlay = true;
            volume = track.muted ? 0 : 1;
            break;
          }
        }

        if (shouldPlay) break;
      }

      // Smooth volume transitions
      gainNode.gain.linearRampToValueAtTime(volume, audioElement.currentTime + 0.1);

      if (shouldPlay) {
        if (Math.abs(audioElement.currentTime - audioTime) > 0.1) {
          audioElement.currentTime = Math.max(0, Math.min(audioTime, audioElement.duration));
        }

        if (audioElement.paused) {
          await audioElement.play().catch((error) => {
            console.warn("Failed to play enhanced audio track:", error);
          });
        }
      } else {
        if (!audioElement.paused) {
          audioElement.pause();
        }
      }
    } catch (error) {
      console.warn("Error syncing enhanced audio track:", error);
    }
  }
}

async function cleanupEnhancedResources(
  videoElements: Map<string, HTMLVideoElement>,
  imageElements: Map<string, HTMLImageElement>,
  audioContext: AudioContext | null,
  audioTracks: AudioTrackData[]
): Promise<void> {
  // Cleanup video elements
  videoElements.forEach((video) => {
    if (video.src.startsWith('blob:')) {
      URL.revokeObjectURL(video.src);
    }
    video.remove();
  });

  // Cleanup image elements
  imageElements.forEach((image) => {
    if (image.src.startsWith('blob:')) {
      URL.revokeObjectURL(image.src);
    }
  });

  // Cleanup audio resources
  if (audioContext) {
    audioTracks.forEach(({ audioElement, sourceNode, gainNode, compressor }) => {
      try {
        sourceNode.disconnect();
        gainNode.disconnect();
        compressor?.disconnect();
        audioElement.pause();
        if (audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioElement.src);
        }
      } catch (error) {
        console.warn("Error cleaning up enhanced audio track:", error);
      }
    });
    
    await audioContext.close();
    console.log("🎵 Enhanced audio context cleaned up");
  }
}

function getBestMimeType(outputFormat: string, hasAudio: boolean): string {
  if (outputFormat === 'mp4') {
    // Try modern codecs first
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

function getVideoBitrate(quality: string, customBitrate?: number): number {
  if (customBitrate) return customBitrate;
  
  switch (quality) {
    case 'low': return 2000000;    // 2 Mbps
    case 'medium': return 5000000; // 5 Mbps
    case 'high': return 8000000;   // 8 Mbps
    default: return 5000000;
  }
}