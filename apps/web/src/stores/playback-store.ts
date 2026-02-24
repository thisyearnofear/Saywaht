import { create } from "zustand";
import type { PlaybackState, PlaybackControls } from "@/lib/types";

interface PlaybackStore extends PlaybackState, PlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  setStalled: (stalled: boolean) => void;
}

let playbackTimer: number | null = null;

const startTimer = (store: any) => {
  if (playbackTimer) cancelAnimationFrame(playbackTimer);

  // Use requestAnimationFrame for smoother updates
  const updateTime = () => {
    const state = store();
    if (state.isPlaying && !state.isStalled && state.currentTime < state.duration) {
      const now = performance.now();
      const delta = (now - lastUpdate) / 1000; // Convert to seconds
      lastUpdate = now;

      const newTime = state.currentTime + delta * state.speed;
      if (newTime >= state.duration) {
        state.pause();
      } else {
        state.setCurrentTime(newTime);
        // Notify video elements to sync
        window.dispatchEvent(
          new CustomEvent("playback-update", { detail: { time: newTime } })
        );
      }
    } else if (state.isStalled) {
      // Keep lastUpdate current so there's no jump when un-stalling
      lastUpdate = performance.now();
    }
    playbackTimer = requestAnimationFrame(updateTime);
  };

  let lastUpdate = performance.now();
  playbackTimer = requestAnimationFrame(updateTime);
};

const stopTimer = () => {
  if (playbackTimer) {
    cancelAnimationFrame(playbackTimer);
    playbackTimer = null;
  }
};

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  isPlaying: false,
  isStalled: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  previousVolume: 1,
  speed: 1.0,

  play: () => {
    const { currentTime, duration } = get();
    // Restart if at the end
    if (currentTime >= duration - 0.05) {
      set({ currentTime: 0 });
      window.dispatchEvent(new CustomEvent("playback-seek", { detail: { time: 0 } }));
    }
    set({ isPlaying: true, isStalled: false });
    startTimer(get);
  },

  pause: () => {
    set({ isPlaying: false, isStalled: false });
    stopTimer();
  },

  toggle: () => {
    const { isPlaying, currentTime, duration } = get();
    if (isPlaying) {
      get().pause();
    } else {
      // Restart if at the end
      if (currentTime >= duration - 0.05) {
        set({ currentTime: 0 });
        window.dispatchEvent(new CustomEvent("playback-seek", { detail: { time: 0 } }));
      }
      get().play();
    }
  },

  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration, time));
    set({ currentTime: clampedTime, isStalled: false });

    const event = new CustomEvent("playback-seek", {
      detail: { time: clampedTime },
    });
    window.dispatchEvent(event);
  },

  setVolume: (volume: number) =>
    set((state) => ({
      volume: Math.max(0, Math.min(1, volume)),
      muted: volume === 0,
      previousVolume: volume > 0 ? volume : state.previousVolume,
    })),

  setSpeed: (speed: number) => {
    const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    set({ speed: newSpeed });

    const event = new CustomEvent("playback-speed", {
      detail: { speed: newSpeed },
    });
    window.dispatchEvent(event);
  },

  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
  setStalled: (stalled: boolean) => set({ isStalled: stalled }),

  mute: () => {
    const { volume, previousVolume } = get();
    set({
      muted: true,
      previousVolume: volume > 0 ? volume : previousVolume,
      volume: 0,
    });
  },

  unmute: () => {
    const { previousVolume } = get();
    set({ muted: false, volume: previousVolume ?? 1 });
  },

  toggleMute: () => {
    const { muted } = get();
    if (muted) {
      get().unmute();
    } else {
      get().mute();
    }
  },
}));
