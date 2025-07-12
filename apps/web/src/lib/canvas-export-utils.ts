import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

export type VideoFormat = "landscape" | "portrait" | "square";

export interface ExportOptions {
  format: VideoFormat;
  quality: "low" | "medium" | "high";
}

const FORMAT_DIMENSIONS = {
  portrait: { width: 1080, height: 1920 },  // 9:16 (mobile-first) - Higher quality
  square: { width: 1080, height: 1080 },     // 1:1 (universal)
  landscape: { width: 1920, height: 1080 }, // 16:9 (traditional)
} as const;

/**
 * Export video using HTML5 Canvas and MediaRecorder API.
 * This approach avoids external dependencies like FFmpeg and uses native browser capabilities.
 */
export const exportVideoWithCanvas = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void,
  options: ExportOptions = { format: "portrait", quality: "medium" }
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

  // Initialize MediaRecorder to record the canvas output
  const stream = canvas.captureStream(24); // Reduced frame rate for better performance
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Start recording
  recorder.start();

  // Simulate video playback by drawing frames to the canvas
  let currentTime = 0;
  const frameRate = 24; // Reduced fps for performance
  const frameDuration = 1000 / frameRate; // ms per frame

  // Function to draw the current frame based on timeline data
  const drawFrame = async (time: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Iterate through tracks and clips to render the current frame
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (time >= clip.startTime && time < clip.startTime + clip.duration - clip.trimStart - clip.trimEnd) {
          const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
          if (mediaItem && mediaItem.type === "video") {
            // Create a video element to draw the current frame
            const video = document.createElement("video");

            // Handle both local files and FilCDN URLs
            if (mediaItem.file && mediaItem.file instanceof File) {
              try {
                video.src = URL.createObjectURL(mediaItem.file);
              } catch (error) {
                console.warn(`Failed to create object URL for file:`, error);
                // Fallback to URL if available
                if (mediaItem.url) {
                  video.src = mediaItem.url;
                  video.crossOrigin = "anonymous";
                } else {
                  continue; // Skip this clip if no valid source
                }
              }
            } else if (mediaItem.url) {
              video.src = mediaItem.url; // Use FilCDN URL directly
              video.crossOrigin = "anonymous"; // Allow cross-origin for FilCDN

              // Add fallback for CORS issues
              video.onerror = () => {
                console.warn(`CORS issue with ${mediaItem.url}, using proxy or fallback`);
                // For demo purposes, we could add a proxy route if needed
              };
            } else {
              console.warn(`No valid video source for media item:`, mediaItem);
              continue; // Skip this clip if no valid source
            }
            
            video.currentTime = time - clip.startTime + clip.trimStart;
            await new Promise((resolve) => {
              video.onloadeddata = resolve;
              video.onerror = () => resolve(null);
            });

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
            
            // Only revoke object URLs, not external URLs
            if (mediaItem.file) {
              URL.revokeObjectURL(video.src);
            }
          }
        }
      }
    }
  };

  // Render frames until the total duration is reached
  while (currentTime < totalDuration) {
    await drawFrame(currentTime);
    currentTime += frameDuration / 1000; // Convert ms to seconds
    onProgress((currentTime / totalDuration) * 100);
    // Simulate frame delay
    await new Promise((resolve) => setTimeout(resolve, frameDuration));
  }

  // Stop recording
  recorder.stop();

  // Wait for recording to finish
  await new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  // Combine recorded chunks into a single Blob
  const blob = new Blob(chunks, { type: "video/webm" });
  return blob;
};
