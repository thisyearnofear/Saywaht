import { Template, TemplateCategory, TemplateMediaItem, TemplateTimelineTrack } from "@/types/template";
import { MediaItem } from "@/stores/media-store";
import { TimelineTrack, TimelineClip } from "@/stores/timeline-store";

/**
 * Fetches all template categories
 */
export async function fetchTemplateCategories(): Promise<TemplateCategory[]> {
  try {
    const response = await fetch('/templates/index.json');
    if (!response.ok) {
      throw new Error('Failed to load templates');
    }
    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

/**
 * Fetches a specific template by ID
 */
export async function fetchTemplateById(id: string): Promise<Template | null> {
  try {
    // First find the basic template info to get the category
    const categories = await fetchTemplateCategories();
    let basicTemplate: Template | null = null;
    let categoryId = '';
    let subcategory = '';
    
    // Find the template in categories
    for (const category of categories) {
      const template = category.templates.find(t => t.id === id);
      if (template) {
        basicTemplate = template;
        categoryId = category.id;
        subcategory = template.subcategory || '';
        break;
      }
    }
    
    if (!basicTemplate || !categoryId) {
      return null;
    }
    
    try {
      // Try to fetch the template data based on new structure first
      // Format: /templates/categoryId/subcategory/id.json (if subcategory exists)
      // or /templates/categoryId/id.json (if no subcategory)
      let detailResponse;
      
      if (subcategory) {
        detailResponse = await fetch(`/templates/${categoryId}/${subcategory}/${id}.json`);
      } else {
        // Try both new format and legacy format
        detailResponse = await fetch(`/templates/${categoryId}/${id}.json`);
      }
      
      // If either of the new formats work, return that
      if (detailResponse.ok) {
        return await detailResponse.json();
      }
      
      // Try legacy format as fallback
      const legacyResponse = await fetch(`/templates/${categoryId}/${id}/template.json`);
      if (legacyResponse.ok) {
        return await legacyResponse.json();
      }
      
      // Fall back to basic template info if no detailed info is available
      console.warn(`Detailed template data not found for ${id}, using basic template info`);
      return basicTemplate;
      
    } catch (detailError) {
      console.warn(`Error fetching detailed template: ${detailError}`);
      // Fall back to basic template info
      return basicTemplate;
    }
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

/**
 * Converts a template media item to an actual MediaItem
 * for use in the application
 */
export async function convertTemplateMediaItem(item: TemplateMediaItem): Promise<MediaItem> {
  // For template items, we'll use the original URL directly instead of creating blob URLs
  // This ensures the video player can properly access the media
  
  // Still fetch to get the file size
  const response = await fetch(item.url);
  const blob = await response.blob();
  
  // Create a File object from the blob
  const mimeType = item.type === 'video' ? 'video/mp4' :
                  item.type === 'audio' ? 'audio/mp3' :
                  'image/jpeg';
  
  const file = new File([blob], item.name, { type: mimeType });
  
  // Create the media item using the original URL
  const mediaItem: MediaItem = {
    id: item.id,
    name: item.name,
    type: item.type,
    file,
    url: item.url, // Use the original URL instead of blob URL
    thumbnailUrl: item.thumbnailUrl || item.url, // Fallback to main URL if no thumbnail
    duration: item.duration || 0,
    aspectRatio: item.aspectRatio,
    size: blob.size
  };
  
  return mediaItem;
}

/**
 * Loads all media items from a template
 */
export async function loadTemplateMediaItems(template: Template): Promise<MediaItem[]> {
  const mediaItemPromises = template.mediaItems.map(item => convertTemplateMediaItem(item));
  return Promise.all(mediaItemPromises);
}

/**
 * Converts template timeline tracks to actual timeline tracks
 * that can be used in the timeline store
 */
export function convertTemplateTracks(template: Template): TimelineTrack[] {
  if (!template.timelineTracks) return [];
  
  return template.timelineTracks.map(track => {
    return {
      id: crypto.randomUUID(), // Generate new IDs for the tracks
      name: track.name,
      type: track.type,
      muted: track.muted || false,
      clips: track.clips.map(clip => {
        return {
          id: crypto.randomUUID(), // Generate new IDs for the clips
          mediaId: clip.mediaId, // Keep the same mediaId to reference the template media
          name: clip.name,
          duration: clip.duration,
          startTime: clip.startTime,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd
        };
      })
    };
  });
}

/**
 * Applies a template to the current project
 * This function loads all media items and creates timeline tracks from the template
 */
export async function applyTemplate(template: Template): Promise<{
  mediaItems: MediaItem[];
  tracks: TimelineTrack[];
}> {
  // Load all media items
  const mediaItems = await loadTemplateMediaItems(template);
  
  // Convert template tracks to timeline tracks
  let tracks: TimelineTrack[] = [];
  
  if (template.timelineTracks) {
    tracks = convertTemplateTracks(template);
  } else {
    // If no timeline tracks are defined, create default tracks based on media types
    const videoTrack: TimelineTrack = {
      id: crypto.randomUUID(),
      name: 'Video Track',
      type: 'video',
      clips: [],
      muted: false
    };
    
    const audioTrack: TimelineTrack = {
      id: crypto.randomUUID(),
      name: 'Audio Track',
      type: 'audio',
      clips: [],
      muted: false
    };
    
    // Add clips to default tracks
    let videoPosition = 0;
    let audioPosition = 0;
    
    mediaItems.forEach(item => {
      if (item.type === 'video' || item.type === 'image') {
        videoTrack.clips.push({
          id: crypto.randomUUID(),
          mediaId: item.id,
          name: item.name,
          duration: item.duration || 5,
          startTime: videoPosition,
          trimStart: 0,
          trimEnd: 0
        });
        videoPosition += (item.duration || 5);
      } else if (item.type === 'audio') {
        audioTrack.clips.push({
          id: crypto.randomUUID(),
          mediaId: item.id,
          name: item.name,
          duration: item.duration || 5,
          startTime: audioPosition,
          trimStart: 0,
          trimEnd: 0
        });
        audioPosition += (item.duration || 5);
      }
    });
    
    // Only add tracks that have clips
    if (videoTrack.clips.length > 0) tracks.push(videoTrack);
    if (audioTrack.clips.length > 0) tracks.push(audioTrack);
  }
  
  return { mediaItems, tracks };
}