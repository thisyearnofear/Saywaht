import { ExportOptions } from "./canvas-export-utils";
import { getQualityBitrate } from "./video-utils";

/**
 * Centralized export configuration to maintain DRY principle
 */
export interface ExportConfig {
  outputFormat: 'mp4' | 'webm';
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
}

/**
 * Get standardized export configuration based on options
 * Single source of truth for export settings
 */
export function getExportConfig(options: ExportOptions): ExportConfig {
  return {
    outputFormat: options.outputFormat || 'mp4',
    frameRate: options.frameRate || 30,
    videoBitrate: options.videoBitrate || getQualityBitrate(options.quality || 'medium'),
    audioBitrate: options.audioBitrate || 192000
  };
}

/**
 * Get WebCodecs-specific configuration
 */
export function getWebCodecsConfig(options: ExportOptions): ExportConfig {
  const baseConfig = getExportConfig(options);
  // WebCodecs currently works better with WebM
  return {
    ...baseConfig,
    outputFormat: 'webm'
  };
}

/**
 * Calculate timeout duration for exports
 * Centralized logic to avoid duplication
 */
export function getExportTimeout(totalDuration: number): number {
  // 3x duration or 60 seconds minimum
  return Math.max(totalDuration * 3000, 60000);
}