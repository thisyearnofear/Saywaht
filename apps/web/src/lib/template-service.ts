import { Template, TemplateCategory, TemplateMediaItem, TemplateTimelineTrack } from "@/lib/types";
import { MediaItem } from "@/stores/media-store";
import { TimelineTrack, TimelineClip } from "@/stores/timeline-store";

/**
 * Resolves a public asset path to an absolute URL.
 * In Farcaster WebView, relative URLs resolve against the WebView host (Warpcast),
 * not the app origin — so we always use an absolute URL.
 */
function assetUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  // SSR fallback — relative is fine on the server
  return path;
}

/**
 * Fetches all template categories
 */
export async function fetchTemplateCategories(): Promise<TemplateCategory[]> {
  try {
    const response = await fetch(assetUrl('/templates/index.json'));
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
export async function fetchTemplateById(id: string, signal?: AbortSignal): Promise<Template | null> {
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
        detailResponse = await fetch(assetUrl(`/templates/${categoryId}/${subcategory}/${id}.json`), { signal });
      } else {
        // Try both new format and legacy format
        detailResponse = await fetch(assetUrl(`/templates/${categoryId}/${id}.json`), { signal });
      }
      
      // If either of the new formats work, return that
      if (detailResponse.ok) {
        return await detailResponse.json();
      }
      
      // Try legacy format as fallback
      const legacyResponse = await fetch(assetUrl(`/templates/${categoryId}/${id}/template.json`), { signal });
      if (legacyResponse.ok) {
        return await legacyResponse.json();
      }
      
      // Fall back to basic template info if no detailed info is available
      console.warn(`Detailed template data not found for ${id}, using basic template info`);
      return basicTemplate;
      
    } catch (detailError) {
      // Re-throw abort errors
      if (detailError instanceof Error && detailError.name === 'AbortError') {
        throw detailError;
      }
      console.warn(`Error fetching detailed template: ${detailError}`);
      // Fall back to basic template info
      return basicTemplate;
    }
  } catch (error) {
    // Re-throw abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching template:', error);
    return null;
  }
}

import { resolveIpfsUrl } from "@/lib/utils";
import { getCachedMedia, cacheMedia, initIndexedDB } from "@/lib/storage-indexeddb";

/**
 * IPFS gateway list for fallback resolution.
 * If the primary gateway (Cloudflare) fails we try alternatives.
 */
const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
];

/**
 * Fetches a media URL with retry + exponential backoff.
 * For IPFS URIs it cycles through multiple gateways.
 */
async function fetchWithRetry(
  url: string,
  originalUri: string,
  signal?: AbortSignal,
  maxRetries = 2
): Promise<Response> {
  const isIpfs = originalUri.startsWith('ipfs://') || originalUri.startsWith('lens://');
  const hash = originalUri.startsWith('ipfs://') ? originalUri.replace('ipfs://', '')
             : originalUri.startsWith('lens://') ? originalUri.replace('lens://', '')
             : null;

  // Build list of URLs to try
  const urls: string[] = [url];
  if (isIpfs && hash) {
    for (const gw of IPFS_GATEWAYS) {
      const gwUrl = `${gw}${hash}`;
      if (gwUrl !== url) urls.push(gwUrl);
    }
  }

  let lastError: Error | null = null;

  for (const tryUrl of urls) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) {
        const err = new Error('AbortError');
        err.name = 'AbortError';
        throw err;
      }
      try {
        const resp = await fetch(tryUrl, { signal });
        if (resp.ok) return resp;
        lastError = new Error(`HTTP ${resp.status} from ${tryUrl}`);
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw e;
        lastError = e as Error;
      }
      // Exponential backoff before retry (skip on last attempt)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

/**
 * Converts a template media item to an actual MediaItem.
 *
 * Strategy (cache-through):
 * 1. Check IndexedDB media-cache for a previously downloaded blob.
 * 2. If miss → fetch from CDN (with retry + IPFS gateway fallback),
 *    store the blob in IndexedDB, and create a blob URL.
 * 3. Return the blob URL so the <video> element plays from local data
 *    instead of streaming over the network on every load.
 *
 * This makes template loading reliable on flaky mobile connections
 * (especially inside Farcaster WebView) and instant on repeat use.
 */
export async function convertTemplateMediaItem(
  item: TemplateMediaItem, 
  signal?: AbortSignal
): Promise<{ mediaItem: MediaItem; blobUrl: string | null }> {
  // Resolve to CDN URL (Cloudflare IPFS or FilCDN)
  const streamUrl = resolveIpfsUrl(item.url);
  
  console.log(`🎬 Preparing ${item.name} from ${streamUrl}`);
  
  // Check if aborted
  if (signal?.aborted) {
    const err = new Error('AbortError');
    err.name = 'AbortError';
    throw err;
  }

  const mimeType = item.type === 'video' ? 'video/mp4' :
                  item.type === 'audio' ? 'audio/mp3' :
                  'image/jpeg';

  // --- Cache-through: try IndexedDB first, then fetch & cache ---
  let blobUrl: string | null = null;
  let mediaBlob: Blob | null = null;
  let fileSize = 0;

  try {
    await initIndexedDB();

    // 1. Check cache
    const cached = await getCachedMedia(streamUrl);
    if (cached) {
      console.log(`📦 Cache hit for ${item.name} (${(cached.size / 1024 / 1024).toFixed(1)}MB)`);
      mediaBlob = cached;
    }
  } catch (cacheErr) {
    // IndexedDB unavailable (e.g. private browsing) — continue without cache
    console.warn('IndexedDB cache unavailable:', cacheErr);
  }

  if (!mediaBlob) {
    // 2. Fetch with retry + gateway fallback
    try {
      console.log(`⬇️ Downloading ${item.name}...`);
      const response = await fetchWithRetry(streamUrl, item.url, signal);
      mediaBlob = await response.blob();
      console.log(`✅ Downloaded ${item.name} (${(mediaBlob.size / 1024 / 1024).toFixed(1)}MB)`);

      // 3. Store in IndexedDB for next time (fire-and-forget)
      cacheMedia(streamUrl, mediaBlob, mimeType, 7 * 24 * 60 * 60 * 1000) // 7-day TTL
        .catch(err => console.warn('Failed to cache media:', err));
    } catch (fetchErr) {
      if ((fetchErr as Error).name === 'AbortError') throw fetchErr;
      // If fetch fails, fall back to direct streaming URL
      console.warn(`⚠️ Download failed for ${item.name}, falling back to streaming:`, fetchErr);
    }
  }

  // Create blob URL if we have the data, otherwise fall back to CDN streaming
  let mediaUrl = streamUrl;
  if (mediaBlob) {
    blobUrl = URL.createObjectURL(mediaBlob);
    mediaUrl = blobUrl;
    fileSize = mediaBlob.size;
  }

  // Create File object for compatibility
  const file = mediaBlob
    ? new File([mediaBlob], item.name, { type: mimeType })
    : new File([], item.name, { type: mimeType });
  
  const mediaItem: MediaItem = {
    id: item.id,
    name: item.name,
    type: item.type,
    file,
    url: mediaUrl,
    thumbnailUrl: resolveIpfsUrl(item.thumbnailUrl || item.url),
    duration: item.duration || 0,
    aspectRatio: item.aspectRatio,
    size: fileSize,
    isLocal: !!mediaBlob
  };
  
  console.log(`✅ ${item.name} ready (${mediaBlob ? 'cached/downloaded' : 'streaming'})`);
  
  return { mediaItem, blobUrl };
}

export function createTemplateMediaItemStub(item: TemplateMediaItem): MediaItem {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    url: resolveIpfsUrl(item.url),
    thumbnailUrl: resolveIpfsUrl(item.thumbnailUrl || item.url),
    duration: item.duration || 0,
    aspectRatio: item.aspectRatio,
    size: 0,
    isLocal: false,
  };
}

/**
 * Loads all media items from a template
 * Returns media items configured for direct CDN streaming
 */
export async function loadTemplateMediaItems(
  template: Template, 
  signal?: AbortSignal
): Promise<{ mediaItems: MediaItem[]; blobUrls: string[] }> {
  const results = await Promise.all(
    template.mediaItems.map(item => convertTemplateMediaItem(item, signal))
  );
  
  const mediaItems = results.map(r => r.mediaItem);
  const blobUrls = results.map(r => r.blobUrl).filter((u): u is string => u !== null);
  
  return { mediaItems, blobUrls };
}

export function prepareTemplateMediaItemsForStreaming(
  template: Template
): { mediaItems: MediaItem[]; blobUrls: string[] } {
  return {
    mediaItems: template.mediaItems.map(createTemplateMediaItemStub),
    blobUrls: [],
  };
}

function getTemplateMediaHydrationOrder(template: Template): TemplateMediaItem[] {
  if (!template.timelineTracks || template.timelineTracks.length === 0) {
    return template.mediaItems;
  }

  const mediaById = new Map(template.mediaItems.map((item) => [item.id, item]));
  const prioritizedIds = new Set<string>();
  const ordered: TemplateMediaItem[] = [];

  const clipsByStartTime = template.timelineTracks
    .flatMap((track) => track.clips)
    .sort((a, b) => a.startTime - b.startTime);

  clipsByStartTime.forEach((clip) => {
    if (prioritizedIds.has(clip.mediaId)) return;
    const mediaItem = mediaById.get(clip.mediaId);
    if (!mediaItem) return;
    prioritizedIds.add(clip.mediaId);
    ordered.push(mediaItem);
  });

  template.mediaItems.forEach((item) => {
    if (prioritizedIds.has(item.id)) return;
    ordered.push(item);
  });

  return ordered;
}

export async function hydrateTemplateMediaItemsInBackground(
  template: Template,
  callbacks: {
    onMediaItemHydrated?: (result: { mediaItem: MediaItem; blobUrl: string | null }) => void;
    onMediaItemError?: (item: TemplateMediaItem, error: unknown) => void;
  } = {},
  signal?: AbortSignal
): Promise<{ blobUrls: string[] }> {
  const blobUrls: string[] = [];
  const orderedItems = getTemplateMediaHydrationOrder(template);

  for (const item of orderedItems) {
    if (signal?.aborted) {
      const err = new Error("AbortError");
      err.name = "AbortError";
      throw err;
    }

    try {
      const result = await convertTemplateMediaItem(item, signal);
      if (result.blobUrl) {
        blobUrls.push(result.blobUrl);
      }
      callbacks.onMediaItemHydrated?.(result);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw error;
      }
      callbacks.onMediaItemError?.(item, error);
    }
  }

  return { blobUrls };
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

export function buildTemplateTracks(
  template: Template,
  mediaItems: MediaItem[]
): TimelineTrack[] {
  if (template.timelineTracks) {
    return convertTemplateTracks(template);
  }

  const tracks: TimelineTrack[] = [];
  const videoTrack: TimelineTrack = {
    id: crypto.randomUUID(),
    name: "Video Track",
    type: "video",
    clips: [],
    muted: false,
  };

  const audioTrack: TimelineTrack = {
    id: crypto.randomUUID(),
    name: "Audio Track",
    type: "audio",
    clips: [],
    muted: false,
  };

  let videoPosition = 0;
  let audioPosition = 0;

  mediaItems.forEach((item) => {
    if (item.type === "video" || item.type === "image") {
      videoTrack.clips.push({
        id: crypto.randomUUID(),
        mediaId: item.id,
        name: item.name,
        duration: item.duration || 5,
        startTime: videoPosition,
        trimStart: 0,
        trimEnd: 0,
      });
      videoPosition += item.duration || 5;
    } else if (item.type === "audio") {
      audioTrack.clips.push({
        id: crypto.randomUUID(),
        mediaId: item.id,
        name: item.name,
        duration: item.duration || 5,
        startTime: audioPosition,
        trimStart: 0,
        trimEnd: 0,
      });
      audioPosition += item.duration || 5;
    }
  });

  if (videoTrack.clips.length > 0) tracks.push(videoTrack);
  if (audioTrack.clips.length > 0) tracks.push(audioTrack);

  return tracks;
}

/**
 * Applies a template to the current project
 * This function loads all media items and creates timeline tracks from the template
 */
export async function applyTemplate(
  template: Template, 
  signal?: AbortSignal
): Promise<{
  mediaItems: MediaItem[];
  tracks: TimelineTrack[];
  blobUrls: string[];
}> {
  console.log(`📦 Applying template: ${template.name}`);
  
  // Load all media items with abort support
  const { mediaItems, blobUrls } = await loadTemplateMediaItems(template, signal);
  
  // Check if aborted
  if (signal?.aborted) {
    // Cleanup any blob URLs we created before aborting
    blobUrls.forEach(url => URL.revokeObjectURL(url));
    throw new Error('AbortError');
  }
  
  const tracks = buildTemplateTracks(template, mediaItems);
  
  console.log(`✅ Template applied: ${mediaItems.length} media items, ${tracks.length} tracks`);
  
  return { mediaItems, tracks, blobUrls };
}
