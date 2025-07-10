import { create } from "zustand";
import { persist } from "zustand/middleware";
import { customStorage } from "@/lib/custom-storage";

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  file?: File; // Optional for FilCDN items
  url: string; // Object URL for preview or FilCDN URL
  thumbnailUrl?: string; // For video thumbnails
  duration?: number; // For video/audio duration
  aspectRatio: number; // width / height
  
  // Storage provider flags
  isFilCDN?: boolean; // Flag to identify FilCDN content
  isGrove?: boolean; // Flag to identify Grove/IPFS content
  cid?: string; // Content identifier for FilCDN or Grove storage key
  size?: number; // File size in bytes
}

interface MediaStore {
  mediaItems: MediaItem[];

  // Actions
  addMediaItem: (item: Omit<MediaItem, "id">) => void;
  removeMediaItem: (id: string) => void;
  clearAllMedia: () => void;
}

// Helper function to determine file type
export const getFileType = (file: File): "image" | "video" | "audio" | null => {
  const { type } = file;

  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("video/")) {
    return "video";
  }
  if (type.startsWith("audio/")) {
    return "audio";
  }

  return null;
};

// Helper function to get image aspect ratio
export const getImageAspectRatio = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener("load", () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      resolve(aspectRatio);
      img.remove();
    });

    img.addEventListener("error", () => {
      reject(new Error("Could not load image"));
      img.remove();
    });

    img.src = URL.createObjectURL(file);
  });
};

// Helper function to generate video thumbnail and get aspect ratio
export const generateVideoThumbnail = (
  file: File
): Promise<{ thumbnailUrl: string; aspectRatio: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to 1 second or 10% of duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener("seeked", () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
      const aspectRatio = video.videoWidth / video.videoHeight;

      resolve({ thumbnailUrl, aspectRatio });

      // Cleanup
      video.remove();
      canvas.remove();
    });

    video.addEventListener("error", () => {
      reject(new Error("Could not load video"));
      video.remove();
      canvas.remove();
    });

    video.src = URL.createObjectURL(file);
    video.load();
  });
};

// Helper function to get media duration
export const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const element = document.createElement(
      file.type.startsWith("video/") ? "video" : "audio"
    ) as HTMLVideoElement | HTMLAudioElement;
    
    const blobUrl = URL.createObjectURL(file);

    element.addEventListener("loadedmetadata", () => {
      const duration = element.duration;
      console.log(`Media duration for ${file.name}: ${duration}`);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
      element.remove();
      
      // Ensure we have a valid duration
      if (!duration || duration === 0 || !isFinite(duration)) {
        reject(new Error(`Invalid duration: ${duration}`));
      } else {
        resolve(duration);
      }
    });

    element.addEventListener("error", (e) => {
      console.error("Error loading media:", e);
      URL.revokeObjectURL(blobUrl);
      element.remove();
      reject(new Error("Could not load media"));
    });

    element.src = blobUrl;
    element.load();
  });
};

export const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      mediaItems: [],

      addMediaItem: (item: Omit<MediaItem, "id">) => {
        const newItem: MediaItem = {
          ...item,
          id: crypto.randomUUID(),
        };
        set((state: MediaStore) => ({
          mediaItems: [...state.mediaItems, newItem],
        }));
      },

      removeMediaItem: (id: string) => {
        const state = get();
        const item = state.mediaItems.find((item: MediaItem) => item.id === id);

        // Cleanup object URLs to prevent memory leaks (but not FilCDN URLs)
        if (item && !item.isFilCDN) {
          if (item.url.startsWith('blob:')) {
            URL.revokeObjectURL(item.url);
          }
          if (item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.thumbnailUrl);
          }
        }

        set((state: MediaStore) => ({
          mediaItems: state.mediaItems.filter((item: MediaItem) => item.id !== id),
        }));
      },

      clearAllMedia: () => {
        const state = get();

        // Cleanup all object URLs (but not FilCDN URLs)
        state.mediaItems.forEach((item: MediaItem) => {
          if (!item.isFilCDN) {
            if (item.url.startsWith('blob:')) {
              URL.revokeObjectURL(item.url);
            }
            if (item.thumbnailUrl && item.thumbnailUrl.startsWith('blob:')) {
              URL.revokeObjectURL(item.thumbnailUrl);
            }
          }
        });

        set({ mediaItems: [] });
      },
    }),
    {
      name: "media-storage",
      storage: customStorage,
    }
  )
);
