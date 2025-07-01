import { create } from "zustand";
import { persist } from "zustand/middleware";
import { customStorage } from "@/lib/custom-storage";

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio" | "effects";
  clips: TimelineClip[];
  muted?: boolean;
}

interface TimelineStore {
  tracks: TimelineTrack[];
  history: TimelineTrack[][];
  redoStack: TimelineTrack[][];

  // Multi-selection
  selectedClips: { trackId: string; clipId: string }[];
  selectClip: (trackId: string, clipId: string, multi?: boolean) => void;
  deselectClip: (trackId: string, clipId: string) => void;
  clearSelectedClips: () => void;
  setSelectedClips: (clips: { trackId: string; clipId: string }[]) => void;

  // Actions
  addTrack: (type: "video" | "audio" | "effects") => string;
  removeTrack: (trackId: string) => void;
  addClipToTrack: (trackId: string, clip: Omit<TimelineClip, "id">) => void;
  removeClipFromTrack: (trackId: string, clipId: string) => void;
  moveClipToTrack: (
    fromTrackId: string,
    toTrackId: string,
    clipId: string
  ) => void;
  updateClipTrim: (
    trackId: string,
    clipId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
  updateClipStartTime: (
    trackId: string,
    clipId: string,
    startTime: number
  ) => void;
  toggleTrackMute: (trackId: string) => void;

  // Computed values
  getTotalDuration: () => number;
  
  // New features
  closeGapsInTrack: (trackId: string) => void;
  closeAllGaps: () => void;
  nudgeSelectedClips: (amount: number) => void;
  getGapsInTrack: (trackId: string) => { startTime: number; endTime: number; duration: number }[];

  // New actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      history: [],
      redoStack: [],
      selectedClips: [],

      pushHistory: () => {
        const { tracks, history, redoStack } = get();
        // Deep copy tracks
        set({ 
          history: [...history, JSON.parse(JSON.stringify(tracks))],
          redoStack: [] // Clear redo stack when new action is performed
        });
      },

      undo: () => {
        const { history, redoStack, tracks } = get();
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        set({ 
          tracks: prev, 
          history: history.slice(0, -1),
          redoStack: [...redoStack, JSON.parse(JSON.stringify(tracks))] // Add current state to redo stack
        });
      },

      selectClip: (trackId: string, clipId: string, multi: boolean = false) => {
        set((state: TimelineStore) => {
          const exists = state.selectedClips.some(
            (c: { trackId: string; clipId: string }) => c.trackId === trackId && c.clipId === clipId
          );
          if (multi) {
            // Toggle selection
            return exists
              ? { selectedClips: state.selectedClips.filter((c: { trackId: string; clipId: string }) => !(c.trackId === trackId && c.clipId === clipId)) }
              : { selectedClips: [...state.selectedClips, { trackId, clipId }] };
          } else {
            return { selectedClips: [{ trackId, clipId }] };
          }
        });
      },
      deselectClip: (trackId: string, clipId: string) => {
        set((state: TimelineStore) => ({
          selectedClips: state.selectedClips.filter((c: { trackId: string; clipId: string }) => !(c.trackId === trackId && c.clipId === clipId)),
        }));
      },
      clearSelectedClips: () => {
        set({ selectedClips: [] });
      },

      setSelectedClips: (clips: { trackId: string; clipId: string }[]) => set({ selectedClips: clips }),

      addTrack: (type: "video" | "audio" | "effects") => {
        get().pushHistory();
        const newTrack: TimelineTrack = {
          id: crypto.randomUUID(),
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
          type,
          clips: [],
          muted: false,
        };
        set((state: TimelineStore) => ({
          tracks: [...state.tracks, newTrack],
        }));
        return newTrack.id;
      },

      removeTrack: (trackId: string) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.filter((track: TimelineTrack) => track.id !== trackId),
        }));
      },

      addClipToTrack: (trackId: string, clipData: Omit<TimelineClip, "id">) => {
        get().pushHistory();
        const newClip: TimelineClip = {
          ...clipData,
          id: crypto.randomUUID(),
          startTime: clipData.startTime || 0,
          trimStart: 0,
          trimEnd: 0,
        };

        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? { ...track, clips: [...track.clips, newClip] }
              : track
          ),
        }));
      },

      removeClipFromTrack: (trackId: string, clipId: string) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks
            .map((track: TimelineTrack) =>
              track.id === trackId
                ? { ...track, clips: track.clips.filter((clip: TimelineClip) => clip.id !== clipId) }
                : track
            )
            // Remove track if it becomes empty
            .filter((track: TimelineTrack) => track.clips.length > 0),
        }));
      },

      moveClipToTrack: (fromTrackId: string, toTrackId: string, clipId: string) => {
        get().pushHistory();
        set((state: TimelineStore) => {
          const fromTrack = state.tracks.find((track: TimelineTrack) => track.id === fromTrackId);
          const clipToMove = fromTrack?.clips.find((clip: TimelineClip) => clip.id === clipId);

          if (!clipToMove) return state;

          return {
            tracks: state.tracks
              .map((track: TimelineTrack) => {
                if (track.id === fromTrackId) {
                  return {
                    ...track,
                    clips: track.clips.filter((clip: TimelineClip) => clip.id !== clipId),
                  };
                } else if (track.id === toTrackId) {
                  return {
                    ...track,
                    clips: [...track.clips, clipToMove],
                  };
                }
                return track;
              })
              // Remove track if it becomes empty
              .filter((track: TimelineTrack) => track.clips.length > 0),
          };
        });
      },

      updateClipTrim: (trackId: string, clipId: string, trimStart: number, trimEnd: number) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId ? { ...clip, trimStart, trimEnd } : clip
                  ),
                }
              : track
          ),
        }));
      },

      updateClipStartTime: (trackId: string, clipId: string, startTime: number) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId ? { ...clip, startTime } : clip
                  ),
                }
              : track
          ),
        }));
      },

      toggleTrackMute: (trackId: string) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId ? { ...track, muted: !track.muted } : track
          ),
        }));
      },

      getTotalDuration: () => {
        const { tracks } = get();
        if (tracks.length === 0) return 0;

        const trackEndTimes = tracks.map((track: TimelineTrack) =>
          track.clips.reduce((maxEnd: number, clip: TimelineClip) => {
            const clipEnd =
              clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;
            return Math.max(maxEnd, clipEnd);
          }, 0)
        );

        return Math.max(...trackEndTimes, 0);
      },

      redo: () => {
        const { redoStack } = get();
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        set({ tracks: next, redoStack: redoStack.slice(0, -1) });
      },

      // Get all gaps in a track
      getGapsInTrack: (trackId: string) => {
        const { tracks } = get();
        const track = tracks.find((t: TimelineTrack) => t.id === trackId);
        if (!track || track.clips.length <= 1) return [];

        // Sort clips by start time
        const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
        const gaps = [];

        // Find gaps between clips
        for (let i = 0; i < sortedClips.length - 1; i++) {
          const currentClip = sortedClips[i];
          const nextClip = sortedClips[i + 1];
          
          const currentClipEnd = currentClip.startTime + (currentClip.duration - currentClip.trimStart - currentClip.trimEnd);
          const nextClipStart = nextClip.startTime;
          
          const gapDuration = nextClipStart - currentClipEnd;
          
          if (gapDuration > 0.1) { // Only consider gaps larger than 0.1 seconds
            gaps.push({
              startTime: currentClipEnd,
              endTime: nextClipStart,
              duration: gapDuration
            });
          }
        }
        
        return gaps;
      },

      // Close gaps in a specific track
      closeGapsInTrack: (trackId: string) => {
        get().pushHistory();
        set((state: TimelineStore) => {
          const track = state.tracks.find((t: TimelineTrack) => t.id === trackId);
          if (!track || track.clips.length <= 1) return state;

          // Sort clips by start time
          const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
          
          // Adjust start times to close gaps
          const updatedClips = sortedClips.map((clip: TimelineClip, index: number) => {
            if (index === 0) return clip; // Keep first clip at its position
            
            const prevClip = sortedClips[index - 1];
            const prevClipEnd = prevClip.startTime + (prevClip.duration - prevClip.trimStart - prevClip.trimEnd);
            
            return {
              ...clip,
              startTime: prevClipEnd
            };
          });
          
          // Update the track with the adjusted clips
          return {
            tracks: state.tracks.map((t: TimelineTrack) => 
              t.id === trackId 
                ? { ...t, clips: updatedClips } 
                : t
            )
          };
        });
      },

      // Close gaps in all tracks
      closeAllGaps: () => {
        get().pushHistory();
        const { tracks } = get();
        tracks.forEach((track: TimelineTrack) => {
          get().closeGapsInTrack(track.id);
        });
      },

      // Nudge selected clips by a time amount (positive or negative)
      nudgeSelectedClips: (amount: number) => {
        const { selectedClips, tracks } = get();
        if (selectedClips.length === 0) return;
        
        get().pushHistory();
        
        set((state: TimelineStore) => {
          return {
            tracks: state.tracks.map((track: TimelineTrack) => {
              const trackClips = selectedClips.filter((sc: { trackId: string; clipId: string }) => sc.trackId === track.id);
              if (trackClips.length === 0) return track;
              
              return {
                ...track,
                clips: track.clips.map((clip: TimelineClip) => {
                  const isSelected = trackClips.some((sc: { trackId: string; clipId: string }) => sc.clipId === clip.id);
                  if (!isSelected) return clip;
                  
                  // Calculate new start time, ensuring it doesn't go below 0
                  const newStartTime = Math.max(0, clip.startTime + amount);
                  
                  return {
                    ...clip,
                    startTime: newStartTime
                  };
                })
              };
            })
          };
        });
      },
    }),
    {
      name: "timeline-storage",
      storage: customStorage,
      // You might need to customize serialization/deserialization if your clips contain non-serializable data
    }
  )
);
