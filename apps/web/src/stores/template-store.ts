import { create } from "zustand";
import { Template, TemplateCategory } from "@/lib/types";
import {
  buildTemplateTracks,
  fetchTemplateCategories,
  fetchTemplateById,
  hydrateTemplateMediaItemsInBackground,
  prepareTemplateMediaItemsForStreaming,
} from "@/lib/template-service";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useCanvasStore, canvasPresets } from "@/stores/canvas-store";
import { useSceneStore } from "@/stores/scene-store";
import { useEditorStore } from "@/stores/editor-store";
import { toast } from "sonner";

interface TemplateStore {
  // State
  categories: TemplateCategory[];
  isLoading: boolean;
  isApplying: boolean; // NEW: Track template application progress
  error: string | null;
  selectedTemplate: Template | null;
  recentTemplates: Template[]; // Track recently used templates
  templateBlobUrls: string[]; // NEW: Track blob URLs for cleanup
  abortController: AbortController | null; // NEW: For cancelling in-flight requests
  clipLoadingStatus: Record<string, 'loading' | 'ready' | 'error'>; // Per-clip loading status

  // Actions
  fetchCategories: () => Promise<void>;
  setCategories: (categories: TemplateCategory[]) => void; // NEW: Server-side hydration
  selectTemplate: (templateId: string) => Promise<void>;
  setSelectedTemplate: (template: Template) => void;
  clearSelectedTemplate: () => void;
  applySelectedTemplate: (projectName?: string, mergeStrategy?: 'replace' | 'merge') => Promise<boolean>;
  mergeTemplateToProject: () => Promise<boolean>;
  addToRecentTemplates: (template: Template) => void;
  clearRecentTemplates: () => void;
  cleanupBlobUrls: () => void; // NEW: Cleanup blob URLs
  cancelPendingLoad: () => void; // NEW: Cancel in-flight template load
  setClipLoadingStatus: (clipId: string, status: 'loading' | 'ready' | 'error') => void;
  clearClipLoadingStatus: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  categories: [],
  isLoading: false,
  isApplying: false,
  error: null,
  selectedTemplate: null,
  recentTemplates: [],
  templateBlobUrls: [], // NEW: Initialize blob URL tracking
  abortController: null, // NEW: Initialize abort controller
  clipLoadingStatus: {}, // Per-clip loading status

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
   * Server-side hydration of categories
   */
  setCategories: (categories) => {
    set({ categories });
  },

  /**
   * Selects a template by ID
   */
  selectTemplate: async (templateId: string) => {
    // Cancel any pending template load
    get().cancelPendingLoad();
    
    // Create new abort controller for this load
    const abortController = new AbortController();
    set({ isLoading: true, error: null, abortController });
    
    try {
      const template = await fetchTemplateById(templateId, abortController.signal);
      
      // Check if this request was aborted
      if (abortController.signal.aborted) {
        console.log('Template selection was cancelled');
        set({ isLoading: false, abortController: null });
        return;
      }
      
      set({ selectedTemplate: template, isLoading: false, abortController: null });
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Template selection was cancelled');
        return;
      }
      
      console.error('Failed to select template:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to select template',
        isLoading: false,
        abortController: null
      });
    }
  },

  /**
   * Sets the selected template directly (skips network fetch)
   * Use when the full template object is already available
   */
  setSelectedTemplate: (template: Template) => {
    get().cancelPendingLoad();
    set({ selectedTemplate: template, isLoading: false, error: null, abortController: null });
  },

  /**
   * Clears the selected template
   */
  clearSelectedTemplate: () => {
    set({ selectedTemplate: null });
  },

  /**
   * Adds a template to recent templates list (max 5)
   */
  addToRecentTemplates: (template: Template) => {
    set((state) => {
      // Remove duplicate if exists
      const existingIndex = state.recentTemplates.findIndex(t => t.id === template.id);
      let updatedRecents = existingIndex >= 0
        ? [...state.recentTemplates.slice(0, existingIndex), ...state.recentTemplates.slice(existingIndex + 1)]
        : [...state.recentTemplates];

      // Add new template at beginning
      updatedRecents = [template, ...updatedRecents];

      // Limit to 5 most recent
      return { recentTemplates: updatedRecents.slice(0, 5) };
    });
  },

  /**
   * Clears all recent templates
   */
  clearRecentTemplates: () => {
    set({ recentTemplates: [] });
  },

  /**
   * Cleanup blob URLs to prevent memory leaks
   */
  cleanupBlobUrls: () => {
    const { templateBlobUrls } = get();
    templateBlobUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
    });
    set({ templateBlobUrls: [] });
  },

  /**
   * Cancel any pending template load
   */
  cancelPendingLoad: () => {
    const { abortController } = get();
    if (abortController) {
      console.log('🛑 Cancelling pending template load');
      abortController.abort();
      set({ abortController: null, isLoading: false, isApplying: false });
    }
  },

  /**
   * Applies the selected template to the current project
   * @param projectName Optional project name for new projects
   * @param mergeStrategy Strategy for merging with existing content: 'replace' (default) or 'merge'
   * Returns true if successful, false otherwise
   */
  applySelectedTemplate: async (projectName?: string, mergeStrategy: 'replace' | 'merge' = 'replace') => {
    const { selectedTemplate } = get();
    if (!selectedTemplate) {
      toast.error('No template selected');
      return false;
    }

    // Cancel any pending loads
    get().cancelPendingLoad();

    // Cleanup old blob URLs before loading new template
    if (mergeStrategy === 'replace') {
      get().cleanupBlobUrls();
    }

    // Create abort controller for this template application
    const abortController = new AbortController();
    set({ isLoading: true, isApplying: true, abortController });

    try {
      // Get required stores
      const { clearAllMedia, addMediaItem, updateMediaItem } = useMediaStore.getState();
      const { addTrack, addClipToTrack, removeTrack } = useTimelineStore.getState();
      const { createNewProject, activeProject } = useProjectStore.getState();
      const { setCurrentTime, pause } = usePlaybackStore.getState();

      // Create a new project when:
      //  - there is no active project at all, OR
      //  - an explicit projectName was given AND we are replacing (i.e. the
      //    user intentionally started a fresh project from the template page).
      // When EditorProvider calls applySelectedTemplate() as a safety-net it
      // passes no projectName, so it will only create a project if there isn't
      // one already.
      const shouldCreateNew = !activeProject || (mergeStrategy === 'replace' && !!projectName);
      if (shouldCreateNew) {
        const newProjectName = projectName || selectedTemplate.name;
        createNewProject(newProjectName);
      }

      // Prepare media for immediate streaming so the editor can open without
      // waiting for every template asset to finish downloading.
      const { mediaItems } = prepareTemplateMediaItemsForStreaming(selectedTemplate);
      const templateTracks = buildTemplateTracks(selectedTemplate, mediaItems);

      // Check if aborted
      if (abortController.signal.aborted) {
        console.log("Template application was cancelled");
        set({ isLoading: false, isApplying: false, abortController: null });
        return false;
      }

      // Only clear after successful download
      if (mergeStrategy === 'replace') {
        clearAllMedia();
        const currentTracks = useTimelineStore.getState().tracks;
        currentTracks.forEach(track => removeTrack(track.id));
      }

      // Add media items to the store
      mediaItems.forEach(item => addMediaItem(item));

      // Snapshot clip IDs before adding new ones
      const clipIdsBefore = new Set(
        useTimelineStore.getState().tracks.flatMap(t => t.clips.map(c => c.id))
      );

      // Add tracks and clips to the timeline
      templateTracks.forEach((track) => {
        const trackId = addTrack(track.type);

        // Add clips to the track
        track.clips.forEach((clip) => {
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

      // Collect newly added clip IDs and mark them as loading
      const newClipLoadingStatus: Record<string, 'loading' | 'ready' | 'error'> = {};
      useTimelineStore.getState().tracks.forEach(t =>
        t.clips.forEach(c => {
          if (!clipIdsBefore.has(c.id)) {
            newClipLoadingStatus[c.id] = 'loading';
          }
        })
      );
      set({ clipLoadingStatus: newClipLoadingStatus });

      // Initialize canvas size based on template aspect ratio
      const { setCanvasPreset } = useCanvasStore.getState();
      const preset = canvasPresets.find(p => {
        if (selectedTemplate.aspectRatio === 'portrait') return p.name.includes('Portrait');
        if (selectedTemplate.aspectRatio === 'square') return p.name.includes('Square');
        if (selectedTemplate.aspectRatio === 'landscape') return p.name.includes('HD');
        return false;
      }) || canvasPresets[0];
      setCanvasPreset(preset);

      // Initialize scenes immediately so the scene store is in sync with the new project
      const { initializeScenes } = useSceneStore.getState();
      const updatedProject = useProjectStore.getState().activeProject;
      if (updatedProject) {
        initializeScenes(updatedProject.scenes || [], updatedProject.currentSceneId);
      }

      // Reset playhead to start; sync duration so playback works immediately
      setCurrentTime(0);
      const totalDuration = useTimelineStore.getState().getTotalDuration();
      if (totalDuration > 0) {
        usePlaybackStore.getState().setDuration(totalDuration);
      }

      // Default to cover mode so video fills the fullscreen preview
      useEditorStore.getState().setVideoObjectFit("cover");

      // Track this template as recently used
      get().addToRecentTemplates(selectedTemplate);

      // Kick off cache/download hydration after the editor is already usable.
      // Track progress so we can show a toast with download status.
      const totalMedia = selectedTemplate.mediaItems?.length || 0;
      let hydratedCount = 0;
      const progressToastId = totalMedia > 1
        ? toast.loading(`Loading media… 0/${totalMedia}`, { duration: Infinity })
        : null;

      hydrateTemplateMediaItemsInBackground(
        selectedTemplate,
        {
          onMediaItemHydrated: ({ mediaItem, blobUrl }) => {
            if (abortController.signal.aborted) {
              if (blobUrl) {
                try { URL.revokeObjectURL(blobUrl); } catch (_) { /* ignore */ }
              }
              return;
            }

            updateMediaItem(mediaItem.id, {
              file: mediaItem.file,
              url: mediaItem.url,
              size: mediaItem.size,
              isLocal: mediaItem.isLocal,
            });

            if (blobUrl) {
              set((state) => ({ templateBlobUrls: [...state.templateBlobUrls, blobUrl] }));
            }

            // Mark all clips that reference this media item as ready
            const tracks = useTimelineStore.getState().tracks;
            tracks.forEach(track => {
              track.clips.forEach(clip => {
                if (clip.mediaId === mediaItem.id) {
                  get().setClipLoadingStatus(clip.id, 'ready');
                }
              });
            });

            // Update progress toast
            hydratedCount++;
            if (progressToastId) {
              if (hydratedCount >= totalMedia) {
                toast.success('All media loaded', { id: progressToastId, duration: 2000 });
              } else {
                toast.loading(`Loading media… ${hydratedCount}/${totalMedia}`, { id: progressToastId });
              }
            }
          },
          onMediaItemError: (item, error) => {
            hydratedCount++;
            if (progressToastId && hydratedCount >= totalMedia) {
              toast.success('Media loading complete', { id: progressToastId, duration: 2000 });
            }
          },
        },
        abortController.signal
      ).catch((error) => {
        if (progressToastId) {
          toast.dismiss(progressToastId);
        }
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      });

      set({ isLoading: false, isApplying: false, abortController: null });
      
      toast.success(`Template "${selectedTemplate.name}" applied successfully!`);
      return true;
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Template application was cancelled');
        return false;
      }
      
      console.error('❌ Failed to apply template:', error);
      toast.error('Failed to apply template');
      set({
        error: error instanceof Error ? error.message : 'Failed to apply template',
        isLoading: false,
        isApplying: false,
        abortController: null
      });
      return false;
    }
  },

  /**
   * Adds template to existing project by merging content
   */
  mergeTemplateToProject: async () => {
    return get().applySelectedTemplate(undefined, 'merge');
  },

  setClipLoadingStatus: (clipId: string, status: 'loading' | 'ready' | 'error') => {
    set((state) => ({
      clipLoadingStatus: { ...state.clipLoadingStatus, [clipId]: status }
    }));
  },

  clearClipLoadingStatus: () => {
    set({ clipLoadingStatus: {} });
  },
}));
