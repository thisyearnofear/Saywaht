import { useEffect, useState } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useMobileContext } from "@/contexts/mobile-context";

/**
 * Mobile WebView playback gate
 * Ensures user interaction before first play() to comply with autoplay policies
 */
export function useMobilePlaybackGate() {
  const { isMobile } = useMobileContext();
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { play: originalPlay } = usePlaybackStore();

  useEffect(() => {
    if (!isMobile) {
      setHasUserInteracted(true);
      return;
    }

    // Listen for any user interaction
    const handleInteraction = () => {
      setHasUserInteracted(true);
    };

    // Listen for various interaction events
    window.addEventListener("touchstart", handleInteraction, { once: true });
    window.addEventListener("click", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("click", handleInteraction);
    };
  }, [isMobile]);

  // Wrap play function to require interaction first
  const gatedPlay = () => {
    if (!hasUserInteracted && isMobile) {
      console.log("⏸ Waiting for user interaction before playing");
      return;
    }
    originalPlay();
  };

  return {
    hasUserInteracted,
    canAutoPlay: hasUserInteracted || !isMobile,
    gatedPlay,
  };
}
