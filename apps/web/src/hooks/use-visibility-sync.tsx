import { useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

/**
 * Syncs playback state with page visibility
 * Pauses timer when app goes to background, resyncs when foregrounded
 */
export function useVisibilitySync() {
  const { isPlaying, pause, seek, currentTime } = usePlaybackStore();

  useEffect(() => {
    let wasPlayingBeforeHidden = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background
        wasPlayingBeforeHidden = isPlaying;
        if (isPlaying) {
          console.log("📱 App backgrounded, pausing playback");
          pause();
        }
      } else {
        // App coming to foreground
        console.log("📱 App foregrounded, resyncing videos");
        
        // Force resync all videos to current time
        seek(currentTime);
        
        // Don't auto-resume - let user tap play
        // This prevents unexpected audio on mobile
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, pause, seek, currentTime]);
}
