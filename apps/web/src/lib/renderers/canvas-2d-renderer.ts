import { FrameRenderer } from "./frame-renderer";
import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions } from "../canvas-export-utils";
import { clearCanvas } from "../video-utils";

export class Canvas2DRenderer implements FrameRenderer {
  public name: string = 'canvas2d';
  public priority: number = 80;
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;

  canRender(params: { tracks: TimelineTrack[]; mediaItems: MediaItem[]; timestamp: number; options: ExportOptions; }): boolean {
    return true; // Canvas2D always works
  }

  async initialize(width: number, height: number): Promise<void> {
    this.canvas = new OffscreenCanvas(width, height);
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    }) as OffscreenCanvasRenderingContext2D;

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }
  }

  async renderFrame(params: {
    tracks: TimelineTrack[];
    mediaItems: MediaItem[];
    timestamp: number;
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    videoFrames: ImageData[];
    options: ExportOptions;
  }): Promise<boolean> {
    const { tracks, mediaItems, timestamp, canvas, ctx, videoFrames, options } = params;

    clearCanvas(ctx, canvas.width, canvas.height);

    let hasContent = false;

    for (const track of tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration - (clip.trimStart || 0) - (clip.trimEnd || 0);

        if (timestamp >= clipStart && timestamp < clipEnd) {
          const mediaItem = mediaItems.find(item => item.id === clip.mediaId);

          if (mediaItem) {
            if (mediaItem.type === 'video') {
              const frameIndex = Math.floor(timestamp * (options.frameRate || 30));
              const videoFrame = videoFrames[frameIndex];
              if (videoFrame) {
                ctx.putImageData(videoFrame, 0, 0);
                hasContent = true;
              }
            } else if (mediaItem.type === 'image') {
              try {
                const response = await fetch(mediaItem.url);
                const blob = await response.blob();
                const img = await createImageBitmap(blob);
                const { drawWidth, drawHeight, drawX, drawY } = calculateAspectRatioDimensions(
                  img.width,
                  img.height,
                  canvas.width,
                  canvas.height
                );

                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                hasContent = true;
                img.close(); // Clean up ImageBitmap
              } catch (error) {
                console.error('Failed to render image:', error);
              }
            }
          }
        }
      }
    }

    return hasContent;
  }

  cleanup(): void {
    this.canvas = null;
    this.ctx = null;
  }
}

function calculateAspectRatioDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { drawWidth: number; drawHeight: number; drawX: number; drawY: number } {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth, drawHeight, drawX, drawY;

  if (sourceAspect > targetAspect) {
    drawHeight = targetHeight;
    drawWidth = drawHeight * sourceAspect;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = targetWidth;
    drawHeight = drawWidth / sourceAspect;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  return { drawWidth, drawHeight, drawX, drawY };
}