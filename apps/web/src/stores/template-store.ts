import { create } from "zustand";
import { Template, TemplateCategory } from "@/types/template";
import { fetchTemplateCategories, fetchTemplateById, applyTemplate } from "@/lib/template-service";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { toast } from "sonner";

interface TemplateStore {
  // State
  categories: TemplateCategory[];
  isLoading: boolean;
  error: string | null;
  selectedTemplate: Template | null;
  
  // Actions
  fetchCategories: () => Promise<void>;
  selectTemplate: (templateId: string) => Promise<void>;
  clearSelectedTemplate: () => void;
  applySelectedTemplate: (projectName?: string) => Promise<boolean>;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  selectedTemplate: null,
  
  /**
   * Fetches all template categories
   */
  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await fetchTemplateCategories();
      set({ categories, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load templates', 
        isLoading: false 
      });
    }
  },
  
  /**
   * Selects a template by ID
   */
  selectTemplate: async (templateId: string) => {
    set({ isLoading: true, error: null });
    try {
      const template = await fetchTemplateById(templateId);
      set({ selectedTemplate: template, isLoading: false });
    } catch (error) {
      console.error('Failed to select template:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to select template', 
        isLoading: false 
      });
    }
  },
  
  /**
   * Clears the selected template
   */
  clearSelectedTemplate: () => {
    set({ selectedTemplate: null });
  },
  
  /**
   * Applies the selected template to the current project
   * Returns true if successful, false otherwise
   */
  applySelectedTemplate: async (projectName?: string) => {
    const { selectedTemplate } = get();
    if (!selectedTemplate) {
      toast.error('No template selected');
      return false;
    }
    
    set({ isLoading: true });
    
    try {
      // Get required stores
      const { clearAllMedia, addMediaItem } = useMediaStore.getState();
      const { tracks, addTrack, addClipToTrack } = useTimelineStore.getState();
      const { createNewProject } = useProjectStore.getState();
      const { setCurrentTime, pause } = usePlaybackStore.getState();
      
      // Create a new project with the template name or provided name
      const newProjectName = projectName || selectedTemplate.name;
      createNewProject(newProjectName);
      
      // Clear existing media
      clearAllMedia();
      
      // Load template media and tracks
      const { mediaItems, tracks: templateTracks } = await applyTemplate(selectedTemplate);
      
      // Add media items to the store
      mediaItems.forEach(item => {
        addMediaItem(item);
      });
      
      // Add tracks and clips to the timeline
      templateTracks.forEach(track => {
        const trackId = addTrack(track.type);
        
        // Add clips to the track
        track.clips.forEach(clip => {
          addClipToTrack(trackId, {
            mediaId: clip.mediaId,
            name: clip.name,
            duration: clip.duration,
            startTime: clip.startTime,
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd
          });
        });
      });
      
      // Reset playhead to 0 and pause playback to ensure clips are visible
      pause();
      setCurrentTime(0);
      
      toast.success(`Template "${selectedTemplate.name}" applied successfully!`);
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template');
      set({ 
        error: error instanceof Error ? error.message : 'Failed to apply template', 
        isLoading: false 
      });
      return false;
    }
  }
}));