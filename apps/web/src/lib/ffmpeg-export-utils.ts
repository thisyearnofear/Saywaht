import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions, VideoFormat } from "./canvas-export-utils";

const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },  // 9:16 (mobile-first)
  square: { width: 1080, height: 1080 },     // 1:1 (universal)
  landscape: { width: 1920, height: 1080 }, // 16:9 (traditional)
} as const;

interface FFmpegExportOptions extends ExportOptions {
  outputFormat?: 'mp4' | 'webm' | 'mov';
  videoCodec?: 'h264' | 'h265' | 'vp9';
  audioCodec?: 'aac' | 'opus' | 'mp3';
  crf?: number; // Constant Rate Factor (0-51, lower = better quality)
}

/**
 * Phase 2: Professional-grade video export using FFmpeg.wasm
 * Provides frame-perfect synchronization, multiple format support, and superior quality
 */
export class FFmpegVideoExporter {
  private ffmpeg: FFmpeg;
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /**
   * Initialize FFmpeg.wasm with the local core files
   */
  private async loadFFmpeg(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._loadFFmpeg();
    await this.loadingPromise;
  }

  private async _loadFFmpeg(): Promise<void> {
    try {
      console.log('🎬 Loading FFmpeg.wasm...');
      
      // Use the local FFmpeg files from public/ffmpeg/
      const baseURL = '/ffmpeg';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      this.isLoaded = true;
      console.log('✅ FFmpeg.wasm loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load FFmpeg.wasm:', error);
      throw new Error('Failed to initialize FFmpeg.wasm');
    }
  }

  /**
   * Export video with professional-grade FFmpeg processing
   */
  async exportVideo(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    totalDuration: number,
    onProgress: (progress: number) => void,
    options: FFmpegExportOptions = {
      format: "portrait",
      quality: "medium",
      includeAudio: true,
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac'
    }
  ): Promise<Blob> {
    await this.loadFFmpeg();

    const dimensions = FORMAT_DIMENSIONS[options.format];
    const outputFilename = `output.${options.outputFormat || 'mp4'}`;

    try {
      // Step 1: Process and prepare media files
      console.log('🎬 Phase 2: Preparing media files for FFmpeg...');
      const { videoInputs, audioInputs, filterComplex } = await this.prepareMediaFiles(
        tracks,
        mediaItems,
        totalDuration,
        dimensions,
        options
      );

      // Step 2: Build FFmpeg command
      const ffmpegArgs = this.buildFFmpegCommand(
        videoInputs,
        audioInputs,
        filterComplex,
        outputFilename,
        dimensions,
        options
      );

      console.log('🎬 FFmpeg command:', ffmpegArgs.join(' '));

      // Step 3: Execute FFmpeg with progress tracking
      await this.executeFFmpegWithProgress(ffmpegArgs, totalDuration, onProgress);

      // Step 4: Read output file
      const outputData = await this.ffmpeg.readFile(outputFilename);
      const outputBlob = new Blob([outputData], {
        type: `video/${options.outputFormat || 'mp4'}`
      });

      // Step 5: Cleanup
      await this.cleanup();

      console.log(`✅ FFmpeg export completed: ${outputBlob.size} bytes`);
      return outputBlob;

    } catch (error) {
      console.error('❌ FFmpeg export failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Prepare media files and create filter complex for FFmpeg
   */
  private async prepareMediaFiles(
    tracks: TimelineTrack[],
    mediaItems: MediaItem[],
    totalDuration: number,
    dimensions: { width: number; height: number },
    options: FFmpegExportOptions
  ) {
    const videoInputs: string[] = [];
    const audioInputs: string[] = [];
    const videoFilters: string[] = [];
    const audioFilters: string[] = [];

    let inputIndex = 0;

    // Create a black background video for the base
    const backgroundFilename = 'background.mp4';
    await this.createBackgroundVideo(backgroundFilename, dimensions, totalDuration);
    videoInputs.push(backgroundFilename);
    let backgroundIndex = inputIndex++;

    // Process each track and clip
    for (const track of tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
        if (!mediaItem) continue;

        const filename = `input_${inputIndex}.${this.getFileExtension(mediaItem)}`;
        
        // Write media file to FFmpeg filesystem
        if (mediaItem.file instanceof File) {
          await this.ffmpeg.writeFile(filename, await fetchFile(mediaItem.file));
        } else if (mediaItem.url) {
          await this.ffmpeg.writeFile(filename, await fetchFile(mediaItem.url));
        }

        if (mediaItem.type === 'video') {
          videoInputs.push(filename);
          
          // Create video filter for this clip
          const videoFilter = this.createVideoFilter(
            inputIndex,
            clip,
            dimensions,
            track.clips.indexOf(clip)
          );
          videoFilters.push(videoFilter);

          // Extract audio from video if needed
          if (options.includeAudio) {
            const audioFilter = this.createAudioFilter(inputIndex, clip);
            audioFilters.push(audioFilter);
          }
        } else if (mediaItem.type === 'audio' && options.includeAudio) {
          audioInputs.push(filename);
          const audioFilter = this.createAudioFilter(inputIndex, clip);
          audioFilters.push(audioFilter);
        }

        inputIndex++;
      }
    }

    // Build filter complex
    const filterComplex = this.buildFilterComplex(
      backgroundIndex,
      videoFilters,
      audioFilters,
      dimensions,
      options
    );

    return { videoInputs, audioInputs, filterComplex };
  }

  /**
   * Create a black background video
   */
  private async createBackgroundVideo(
    filename: string,
    dimensions: { width: number; height: number },
    duration: number
  ): Promise<void> {
    const args = [
      '-f', 'lavfi',
      '-i', `color=c=black:size=${dimensions.width}x${dimensions.height}:duration=${duration}:rate=30`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      filename
    ];

    await this.ffmpeg.exec(args);
  }

  /**
   * Create video filter for a clip
   */
  private createVideoFilter(
    inputIndex: number,
    clip: any,
    dimensions: { width: number; height: number },
    clipIndex: number
  ): string {
    const startTime = clip.startTime;
    const duration = clip.duration - clip.trimStart - clip.trimEnd;
    const trimStart = clip.trimStart;

    // Scale and position video to fit canvas while maintaining aspect ratio
    return `[${inputIndex}:v]trim=start=${trimStart}:duration=${duration},setpts=PTS-STARTPTS,scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=increase,crop=${dimensions.width}:${dimensions.height}[v${clipIndex}]; [v${clipIndex}]setpts=PTS+${startTime}/TB[v${clipIndex}_timed]`;
  }

  /**
   * Create audio filter for a clip
   */
  private createAudioFilter(inputIndex: number, clip: any): string {
    const startTime = clip.startTime;
    const duration = clip.duration - clip.trimStart - clip.trimEnd;
    const trimStart = clip.trimStart;

    return `[${inputIndex}:a]atrim=start=${trimStart}:duration=${duration},asetpts=PTS-STARTPTS,adelay=${startTime * 1000}|${startTime * 1000}[a${inputIndex}]`;
  }

  /**
   * Build complete filter complex
   */
  private buildFilterComplex(
    backgroundIndex: number,
    videoFilters: string[],
    audioFilters: string[],
    dimensions: { width: number; height: number },
    options: FFmpegExportOptions
  ): string {
    let filterComplex = videoFilters.join('; ');
    
    // Overlay all video clips on background
    if (videoFilters.length > 0) {
      const overlayInputs = [`[${backgroundIndex}:v]`];
      for (let i = 0; i < videoFilters.length; i++) {
        overlayInputs.push(`[v${i}_timed]`);
      }
      
      let overlayChain = overlayInputs[0];
      for (let i = 1; i < overlayInputs.length; i++) {
        const nextOverlay = i === overlayInputs.length - 1 ? '[vout]' : `[overlay${i}]`;
        overlayChain += `${overlayInputs[i]}overlay=enable='between(t,${0},${999})'${nextOverlay}`;
        if (i < overlayInputs.length - 1) {
          overlayChain = `[overlay${i}]`;
        }
      }
      filterComplex += `; ${overlayChain}`;
    } else {
      filterComplex += `; [${backgroundIndex}:v]copy[vout]`;
    }

    // Mix audio tracks if present
    if (options.includeAudio && audioFilters.length > 0) {
      filterComplex += `; ${audioFilters.join('; ')}`;
      
      const audioInputs = audioFilters.map((_, i) => `[a${i}]`).join('');
      filterComplex += `; ${audioInputs}amix=inputs=${audioFilters.length}:duration=longest[aout]`;
    }

    return filterComplex;
  }

  /**
   * Build FFmpeg command arguments
   */
  private buildFFmpegCommand(
    videoInputs: string[],
    audioInputs: string[],
    filterComplex: string,
    outputFilename: string,
    dimensions: { width: number; height: number },
    options: FFmpegExportOptions
  ): string[] {
    const args: string[] = [];

    // Add input files
    [...videoInputs, ...audioInputs].forEach(input => {
      args.push('-i', input);
    });

    // Add filter complex
    args.push('-filter_complex', filterComplex);

    // Video encoding settings
    args.push('-map', '[vout]');
    args.push('-c:v', this.getVideoCodec(options.videoCodec || 'h264'));
    
    // Quality settings based on user preference
    const crf = options.crf || this.getQualityCRF(options.quality || 'medium');
    args.push('-crf', crf.toString());
    
    args.push('-preset', 'medium');
    args.push('-pix_fmt', 'yuv420p');

    // Audio encoding settings
    if (options.includeAudio) {
      args.push('-map', '[aout]');
      args.push('-c:a', this.getAudioCodec(options.audioCodec || 'aac'));
      args.push('-b:a', '128k');
      args.push('-ar', '44100');
    }

    // Output settings
    args.push('-movflags', '+faststart'); // Enable streaming
    args.push('-y'); // Overwrite output file
    args.push(outputFilename);

    return args;
  }

  /**
   * Execute FFmpeg with progress tracking
   */
  private async executeFFmpegWithProgress(
    args: string[],
    totalDuration: number,
    onProgress: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ffmpeg.on('progress', ({ progress, time }) => {
        // FFmpeg progress is 0-1, convert to percentage
        const percentage = Math.min(progress * 100, 100);
        onProgress(percentage);
      });

      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.exec(args)
        .then(() => resolve())
        .catch(reject);
    });
  }

  /**
   * Helper methods
   */
  private getFileExtension(mediaItem: MediaItem): string {
    if (mediaItem.file instanceof File) {
      return mediaItem.file.name.split('.').pop() || 'mp4';
    }
    if (mediaItem.url) {
      return mediaItem.url.split('.').pop()?.split('?')[0] || 'mp4';
    }
    return mediaItem.type === 'video' ? 'mp4' : 'mp3';
  }

  private getVideoCodec(codec: string): string {
    switch (codec) {
      case 'h264': return 'libx264';
      case 'h265': return 'libx265';
      case 'vp9': return 'libvpx-vp9';
      default: return 'libx264';
    }
  }

  private getAudioCodec(codec: string): string {
    switch (codec) {
      case 'aac': return 'aac';
      case 'opus': return 'libopus';
      case 'mp3': return 'libmp3lame';
      default: return 'aac';
    }
  }

  private getQualityCRF(quality: string): number {
    switch (quality) {
      case 'low': return 28;
      case 'medium': return 23;
      case 'high': return 18;
      default: return 23;
    }
  }

  /**
   * Cleanup FFmpeg filesystem
   */
  private async cleanup(): Promise<void> {
    try {
      // List all files and remove them
      const files = await this.ffmpeg.listDir('/');
      for (const file of files) {
        if (file.name && !file.name.startsWith('.')) {
          try {
            await this.ffmpeg.deleteFile(file.name);
          } catch (error) {
            // Ignore errors for directories or system files
            console.warn(`Could not delete ${file.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }

  /**
   * Terminate FFmpeg instance
   */
  async terminate(): Promise<void> {
    if (this.isLoaded) {
      await this.ffmpeg.terminate();
      this.isLoaded = false;
      this.loadingPromise = null;
    }
  }
}

/**
 * Export video using FFmpeg.wasm (Phase 2)
 * Professional-grade export with frame-perfect synchronization
 */
export const exportVideoWithFFmpeg = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: FFmpegExportOptions = {
    format: "portrait",
    quality: "medium",
    includeAudio: true,
    outputFormat: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac'
  }
): Promise<Blob> => {
  const exporter = new FFmpegVideoExporter();
  
  try {
    return await exporter.exportVideo(tracks, mediaItems, totalDuration, onProgress, options);
  } finally {
    await exporter.terminate();
  }
};