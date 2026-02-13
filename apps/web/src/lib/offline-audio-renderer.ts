import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

interface AudioClipData {
  buffer: AudioBuffer;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
}

/**
 * Phase 3A: Offline Audio Rendering
 * Renders audio tracks offline for perfect synchronization and no stuttering
 */
export class OfflineAudioRenderer {
  private audioContext: AudioContext;
  private sampleRate: number = 48000;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
  }

  /**
   * Render all audio tracks offline with perfect timing
   */
  async renderAudioTracks(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    totalDuration: number,
    onProgress?: (progress: number) => void
  ): Promise<AudioBuffer> {
    console.log('🎵 Starting offline audio rendering...');
    
    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      2, // stereo
      this.sampleRate * totalDuration,
      this.sampleRate
    );

    // Pre-load and decode all audio clips
    const audioClips = await this.loadAudioClips(tracks, mediaItems, onProgress);
    console.log(`🎵 Loaded ${audioClips.length} audio clips for offline rendering`);

    // Create audio sources in offline context
    let sourceIndex = 0;
    for (const clip of audioClips) {
      await this.addAudioClipToContext(offlineContext, clip);
      sourceIndex++;
      
      if (onProgress) {
        onProgress((sourceIndex / audioClips.length) * 50); // First 50% for loading
      }
    }

    // Render audio offline
    console.log('🎵 Rendering audio offline...');
    const renderedBuffer = await offlineContext.startRendering();
    
    if (onProgress) {
      onProgress(100);
    }

    console.log(`✅ Offline audio rendering completed: ${renderedBuffer.duration}s at ${renderedBuffer.sampleRate}Hz`);
    return renderedBuffer;
  }

  /**
   * Load and decode all audio clips from timeline
   */
  private async loadAudioClips(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    onProgress?: (progress: number) => void
  ): Promise<AudioClipData[]> {
    const audioClips: AudioClipData[] = [];
    let processedClips = 0;
    let totalClips = 0;

    // Count total clips first
    for (const track of tracks) {
      if (track.muted) continue;
      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (mediaItem && (mediaItem.type === "video" || mediaItem.type === "audio")) {
          totalClips++;
        }
      }
    }

    // Process each clip
    for (const track of tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem || (mediaItem.type !== "video" && mediaItem.type !== "audio")) {
          continue;
        }

        // Skip clips with muted audio (e.g., when audio is separated)
        if (clip.audioMuted) {
          console.log(`⏭️ Skipping audio for ${mediaItem.name} (audio muted on clip)`);
          continue;
        }

        try {
          const audioBuffer = await this.loadAudioBuffer(mediaItem);
          
          audioClips.push({
            buffer: audioBuffer,
            startTime: clip.startTime,
            duration: clip.duration,
            trimStart: clip.trimStart || 0,
            trimEnd: clip.trimEnd || 0,
            volume: track.muted ? 0 : 1
          });

          processedClips++;
          if (onProgress) {
            onProgress((processedClips / totalClips) * 25); // First 25% for loading clips
          }

          console.log(`🎵 Loaded audio clip: ${mediaItem.name} (${audioBuffer.duration}s)`);
        } catch (error) {
          console.warn(`Failed to load audio for ${mediaItem.name}:`, error);
        }
      }
    }

    return audioClips;
  }

  /**
   * Load and decode audio buffer from media item
   */
  private async loadAudioBuffer(
    mediaItem: MediaItem
  ): Promise<AudioBuffer> {
    let audioData: ArrayBuffer;

    if (mediaItem.file && mediaItem.file instanceof File) {
      audioData = await mediaItem.file.arrayBuffer();
    } else if (mediaItem.url) {
      const response = await fetch(mediaItem.url);
      audioData = await response.arrayBuffer();
    } else {
      throw new Error(`No valid audio source for ${mediaItem.name}`);
    }

    return await this.audioContext.decodeAudioData(audioData);
  }

  /**
   * Add audio clip to offline context with precise timing
   */
  private async addAudioClipToContext(
    offlineContext: OfflineAudioContext,
    clip: AudioClipData
  ): Promise<void> {
    const source = offlineContext.createBufferSource();
    const gainNode = offlineContext.createGain();
    const compressor = offlineContext.createDynamicsCompressor();

    // Configure compressor for better audio quality
    compressor.threshold.setValueAtTime(-24, 0);
    compressor.knee.setValueAtTime(30, 0);
    compressor.ratio.setValueAtTime(12, 0);
    compressor.attack.setValueAtTime(0.003, 0);
    compressor.release.setValueAtTime(0.25, 0);

    // Set up audio graph
    source.buffer = clip.buffer;
    gainNode.gain.value = clip.volume;

    // Connect: source -> compressor -> gain -> destination
    source.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(offlineContext.destination);

    // Calculate timing with trim
    const actualDuration = clip.duration - clip.trimStart - clip.trimEnd;
    const startTime = clip.startTime;
    const offset = clip.trimStart;

    // Start playback at precise time
    source.start(startTime, offset, actualDuration);
  }

  /**
   * Convert AudioBuffer to MediaStream for MediaRecorder
   */
  createAudioStream(audioBuffer: AudioBuffer): MediaStream {
    // Create a new audio context for playback
    const playbackContext = new AudioContext({ sampleRate: this.sampleRate });
    const destination = playbackContext.createMediaStreamDestination();
    
    const source = playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.start(0);

    return destination.stream;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
  }
}

/**
 * Utility function to create offline-rendered audio stream
 */
export async function createOfflineAudioStream(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress?: (progress: number) => void
): Promise<{ audioBuffer: AudioBuffer; cleanup: () => Promise<void> }> {
  const renderer = new OfflineAudioRenderer();
  
  try {
    const audioBuffer = await renderer.renderAudioTracks(tracks, mediaItems, totalDuration, onProgress);
    
    return {
      audioBuffer,
      cleanup: () => renderer.cleanup()
    };
  } catch (error) {
    await renderer.cleanup();
    throw error;
  }
}