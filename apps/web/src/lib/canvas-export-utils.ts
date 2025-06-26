import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

/**
 * Export video using HTML5 Canvas and MediaRecorder API.
 * This approach avoids external dependencies like FFmpeg and uses native browser capabilities.
 */
export const exportVideoWithCanvas = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  // Create a canvas element to render video frames
  const canvas = document.createElement("canvas");
  canvas.width = 1280; // Reduced resolution for better performance
  canvas.height = 720;
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
            video.src = URL.createObjectURL(mediaItem.file);
            video.currentTime = time - clip.startTime + clip.trimStart;
            await new Promise((resolve) => {
              video.onloadeddata = resolve;
              video.onerror = () => resolve(null);
            });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(video.src);
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
