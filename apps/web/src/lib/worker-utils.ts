import { ExportOptions } from "./canvas-export-utils";
import {
  FORMAT_DIMENSIONS,
  getOptimalWebCodecsCodec,
  getWebCodecsBitrates,
  calculateKeyframeInterval
} from "./video-utils";
import { WebCodecsVideoEncoderConfig } from "./webcodecs-types";

export interface WebCodecsExportOptions extends ExportOptions {
  outputFormat?: 'mp4' | 'webm';
  frameRate?: number;
  videoBitrate?: number;
  audioBitrate?: number;
  keyframeInterval?: number;
}

export interface WebCodecsConfig extends WebCodecsVideoEncoderConfig {
  keyInterval?: number;
  avc?: { format: 'avc' | 'annexb' };
}

export interface EncodedChunk {
  data: Uint8Array;
  timestamp: number;
  type: 'key' | 'delta';
}

export function getWebCodecsConfig(
  options: WebCodecsExportOptions,
  dimensions: { width: number; height: number }
): WebCodecsConfig {
  const frameRate = options.frameRate || 30;
  const bitrates = getWebCodecsBitrates(dimensions.width, dimensions.height, options.quality || 'medium', frameRate);
  const codecs = getOptimalWebCodecsCodec(
    options.outputFormat || 'mp4', 
    options.quality || 'medium', 
    dimensions,
    frameRate
  );
  
  const config: WebCodecsConfig = {
    codec: codecs.video,
    width: dimensions.width,
    height: dimensions.height,
    bitrate: options.videoBitrate || bitrates.video,
    framerate: frameRate,
    keyInterval: options.keyframeInterval || calculateKeyframeInterval(frameRate, 0) // Duration set later
  };

  if (config.codec.startsWith('avc1')) {
    config.avc = { format: 'avc' };
  }

  return config;
}
