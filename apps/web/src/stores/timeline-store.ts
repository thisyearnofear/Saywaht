import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSSRSafeStorage } from "@/lib/storage-ssr-safe";

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
  // Per-clip playback properties (optional, fallbacks to global settings)
  speed?: number;     // Playback speed multiplier (1.0 = normal)
  reversed?: boolean; // Reverse playback direction
  audioMuted?: boolean; // Mute audio for this clip (used when audio is separated)
  brightness?: number; // Visual effect multiplier (1.0 = neutral)
  contrast?: number; // Visual effect multiplier (1.0 = neutral)
  saturation?: number; // Visual effect multiplier (1.0 = neutral)
  audioGain?: number; // Clip gain multiplier (1.0 = neutral)
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

  // Multi-selection
  selectedClips: { trackId: string; clipId: string }[];
  selectClip: (trackId: string, clipId: string, multi?: boolean) => void;
  deselectClip: (trackId: string, clipId: string) => void;
  clearSelectedClips: () => void;
  setSelectedClips: (clips: { trackId: string; clipId: string }[]) => void;

  // Clipboard
  clipboardClip: TimelineClip | null;
  copySelectedClip: () => void;
  pasteClipAtPlayhead: (playheadTime: number) => void;

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
  updateClipSpeed: (
    trackId: string,
    clipId: string,
    speed: number
  ) => void;
  toggleClipReversed: (trackId: string, clipId: string) => void;
  updateClipAudioMuted: (trackId: string, clipId: string, muted: boolean) => void;
  updateClipVisualEffects: (
    trackId: string,
    clipId: string,
    effects: Partial<Pick<TimelineClip, "brightness" | "contrast" | "saturation">>
  ) => void;
  updateClipAudioGain: (trackId: string, clipId: string, audioGain: number) => void;
  toggleTrackMute: (trackId: string) => void;

  // Computed values
  getTotalDuration: () => number;
  
  // New features
  closeGapsInTrack: (trackId: string) => void;
  closeAllGaps: () => void;
  nudgeSelectedClips: (amount: number) => void;
  getGapsInTrack: (trackId: string) => { startTime: number; endTime: number; duration: number }[];

  // State management
  setTracks: (tracks: TimelineTrack[]) => void;
  pushHistory: () => void;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      selectedClips: [],
      clipboardClip: null,

      pushHistory: () => {
        // This is a placeholder for coordination with history-store
        // The actual pushing will be handled by a global listener or manual calls
      },

      setTracks: (tracks) => set({ tracks }),

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
          duration: clipData.duration > 0 ? clipData.duration : 5,
          trimStart: clipData.trimStart ?? 0,
          trimEnd: clipData.trimEnd ?? 0,
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

      updateClipSpeed: (trackId: string, clipId: string, speed: number) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId ? { ...clip, speed: Math.max(0.1, Math.min(2.0, speed)) } : clip
                  ),
                }
              : track
          ),
        }));
      },

      toggleClipReversed: (trackId: string, clipId: string) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId ? { ...clip, reversed: !clip.reversed } : clip
                  ),
                }
              : track
          ),
        }));
      },

      updateClipAudioMuted: (trackId: string, clipId: string, muted: boolean) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId ? { ...clip, audioMuted: muted } : clip
                  ),
                }
              : track
          ),
        }));
      },

      updateClipVisualEffects: (trackId: string, clipId: string, effects) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId
                      ? {
                          ...clip,
                          ...(effects.brightness !== undefined ? { brightness: Math.max(0, Math.min(2, effects.brightness)) } : {}),
                          ...(effects.contrast !== undefined ? { contrast: Math.max(0, Math.min(2, effects.contrast)) } : {}),
                          ...(effects.saturation !== undefined ? { saturation: Math.max(0, Math.min(2, effects.saturation)) } : {}),
                        }
                      : clip
                  ),
                }
              : track
          ),
        }));
      },

      updateClipAudioGain: (trackId: string, clipId: string, audioGain: number) => {
        get().pushHistory();
        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === trackId
              ? {
                  ...track,
                  clips: track.clips.map((clip: TimelineClip) =>
                    clip.id === clipId
                      ? { ...clip, audioGain: Math.max(0, Math.min(3, audioGain)) }
                      : clip
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
        const { selectedClips } = get();
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

      // Copy selected clip to clipboard
      copySelectedClip: () => {
        const { selectedClips, tracks } = get();
        if (selectedClips.length === 0) return;

        // Copy only the first selected clip
        const selected = selectedClips[0];
        const track = tracks.find((t: TimelineTrack) => t.id === selected.trackId);
        const clip = track?.clips.find((c: TimelineClip) => c.id === selected.clipId);

        if (clip) {
          // Deep copy the clip to avoid reference issues
          set({ clipboardClip: JSON.parse(JSON.stringify(clip)) });
        }
      },

      // Paste clip from clipboard at playhead position
      pasteClipAtPlayhead: (playheadTime: number) => {
        const { clipboardClip, tracks } = get();
        if (!clipboardClip) return;

        get().pushHistory();

        // Find a track of the same type or create one
        const videoTrack = tracks.find((t: TimelineTrack) => t.type === "video");
        let targetTrackId = videoTrack?.id;

        if (!targetTrackId) {
          // Create a new video track if none exists
          targetTrackId = get().addTrack("video");
        }

        // Create new clip with new ID and updated start time
        const newClip: TimelineClip = {
          ...clipboardClip,
          id: crypto.randomUUID(),
          startTime: playheadTime,
        };

        set((state: TimelineStore) => ({
          tracks: state.tracks.map((track: TimelineTrack) =>
            track.id === targetTrackId
              ? { ...track, clips: [...track.clips, newClip] }
              : track
          ),
          selectedClips: [{ trackId: targetTrackId!, clipId: newClip.id }],
        }));
      },
    }),
    {
      name: "timeline-storage",
      storage: createSSRSafeStorage(),
    }
  )
);
