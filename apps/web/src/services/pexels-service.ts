export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string; // Thumbnail
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: 'hd' | 'sd' | 'hls';
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

export interface PexelsImage {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  next_page: string;
  videos?: PexelsVideo[];
  photos?: PexelsImage[];
}

import { getBackendUrl } from "@/lib/backend-export";

/**
 * Pexels API client (Proxied through backend)
 */
export const pexelsService = {
  search: async (
    query: string = "",
    type: 'video' | 'image' = 'video',
    page: number = 1,
    perPage: number = 15,
    orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
  ): Promise<PexelsSearchResponse> => {
    try {
      const backendUrl = await getBackendUrl();
      const searchParams = new URLSearchParams({
        type,
        page: page.toString(),
        per_page: perPage.toString(),
        orientation,
      });

      if (query) {
        searchParams.append('query', query);
      }

      // Try backend proxy first
      try {
        const response = await fetch(`${backendUrl}/api/external/pexels?${searchParams}`);
        if (response.ok) return response.json();
      } catch (e) {
        console.warn("Backend proxy unavailable, falling back to local API");
      }

      // Fallback to local Next.js API
      const response = await fetch(`/api/external/pexels?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Pexels search failed');
      }

      return response.json();
    } catch (error) {
      console.error('Pexels service error:', error);
      throw error;
    }
  },
};
