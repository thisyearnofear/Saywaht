/**
 * Audio Recording Utilities
 * Provides optimized audio constraints and recording functionality
 * to prevent muffled audio issues in the first few seconds of recording.
 */

export interface AudioConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  sampleRate: number;
  channelCount: number;
  volume: number;
  autoGainControl?: boolean;
  latency?: number;
}

export interface RecordingOptions {
  format?: string;
  warmUpDelay?: number;
  onAudioLevelChange?: (level: number) => void;
}

/**
 * Optimal audio constraints for clear recording
 * These settings prevent muffled audio by ensuring proper microphone configuration
 */
export const OPTIMAL_AUDIO_CONSTRAINTS: AudioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100, // CD quality sample rate
  channelCount: 1, // Mono for voice recording
  volume: 1.0,
  latency: 0, // Minimal latency for real-time recording
};

/**
 * Alternative constraints for devices that don't support all features
 */
export const FALLBACK_AUDIO_CONSTRAINTS: AudioConstraints = {
  echoCancellation: true,
  noiseSuppression: false,
  sampleRate: 22050, // Lower sample rate for compatibility
  channelCount: 1,
  volume: 1.0,
};

/**
 * Get the best supported audio format for recording
 * Prioritizes formats with reliable duration metadata
 */
export function detectBestAudioFormat(): string {
  const formats = [
    "audio/wav", // Most reliable for duration metadata, universal compatibility
    "audio/mp4", // Good compatibility, especially iOS Safari
    "audio/webm", // Chrome/Firefox but can have metadata issues
    "audio/ogg", // Firefox/Chrome, less reliable metadata
  ];

  for (const format of formats) {
    if (MediaRecorder.isTypeSupported(format)) {
      console.log(`🎵 Selected audio format: ${format} (duration metadata reliability priority)`);
      return format;
    }
  }
  console.warn("⚠️ Using fallback audio format - may have metadata issues");
  return "audio/webm"; // Fallback
}

/**
 * Request microphone access with optimal constraints
 * Includes warm-up period to prevent initial audio issues
 */
export async function requestMicrophoneAccess(
  constraints: AudioConstraints = OPTIMAL_AUDIO_CONSTRAINTS,
  warmUpDelay: number = 300
): Promise<MediaStream> {
  try {
    // First try with optimal constraints
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints
      });
      console.log("🎤 Using optimal audio constraints");
    } catch (error) {
      // Fallback to basic constraints if optimal fails
      console.warn("⚠️ Optimal constraints failed, using fallback:", error);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: FALLBACK_AUDIO_CONSTRAINTS
      });
    }

    // Warm-up period to allow microphone to stabilize
    if (warmUpDelay > 0) {
      console.log(`⏳ Warming up microphone for ${warmUpDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, warmUpDelay));
    }

    return stream;
  } catch (err) {
    const errorMessage = "Microphone access denied. Please enable it in your browser settings.";
    console.error("Microphone access error:", err);
    throw new Error(errorMessage);
  }
}

/**
 * Create a configured MediaRecorder with optimal settings
 */
export function createMediaRecorder(
  stream: MediaStream,
  options: RecordingOptions = {}
): MediaRecorder {
  const format = options.format || detectBestAudioFormat();

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: format,
    audioBitsPerSecond: 128000, // 128kbps for good quality
  });

  return mediaRecorder;
}

/**
 * Monitor audio levels during recording to detect microphone issues
 */
export function monitorAudioLevels(
  stream: MediaStream,
  onLevelChange: (level: number) => void,
  fftSize: number = 256
): () => void {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);

  analyser.fftSize = fftSize;
  microphone.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkAudioLevel = () => {
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0-1

    onLevelChange(normalizedLevel);
  };

  // Check levels every 100ms
  const intervalId = setInterval(checkAudioLevel, 100);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    audioContext.close();
  };
}

/**
 * Enhanced recording session with automatic quality monitoring
 */
export class AudioRecordingSession {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private audioLevelMonitor: (() => void) | null = null;
  private onAudioLevelChange?: (level: number) => void;

  constructor(options: RecordingOptions = {}) {
    this.onAudioLevelChange = options.onAudioLevelChange;
  }

  async start(): Promise<void> {
    this.stream = await requestMicrophoneAccess();

    // Start audio level monitoring if callback provided
    if (this.onAudioLevelChange) {
      this.audioLevelMonitor = monitorAudioLevels(
        this.stream,
        this.onAudioLevelChange
      );
    }

    this.mediaRecorder = createMediaRecorder(this.stream);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    console.log("🎵 Recording started with enhanced audio configuration");
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error("No active recording session");
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.chunks, {
          type: this.mediaRecorder!.mimeType
        });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();

      // Clean up
      if (this.audioLevelMonitor) {
        this.audioLevelMonitor();
        this.audioLevelMonitor = null;
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  destroy(): void {
    if (this.audioLevelMonitor) {
      this.audioLevelMonitor();
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}