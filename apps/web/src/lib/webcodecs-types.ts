/**
 * WebCodecs API Type Definitions
 * 
 * Type definitions for WebCodecs API to ensure TypeScript compatibility
 * across different browsers and environments
 */

// Extend the global Window interface to include WebCodecs
declare global {
  interface Window {
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

// Check if WebCodecs is available
export function isWebCodecsAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'VideoEncoder' in window && 
         'AudioEncoder' in window &&
         'VideoFrame' in window &&
         'AudioData' in window;
}

// Safe WebCodecs feature detection
export function getWebCodecsSupport() {
  if (typeof window === 'undefined') {
    return {
      VideoEncoder: false,
      AudioEncoder: false,
      VideoFrame: false,
      AudioData: false,
      VideoDecoder: false,
      AudioDecoder: false
    };
  }

  return {
    VideoEncoder: 'VideoEncoder' in window,
    AudioEncoder: 'AudioEncoder' in window,
    VideoFrame: 'VideoFrame' in window,
    AudioData: 'AudioData' in window,
    VideoDecoder: 'VideoDecoder' in window,
    AudioDecoder: 'AudioDecoder' in window
  };
}

// Type-safe WebCodecs API access
export function getWebCodecsAPI() {
  if (!isWebCodecsAvailable()) {
    throw new Error('WebCodecs API is not available in this browser');
  }

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