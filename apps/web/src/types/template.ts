import { MediaItem } from "@/stores/media-store";
import { TimelineClip, TimelineTrack } from "@/stores/timeline-store";

// Template represents a pre-made project that users can use as a starting point
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string; // For hierarchical organization like "landscape", "portrait", "square"
  thumbnailUrl: string;
  videoUrl?: string; // Direct link to video for previewing
  duration?: number; // Duration in seconds
  tags: string[];
  hasAudio: boolean; // Indicates if it's a complete example or video-only template
  source?: {
    name: string;    // e.g., "Pexels"
    url?: string;    // Link to source
    author?: string; // Original creator if known
  };

  // Aspect ratio metadata for format-aware selection
  aspectRatio: "landscape" | "portrait" | "square"; // Primary aspect ratio of the template
  recommendedFormat?: "landscape" | "portrait" | "square"; // Recommended export format

  // Template content references
  mediaItems: TemplateMediaItem[];
  timelineTracks?: TemplateTimelineTrack[]; // Optional timeline setup
}

// Media item in a template
export interface TemplateMediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  url: string; // URL to the actual file in the public directory
  thumbnailUrl?: string;
  duration?: number;
  aspectRatio: number;
}

// Timeline track for a template
export interface TemplateTimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  clips: TemplateTimelineClip[];
  muted?: boolean;
}

// Timeline clip for a template
export interface TemplateTimelineClip {
  id: string;
  mediaId: string; // References a TemplateMediaItem id
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

// Category of templates
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  templates: Template[];
  inspiration?: {
    title?: string;
    description?: string;
    examples: InspirationExample[];
  };
}

// Inspiration examples (like YouTube videos)
export interface InspirationExample {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  url: string;         // YouTube or other video URL
  source: string;      // e.g., "YouTube", "BBC"
  embedType?: string;  // e.g., "youtube", "vimeo"
}