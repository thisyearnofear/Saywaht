import { useEffect, useState, useRef } from "react";

/**
 * Lazy loading for video elements
 * Only loads videos when they're about to be visible
 */
export function useLazyVideoLoading(
  clipStartTime: number,
  clipEndTime: number,
  currentTime: number,
  preloadWindow: number = 2 // seconds before clip starts
) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Once loaded, stay loaded (don't unload during playback)
    if (hasLoadedRef.current) {
      return;
    }

    // Check if we're within the preload window
    const timeUntilClip = clipStartTime - currentTime;
    const isInPreloadWindow = timeUntilClip <= preloadWindow && timeUntilClip >= -clipEndTime;
    
    if (isInPreloadWindow) {
      setShouldLoad(true);
      hasLoadedRef.current = true;
    }
  }, [clipStartTime, clipEndTime, currentTime, preloadWindow]);

  // Reset when clip changes
  useEffect(() => {
    hasLoadedRef.current = false;
    setShouldLoad(false);
  }, [clipStartTime, clipEndTime]);

  return shouldLoad;
}
