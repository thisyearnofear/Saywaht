import { exportTimeline } from "@/lib/ffmpeg-utils";
import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";

export const performExport = async (
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  totalDuration: number,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  return await exportTimeline(tracks, mediaItems, totalDuration, onProgress);
};
