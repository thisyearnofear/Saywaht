import { toast } from "sonner";
import {
  getFileType,
  generateVideoThumbnail,
  getMediaDuration,
  getImageAspectRatio,
  type MediaItem,
} from "@/stores/media-store";

export interface ProcessedMediaItem extends Omit<MediaItem, "id"> {}

export async function processMediaFiles(
  files: FileList | File[]
): Promise<ProcessedMediaItem[]> {
  const fileArray = Array.from(files);
  const processedItems: ProcessedMediaItem[] = [];

  for (const file of fileArray) {
    const fileType = getFileType(file);

    if (!fileType) {
      toast.error(`Unsupported file type: ${file.name}`);
      continue;
    }

    const url = URL.createObjectURL(file);
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    let aspectRatio: number = 16 / 9; // Default fallback

    try {
      if (fileType === "image") {
        // Get image aspect ratio
        aspectRatio = await getImageAspectRatio(file);
      } else if (fileType === "video") {
        // Use basic thumbnail generation for now
        const videoResult = await generateVideoThumbnail(file);
        thumbnailUrl = videoResult.thumbnailUrl;
        aspectRatio = videoResult.aspectRatio;
      } else if (fileType === "audio") {
        // For audio, use a square aspect ratio
        aspectRatio = 1;
      }

      // Get duration for videos and audio
      if (fileType === "video" || fileType === "audio") {
        duration = await getMediaDuration(file);
        
        // For audio files, ensure we have a valid duration
        if (fileType === "audio" && (!duration || duration === 0 || !isFinite(duration))) {
          console.error(`Invalid audio duration for ${file.name}: ${duration}`);
          throw new Error("Failed to get audio duration");
        }
      }

      processedItems.push({
        name: file.name,
        type: fileType,
        file,
        url,
        thumbnailUrl,
        duration,
        aspectRatio,
      });
    } catch (error) {
      console.error("Error processing file:", file.name, error);
      toast.error(`Failed to process ${file.name}`);
      URL.revokeObjectURL(url); // Clean up on error
    }
  }

  return processedItems;
}
