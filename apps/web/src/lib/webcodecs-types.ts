/**
 * WebCodecs API Type Definitions
 * 
 * Type definitions for WebCodecs API to ensure TypeScript compatibility
 * across different browsers and environments
 */

// Extend the global Window and WorkerGlobalScope interfaces to include WebCodecs
declare global {
  interface Window {
    VideoEncoder?: typeof VideoEncoder;
    AudioEncoder?: typeof AudioEncoder;
    VideoFrame?: typeof VideoFrame;
    AudioData?: typeof AudioData;
    VideoDecoder?: typeof VideoDecoder;
    AudioDecoder?: typeof AudioDecoder;
  }
  
  interface WorkerGlobalScope {
    VideoEncoder?: typeof VideoEncoder;
    AudioEncoder?: typeof AudioEncoder;
    VideoFrame?: typeof VideoFrame;
    AudioData?: typeof AudioData;
    VideoDecoder?: typeof VideoDecoder;
    AudioDecoder?: typeof AudioDecoder;
  }
}

// VideoEncoder types
export interface VideoEncoderConfig {
  codec: string;
  width: number;
  height: number;
  bitrate?: number;
  framerate?: number;
  keyInterval?: number;
  alpha?: 'discard' | 'keep';
  scalabilityMode?: string;
  bitrateMode?: 'constant' | 'variable';
  latencyMode?: 'quality' | 'realtime';
}

export interface VideoEncoderInit {
  output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;
  error: (error: Error) => void;
}

export interface EncodedVideoChunk {
  type: 'key' | 'delta';
  timestamp: number;
  duration?: number;
  byteLength: number;
  copyTo(destination: ArrayBuffer | ArrayBufferView): void;
}

export interface EncodedVideoChunkMetadata {
  decoderConfig?: VideoDecoderConfig;
  svc?: SvcOutputMetadata;
}

export interface VideoDecoderConfig {
  codec: string;
  codedWidth?: number;
  codedHeight?: number;
  displayAspectWidth?: number;
  displayAspectHeight?: number;
  description?: ArrayBuffer;
  colorSpace?: VideoColorSpace;
  hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software';
  optimizeForLatency?: boolean;
}

export interface SvcOutputMetadata {
  temporalLayerId?: number;
}

export interface VideoColorSpace {
  primaries?: string;
  transfer?: string;
  matrix?: string;
  fullRange?: boolean;
}

// AudioEncoder types
export interface AudioEncoderConfig {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;
  bitrateMode?: 'constant' | 'variable';
}

export interface AudioEncoderInit {
  output: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void;
  error: (error: Error) => void;
}

export interface EncodedAudioChunk {
  type: 'key' | 'delta';
  timestamp: number;
  duration?: number;
  byteLength: number;
  copyTo(destination: ArrayBuffer | ArrayBufferView): void;
}

export interface EncodedAudioChunkMetadata {
  decoderConfig?: AudioDecoderConfig;
}

export interface AudioDecoderConfig {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  description?: ArrayBuffer;
}

// VideoFrame types
export interface VideoFrameInit {
  timestamp: number;
  duration?: number;
  alpha?: 'discard' | 'keep';
  visibleRect?: DOMRectInit;
  displayWidth?: number;
  displayHeight?: number;
  metadata?: VideoFrameMetadata;
}

export interface VideoFrameMetadata {
  [key: string]: any;
}

// AudioData types
export interface AudioDataInit {
  timestamp: number;
  format: string;
  sampleRate: number;
  numberOfChannels: number;
  numberOfFrames: number;
  data: ArrayBuffer;
}

// Encode options
export interface VideoEncoderEncodeOptions {
  keyFrame?: boolean;
  quantizer?: number;
}

export interface AudioEncoderEncodeOptions {
  [key: string]: any;
}

// Codec support types
export interface VideoEncoderSupport {
  supported: boolean;
  config: VideoEncoderConfig;
}

export interface AudioEncoderSupport {
  supported: boolean;
  config: AudioEncoderConfig;
}

// Check if WebCodecs is available (works in both window and worker contexts)
export function isWebCodecsAvailable(): boolean {
  // Check if we're in a worker context by checking for self
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    return 'VideoEncoder' in self &&
           'AudioEncoder' in self &&
           'VideoFrame' in self &&
           'AudioData' in self;
  }
  
  // Check if we're in a window context
  if (typeof window !== 'undefined') {
    return 'VideoEncoder' in window &&
           'AudioEncoder' in window &&
           'VideoFrame' in window &&
           'AudioData' in window;
  }
  
  return false;
}

// Safe WebCodecs feature detection (works in both window and worker contexts)
export function getWebCodecsSupport() {
  // Check if we're in a worker context
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    return {
      VideoEncoder: 'VideoEncoder' in self,
      AudioEncoder: 'AudioEncoder' in self,
      VideoFrame: 'VideoFrame' in self,
      AudioData: 'AudioData' in self,
      VideoDecoder: 'VideoDecoder' in self,
      AudioDecoder: 'AudioDecoder' in self
    };
  }
  
  // Check if we're in a window context
  if (typeof window !== 'undefined') {
    return {
      VideoEncoder: 'VideoEncoder' in window,
      AudioEncoder: 'AudioEncoder' in window,
      VideoFrame: 'VideoFrame' in window,
      AudioData: 'AudioData' in window,
      VideoDecoder: 'VideoDecoder' in window,
      AudioDecoder: 'AudioDecoder' in window
    };
  }

  return {
    VideoEncoder: false,
    AudioEncoder: false,
    VideoFrame: false,
    AudioData: false,
    VideoDecoder: false,
    AudioDecoder: false
  };
}

// Type-safe WebCodecs API access (works in both window and worker contexts)
export function getWebCodecsAPI() {
  if (!isWebCodecsAvailable()) {
    throw new Error('WebCodecs API is not available in this browser');
  }

  // Check if we're in a worker context
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    return {
      VideoEncoder: (self as any).VideoEncoder!,
      AudioEncoder: (self as any).AudioEncoder!,
      VideoFrame: (self as any).VideoFrame!,
      AudioData: (self as any).AudioData!
    };
  }

  // We're in a window context
  return {
    VideoEncoder: window.VideoEncoder!,
    AudioEncoder: window.AudioEncoder!,
    VideoFrame: window.VideoFrame!,
    AudioData: window.AudioData!
  };
}

// Export types for use in other files
export type {
  VideoEncoderConfig as WebCodecsVideoEncoderConfig,
  VideoEncoderInit as WebCodecsVideoEncoderInit,
  AudioEncoderConfig as WebCodecsAudioEncoderConfig,
  AudioEncoderInit as WebCodecsAudioEncoderInit,
  VideoFrameInit as WebCodecsVideoFrameInit,
  AudioDataInit as WebCodecsAudioDataInit,
  VideoEncoderEncodeOptions as WebCodecsVideoEncoderEncodeOptions,
  AudioEncoderEncodeOptions as WebCodecsAudioEncoderEncodeOptions
};